from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid


class User(AbstractUser):
    """Custom User model for PrimeTrust banking application."""
    
    # Basic information
    email = models.EmailField(unique=True)
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    
    # Address information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    country = models.CharField(max_length=100, default='United States')
    profile_image_url = models.URLField(max_length=500, blank=True)
    
    # Banking information
    account_number = models.CharField(max_length=20, unique=True, blank=True)
    routing_number = models.CharField(max_length=9, blank=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Bitcoin information
    bitcoin_balance = models.DecimalField(max_digits=20, decimal_places=8, default=0.00000000)
    bitcoin_wallet_address = models.CharField(max_length=100, blank=True)
    bitcoin_qr_code = models.TextField(blank=True)  # Store QR code data or URL
    
    # Transaction PIN for Bitcoin transactions
    transaction_pin = models.CharField(max_length=10, blank=True)  # 4-digit PIN
    
    # Verification and status
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    
    # Security
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True)  # TOTP secret key
    two_factor_backup_codes = models.JSONField(default=list, blank=True)  # Backup codes
    two_factor_setup_completed = models.BooleanField(default=False)  # Track 2FA setup completion
    transfer_pin_setup_completed = models.BooleanField(default=False)  # Track PIN setup completion
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    account_lock_reason = models.CharField(max_length=255, blank=True)  # Reason for account lock
    unlock_request_pending = models.BooleanField(default=False)  # User requested unlock
    unlock_request_submitted_at = models.DateTimeField(null=True, blank=True)  # When unlock was requested
    unlock_request_message = models.TextField(blank=True)  # User's message for unlock request
    failed_pin_attempts = models.PositiveIntegerField(default=0)  # Track failed PIN attempts
    pin_locked_until = models.DateTimeField(null=True, blank=True)  # PIN lockout
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Override username field to use email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.email} ({self.get_full_name()})"
    
    def save(self, *args, **kwargs):
        # Generate account number if not exists
        if not self.account_number:
            self.account_number = self.generate_account_number()
        
        # Generate routing number if not exists
        if not self.routing_number:
            self.routing_number = self.generate_routing_number()
        
        super().save(*args, **kwargs)
    
    def generate_account_number(self):
        """Generate a unique 10-digit account number."""
        import random
        while True:
            # Generate a 10-digit number starting with 1-9 (not 0)
            account_number = str(random.randint(1000000000, 9999999999))
            if not User.objects.filter(account_number=account_number).exists():
                return account_number
    
    def generate_routing_number(self):
        """Generate a unique 9-digit routing number with a valid ABA checksum."""
        import random
        while True:
            # Generate first 8 digits randomly
            # Traditional routing numbers start with 01-12 or 21-32
            # We'll just generate a 8-digit number
            digits = [random.randint(0, 9) for _ in range(8)]
            
            # Calculate the 9th digit (checksum digit)
            # Formula: 3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) mod 10 = 0
            partial_sum = (
                3 * (digits[0] + digits[3] + digits[6]) +
                7 * (digits[1] + digits[4] + digits[7]) +
                (digits[2] + digits[5])
            )
            
            check_digit = (10 - (partial_sum % 10)) % 10
            digits.append(check_digit)
            
            routing_number = "".join(map(str, digits))
            
            if not User.objects.filter(routing_number=routing_number).exists():
                return routing_number
    
    def get_full_name(self):
        """Return the full name of the user."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the short name of the user."""
        return self.first_name
    
    def can_transfer(self, amount):
        """Check if user can transfer the specified amount."""
        if amount <= 0:
            return False, "Transfer amount must be positive"
        
        if self.balance < amount:
            return False, "Insufficient funds"
        
        # Check daily transfer limit
        from transactions.models import Transaction
        today = timezone.now().date()
        daily_transfers = Transaction.objects.filter(
            user=self,
            transaction_type='transfer',
            created_at__date=today
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        if daily_transfers + amount > 50000:  # Daily limit
            return False, "Daily transfer limit exceeded"
        
        return True, "Transfer allowed"
    
    def lock_account(self, duration_minutes=30, reason=""):
        """Lock the account for a specified duration with a reason."""
        self.account_locked_until = timezone.now() + timezone.timedelta(minutes=duration_minutes)
        self.account_lock_reason = reason
        self.unlock_request_pending = False  # Reset any pending unlock requests
        self.unlock_request_submitted_at = None
        self.unlock_request_message = ""
        self.save()
    
    def is_account_locked(self):
        """Check if the account is currently locked."""
        if self.account_locked_until and self.account_locked_until > timezone.now():
            return True
        return False
    
    def request_unlock(self, message=""):
        """Submit an unlock request to admin."""
        if not self.is_account_locked():
            return False, "Account is not locked"
        
        if self.unlock_request_pending:
            return False, "Unlock request already pending"
        
        self.unlock_request_pending = True
        self.unlock_request_submitted_at = timezone.now()
        self.unlock_request_message = message
        self.save()
        
        # Log security event
        from .utils import log_security_event
        log_security_event(
            user=self,
            event_type='unlock_requested',
            description='User requested account unlock',
            metadata={'message': message}
        )
        
        return True, "Unlock request submitted successfully"
    
    def approve_unlock(self, admin_user=None):
        """Approve unlock request and unlock the account."""
        self.account_locked_until = None
        self.account_lock_reason = ""
        self.unlock_request_pending = False
        self.unlock_request_submitted_at = None
        self.unlock_request_message = ""
        self.failed_login_attempts = 0
        self.save()
        
        # Log security event
        from .utils import log_security_event
        log_security_event(
            user=self,
            event_type='unlock_approved',
            description=f'Account unlocked by admin: {admin_user.email if admin_user else "System"}',
            metadata={'admin_id': admin_user.id if admin_user else None}
        )
        
        return True, "Account unlocked successfully"
    
    def reject_unlock(self, admin_user=None, reason=""):
        """Reject unlock request."""
        self.unlock_request_pending = False
        self.unlock_request_submitted_at = None
        self.unlock_request_message = ""
        self.save()
        
        # Log security event
        from .utils import log_security_event
        log_security_event(
            user=self,
            event_type='unlock_rejected',
            description=f'Unlock request rejected by admin: {admin_user.email if admin_user else "System"}',
            metadata={
                'admin_id': admin_user.id if admin_user else None,
                'reason': reason
            }
        )
        
        return True, "Unlock request rejected"
    
    def increment_failed_login(self):
        """Increment failed login attempts and lock account if necessary."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lock_account(30)  # Lock for 30 minutes
        self.save()
    
    def reset_failed_login(self):
        """Reset failed login attempts."""
        self.failed_login_attempts = 0
        # Only clear the lock if it was caused by failed login attempts (no lock reason means auto-lock)
        # Admin-imposed locks have a lock_reason, so we don't clear those
        if not self.account_lock_reason:
            self.account_locked_until = None
        self.save()
    
    def update_last_activity(self):
        """Update the last activity timestamp."""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
    
    def is_pin_locked(self):
        """Check if PIN is locked due to failed attempts."""
        if self.pin_locked_until and self.pin_locked_until > timezone.now():
            return True
        return False
    
    def increment_failed_pin(self):
        """Increment failed PIN attempts and lock PIN if necessary."""
        self.failed_pin_attempts += 1
        
        # Lock PIN after 3 failed attempts for 15 minutes
        if self.failed_pin_attempts >= 3:
            self.pin_locked_until = timezone.now() + timezone.timedelta(minutes=15)
        
        self.save()
    
    def reset_failed_pin(self):
        """Reset failed PIN attempts."""
        self.failed_pin_attempts = 0
        self.pin_locked_until = None
        self.save()
    
    def generate_totp_secret(self):
        """Generate a new TOTP secret key."""
        import pyotp
        return pyotp.random_base32()
    
    def get_totp_uri(self):
        """Get TOTP URI for QR code generation."""
        import pyotp
        if not self.two_factor_secret:
            return None
        
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.provisioning_uri(
            name=self.email,
            issuer_name="PrimeTrust"
        )
    
    def verify_totp_code(self, code):
        """Verify TOTP code."""
        from .utils import verify_totp_code
        if not self.two_factor_secret:
            return False
        
        return verify_totp_code(self.two_factor_secret, code)
    
    def generate_backup_codes(self, count=10):
        """Generate backup codes for 2FA recovery."""
        from .utils import generate_backup_codes
        return generate_backup_codes(count)
    
    def verify_backup_code(self, code):
        """Verify and consume a backup code."""
        if code in self.two_factor_backup_codes:
            self.two_factor_backup_codes.remove(code)
            self.save()
            return True
        return False
    
    def is_registration_complete(self):
        """Check if user has completed all registration steps."""
        return (
            self.email_verified and 
            self.two_factor_setup_completed and 
            self.transfer_pin_setup_completed
        )


class EmailVerification(models.Model):
    """Model for email verification tokens."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verifications'
    
    def __str__(self):
        return f"Email verification for {self.user.email}"
    
    def is_expired(self):
        """Check if the verification token has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if the verification token is valid and not used."""
        return not self.is_used and not self.is_expired()


class PasswordReset(models.Model):
    """Model for password reset tokens."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_resets'
    
    def __str__(self):
        return f"Password reset for {self.user.email}"
    
    def is_expired(self):
        """Check if the reset token has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if the reset token is valid and not used."""
        return not self.is_used and not self.is_expired()


class UserProfile(models.Model):
    """Extended user profile information."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Personal information
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ], blank=True)
    
    # Employment information
    employer = models.CharField(max_length=200, blank=True)
    job_title = models.CharField(max_length=200, blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Preferences
    preferred_currency = models.CharField(max_length=3, default='USD')
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Security preferences
    receive_email_notifications = models.BooleanField(default=True)
    receive_sms_notifications = models.BooleanField(default=False)
    receive_marketing_emails = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Profile for {self.user.email}"
    
    def get_age(self):
        """Calculate user's age."""
        if self.date_of_birth:
            today = timezone.now().date()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None


class BitcoinTransaction(models.Model):
    """Model for Bitcoin transactions."""
    
    TRANSACTION_TYPES = [
        ('send', 'Send'),
        ('receive', 'Receive'),
    ]
    
    BALANCE_SOURCES = [
        ('fiat', 'Fiat Balance'),
        ('bitcoin', 'Bitcoin Balance'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='account_bitcoin_transactions')
    
    # Transaction details
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    balance_source = models.CharField(max_length=10, choices=BALANCE_SOURCES)
    amount_usd = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    amount_btc = models.DecimalField(max_digits=20, decimal_places=8)
    bitcoin_price_at_time = models.DecimalField(max_digits=15, decimal_places=2)  # BTC price when transaction was made
    
    # Recipient details
    recipient_wallet_address = models.CharField(max_length=100)
    recipient_name = models.CharField(max_length=100, blank=True)
    
    # Transaction fees
    transaction_fee = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    blockchain_tx_id = models.CharField(max_length=100, blank=True)  # Bitcoin transaction hash
    confirmation_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'account_bitcoin_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Bitcoin {self.transaction_type} - {self.user.email} - {self.amount_btc} BTC"
    
    def save(self, *args, **kwargs):
        # Update user's Bitcoin balance when transaction is completed
        if self.status == 'completed' and not self._state.adding:
            if self.transaction_type == 'send':
                if self.balance_source == 'bitcoin':
                    self.user.bitcoin_balance -= self.amount_btc
                else:  # fiat balance
                    self.user.balance -= self.amount_usd
            else:  # receive
                self.user.bitcoin_balance += self.amount_btc
            
            self.user.save()
        
        super().save(*args, **kwargs)


class SecurityAuditLog(models.Model):
    """Model for logging security-related events."""
    
    EVENT_TYPES = [
        ('2fa_enabled', '2FA Enabled'),
        ('2fa_disabled', '2FA Disabled'),
        ('2fa_setup', '2FA Setup'),
        ('pin_setup', 'Transfer PIN Setup'),
        ('pin_verify_success', 'PIN Verification Success'),
        ('pin_verify_failed', 'PIN Verification Failed'),
        ('pin_locked', 'PIN Locked'),
        ('backup_code_used', 'Backup Code Used'),
        ('login_success', 'Login Success'),
        ('login_failed', 'Login Failed'),
        ('account_locked', 'Account Locked'),
        ('password_changed', 'Password Changed'),
        ('email_verified', 'Email Verified'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='security_audit_logs')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Additional event data
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'security_audit_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.event_type} - {self.created_at}"
