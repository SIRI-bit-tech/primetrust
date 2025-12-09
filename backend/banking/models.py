from django.db import models, transaction
from django.db.models import F
from django.conf import settings
from django.utils import timezone
import uuid
import hashlib
import hmac
import logging
from encrypted_model_fields.fields import EncryptedCharField

logger = logging.getLogger(__name__)


class CardApplication(models.Model):
    """Model for card applications that need admin approval."""
    
    APPLICATION_STATUS = [
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
        ('completed', 'Completed'),
    ]
    
    CARD_TYPES = [
        ('debit', 'Debit'),
        ('credit', 'Credit'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='card_applications')
    card_type = models.CharField(max_length=10, choices=CARD_TYPES, default='debit')
    
    # Application details
    reason = models.TextField(blank=True)
    preferred_daily_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    preferred_monthly_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Status and processing
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS, default='processing')
    admin_notes = models.TextField(blank=True)
    estimated_completion_date = models.DateField(null=True, blank=True)
    
    # Admin processing
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='processed_applications'
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'card_applications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Card Application {self.id} - {self.user.email} ({self.get_status_display()})"
    
    def approve(self, admin_user, notes=""):
        """Approve the application."""
        self.status = 'approved'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        CardApplicationNotificationService.send_application_approved_notification(self)
        
        # Send real-time notification
        from socketio_app.utils import notify_card_update, send_notification
        notify_card_update(self.user.id, self.id, self.status, 'approved')
        send_notification(
            self.user.id,
            'Card Application Approved',
            f'Your {self.get_card_type_display()} card application has been approved.',
            'success'
        )
    
    def decline(self, admin_user, notes=""):
        """Decline the application."""
        self.status = 'declined'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        CardApplicationNotificationService.send_application_rejected_notification(self)
        
        # Send real-time notification
        from socketio_app.utils import notify_card_update, send_notification
        notify_card_update(self.user.id, self.id, self.status, 'declined')
        send_notification(
            self.user.id,
            'Card Application Declined',
            f'Your {self.get_card_type_display()} card application has been declined. {notes}',
            'error'
        )
    
    def complete(self, admin_user, card, notes=""):
        """Mark application as completed (card already created and passed in)."""
        self.status = 'completed'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        card_number = card.card_number if card else None
        CardApplicationNotificationService.send_application_completed_notification(self, card_number)
        
        # Send real-time notification with card data
        from socketio_app.utils import notify_card_created, send_notification
        notify_card_created(self.user.id, card.id if card else None, self.id)
        send_notification(
            self.user.id,
            'Card Ready!',
            f'Your {self.get_card_type_display()} card has been created and is ready to use!',
            'success'
        )
    
    def get_estimated_completion_days(self):
        """Get estimated completion time in days."""
        if self.estimated_completion_date:
            delta = self.estimated_completion_date - timezone.now().date()
            return max(0, delta.days)
        return None


class VirtualCard(models.Model):
    """Model for virtual debit cards."""
    
    CARD_TYPES = [
        ('debit', 'Debit'),
        ('credit', 'Credit'),
    ]
    
    CARD_STATUS = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='virtual_cards')
    application = models.ForeignKey(CardApplication, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_card')
    card_number = EncryptedCharField(max_length=16)
    card_number_hash = models.CharField(max_length=64, unique=True, db_index=True, default='')  # SHA256 hash for uniqueness checks
    cvv = EncryptedCharField(max_length=4)
    expiry_month = models.PositiveIntegerField()
    expiry_year = models.PositiveIntegerField()
    card_type = models.CharField(max_length=10, choices=CARD_TYPES, default='debit')
    status = models.CharField(max_length=20, choices=CARD_STATUS, default='active')
    daily_limit = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    monthly_limit = models.DecimalField(max_digits=10, decimal_places=2, default=10000.00)
    current_daily_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    current_monthly_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'virtual_cards'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Card ending in {self.card_number[-4:]} for {self.user.email}"
    
    def save(self, *args, **kwargs):
        # Generate card number if not exists
        if not self.card_number:
            self.card_number = self.generate_card_number()
        
        # Generate hash for card number
        if self.card_number and not self.card_number_hash:
            self.card_number_hash = self._hash_field(self.card_number)
        
        # Generate CVV if not exists
        if not self.cvv:
            self.cvv = self.generate_cvv()
        
        # Set expiry date if not exists
        if not self.expiry_month or not self.expiry_year:
            self.set_expiry_date()
        
        # Ensure only one default card per user
        if self.is_default:
            VirtualCard.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _hash_field(value):
        """Generate a deterministic hash for a field value using HMAC-SHA256."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        return hmac.new(secret_key, value.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def generate_card_number(self):
        """Generate a unique 16-digit card number."""
        import random
        # Generate a card number starting with 4 (Visa) or 5 (Mastercard)
        # With 15 random digits, collision probability is extremely low (1 in 10^15)
        # We rely on randomness rather than checking for collisions
        prefix = '4' if self.card_type == 'debit' else '5'
        digits = ''.join([str(random.randint(0, 9)) for _ in range(15)])
        card_number = prefix + digits
        return card_number
    
    def generate_cvv(self):
        """Generate a 3-digit CVV."""
        import random
        return str(random.randint(100, 999))
    
    def set_expiry_date(self):
        """Set expiry date to 3 years from now."""
        from datetime import datetime
        current_date = datetime.now()
        self.expiry_month = current_date.month
        self.expiry_year = current_date.year + 3
    
    def is_expired(self):
        """Check if the card is expired."""
        from datetime import datetime
        current_date = datetime.now()
        return (current_date.year > self.expiry_year or 
                (current_date.year == self.expiry_year and current_date.month > self.expiry_month))
    
    def can_make_transaction(self, amount):
        """Check if card can make a transaction of given amount."""
        if self.status != 'active':
            return False, "Card is not active"
        
        if self.is_expired():
            return False, "Card has expired"
        
        if amount <= 0:
            return False, "Transaction amount must be positive"
        
        # Check daily limit
        if self.current_daily_spent + amount > self.daily_limit:
            return False, "Daily spending limit exceeded"
        
        # Check monthly limit
        if self.current_monthly_spent + amount > self.monthly_limit:
            return False, "Monthly spending limit exceeded"
        
        return True, "Transaction allowed"
    
    def mask_card_number(self):
        """Return masked card number for display."""
        return f"**** **** **** {self.card_number[-4:]}"
    
    def reset_daily_spending(self):
        """Reset daily spending counter."""
        self.current_daily_spent = 0
        self.save(update_fields=['current_daily_spent'])
    
    def reset_monthly_spending(self):
        """Reset monthly spending counter."""
        self.current_monthly_spent = 0
        self.save(update_fields=['current_monthly_spent'])
    
    @property
    def expiry_date(self):
        """Return formatted expiry date."""
        return f"{self.expiry_month:02d}/{self.expiry_year}"
    
    @property
    def is_active(self):
        """Check if card is active and not expired."""
        return self.status == 'active' and not self.is_expired()


class Transfer(models.Model):
    """Model for money transfers between users."""
    
    TRANSFER_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    TRANSFER_TYPE = [
        ('internal', 'Internal Transfer'),
        ('ach', 'ACH Transfer'),
        ('wire_domestic', 'Wire Transfer (Domestic)'),
        ('wire_international', 'Wire Transfer (International)'),
        ('external', 'External Transfer'),
        ('instant', 'Instant Transfer'),
    ]
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_transfers')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_transfers', null=True, blank=True)
    recipient_email = models.EmailField(blank=True)  # For internal transfers
    recipient_name = models.CharField(max_length=200, blank=True)  # For external transfers (ACH/Wire)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    transfer_type = models.CharField(max_length=20, choices=TRANSFER_TYPE, default='internal')
    status = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='pending')
    reference_number = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Admin approval fields
    requires_admin_approval = models.BooleanField(default=True)  # All transfers require approval by default
    admin_approved = models.BooleanField(default=False)
    admin_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_transfers')
    admin_approved_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    
    # Scheduled completion (15-30 min delay)
    scheduled_completion_time = models.DateTimeField(null=True, blank=True)
    
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transfers'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transfer {self.reference_number} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Generate reference number if not exists
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        
        # Set scheduled completion time (3-5 minutes from now) if not set
        if not self.scheduled_completion_time and self.status == 'pending':
            import random
            delay_minutes = random.randint(3, 5)
            self.scheduled_completion_time = timezone.now() + timezone.timedelta(minutes=delay_minutes)
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate a unique reference number."""
        while True:
            ref_number = f"TFR{str(uuid.uuid4().int)[:12]}"
            if not Transfer.objects.filter(reference_number=ref_number).exists():
                return ref_number
    
    def process_transfer(self):
        """Process the transfer - balance already deducted, just complete it."""
        if self.status not in ['pending', 'processing']:
            return False, f"Transfer cannot be processed from {self.status} status"
        
        try:
            # Add to recipient (if internal transfer)
            if self.recipient and self.transfer_type == 'internal':
                self.recipient.balance += self.amount
                self.recipient.save()
            
            # Mark as completed
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
            
            return True, "Transfer completed successfully"
            
        except Exception as e:
            self.status = 'failed'
            self.save()
            return False, f"Transfer failed: {str(e)}"
    
    def cancel_transfer(self):
        """Cancel a pending transfer."""
        if self.status not in ['pending', 'processing']:
            return False, "Only pending or processing transfers can be cancelled"
        
        self.status = 'cancelled'
        self.save()
        return True, "Transfer cancelled successfully"
    
    def admin_approve_transfer(self, admin_user, notes=""):
        """Admin approves the transfer for immediate processing."""
        if self.status not in ['pending', 'processing']:
            return False, "Only pending or processing transfers can be approved"
        
        # Mark as admin approved but keep status as pending for process_transfer
        self.admin_approved = True
        self.admin_approved_by = admin_user
        self.admin_approved_at = timezone.now()
        self.admin_notes = notes
        
        # If status is 'processing', change it back to 'pending' temporarily for process_transfer
        original_status = self.status
        if self.status == 'processing':
            self.status = 'pending'
        
        self.save()
        
        # Process the transfer immediately
        success, message = self.process_transfer()
        
        # Send real-time notification to user
        if success:
            from socketio_app.utils import notify_transfer_update, notify_balance_update, send_notification
            notify_transfer_update(self.sender.id, self.id, self.status, self.transfer_type)
            notify_balance_update(self.sender.id, self.sender.balance)
            send_notification(
                self.sender.id,
                'Transfer Approved',
                f'Your {self.get_transfer_type_display()} transfer of ${self.amount} has been approved and processed.',
                'success'
            )
            
            # Notify recipient if internal transfer
            if self.recipient:
                notify_balance_update(self.recipient.id, self.recipient.balance)
                send_notification(
                    self.recipient.id,
                    'Money Received',
                    f'You received ${self.amount} from {self.sender.get_full_name() or self.sender.email}.',
                    'success'
                )
        
        return success, message
    
    def admin_reject_transfer(self, admin_user, notes=""):
        """Admin rejects the transfer and refunds the sender."""
        if self.status not in ['pending', 'processing']:
            return False, "Only pending or processing transfers can be rejected"
        
        # Refund sender (amount + fee was already deducted)
        total_amount = self.amount + self.fee
        self.sender.balance += total_amount
        self.sender.save()
        
        self.status = 'failed'
        self.admin_notes = notes
        self.save()
        
        # Send real-time notification to user
        from socketio_app.utils import notify_transfer_update, notify_balance_update, send_notification
        notify_transfer_update(self.sender.id, self.id, self.status, self.transfer_type)
        notify_balance_update(self.sender.id, self.sender.balance)
        send_notification(
            self.sender.id,
            'Transfer Rejected',
            f'Your {self.get_transfer_type_display()} transfer of ${self.amount} has been rejected. Your balance has been refunded.',
            'error'
        )
        
        return True, "Transfer rejected and refunded successfully"
    
    def auto_process_if_ready(self):
        """Auto-process transfer if scheduled time has passed and admin approval not required."""
        if self.status != 'pending':
            return False, "Transfer is not in pending status"
        
        # Check if scheduled time has passed
        if self.scheduled_completion_time and timezone.now() >= self.scheduled_completion_time:
            # If admin approval is required and not yet approved, don't auto-process
            if self.requires_admin_approval and not self.admin_approved:
                return False, "Waiting for admin approval"
            
            # Process the transfer
            self.status = 'processing'
            self.save()
            
            success, message = self.process_transfer()
            return success, message
        
        return False, "Scheduled time not yet reached"


class ExternalBankAccount(models.Model):
    """Model for external bank accounts."""
    
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='external_bank_accounts')
    account_holder_name = models.CharField(max_length=200)
    account_number = EncryptedCharField(max_length=20)
    account_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    routing_number = EncryptedCharField(max_length=9)
    routing_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='checking')
    bank_name = models.CharField(max_length=200)
    bank_address = models.TextField(blank=True)
    nickname = models.CharField(max_length=100, blank=True)
    is_verified = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'external_bank_accounts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.bank_name} - {self.account_holder_name} for {self.user.email}"
    
    def save(self, *args, **kwargs):
        # Generate hashes for encrypted fields
        if self.account_number and not self.account_number_hash:
            self.account_number_hash = self._hash_field(self.account_number)
        if self.routing_number and not self.routing_number_hash:
            self.routing_number_hash = self._hash_field(self.routing_number)
        
        # Ensure only one default account per user
        if self.is_default:
            ExternalBankAccount.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _hash_field(value):
        """Generate a deterministic hash for a field value using HMAC-SHA256."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        return hmac.new(secret_key, value.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def mask_account_number(self):
        """Return masked account number for display."""
        if len(self.account_number) > 4:
            return f"****{self.account_number[-4:]}"
        return "****"


class SavedBeneficiary(models.Model):
    """Model for saved transfer beneficiaries."""
    
    TRANSFER_TYPES = [
        ('ach', 'ACH Transfer'),
        ('wire_domestic', 'Wire Transfer (Domestic)'),
        ('wire_international', 'Wire Transfer (International)'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_beneficiaries')
    nickname = models.CharField(max_length=100)
    transfer_type = models.CharField(max_length=30, choices=TRANSFER_TYPES)
    recipient_name = models.CharField(max_length=200)
    
    # For ACH and domestic wire
    account_number = EncryptedCharField(max_length=20, blank=True)
    account_number_hash = models.CharField(max_length=64, db_index=True, blank=True, default='')  # SHA256 hash for lookups
    routing_number = EncryptedCharField(max_length=9, blank=True)
    routing_number_hash = models.CharField(max_length=64, db_index=True, blank=True, default='')  # SHA256 hash for lookups
    account_type = models.CharField(max_length=20, blank=True)
    
    # For international wire
    iban = models.CharField(max_length=34, blank=True)
    swift_code = models.CharField(max_length=11, blank=True)
    
    # Common fields
    bank_name = models.CharField(max_length=200)
    bank_address = models.TextField(blank=True)
    
    last_used = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'saved_beneficiaries'
        ordering = ['-last_used', '-created_at']
    
    def __str__(self):
        return f"{self.nickname} - {self.recipient_name} ({self.get_transfer_type_display()})"
    
    def save(self, *args, **kwargs):
        # Generate hashes for encrypted fields
        if self.account_number and not self.account_number_hash:
            self.account_number_hash = self._hash_field(self.account_number)
        if self.routing_number and not self.routing_number_hash:
            self.routing_number_hash = self._hash_field(self.routing_number)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _hash_field(value):
        """Generate a deterministic hash for a field value using HMAC-SHA256."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        return hmac.new(secret_key, value.encode('utf-8'), hashlib.sha256).hexdigest()


class BankAccount(models.Model):
    """Model for external bank accounts (legacy - keeping for compatibility)."""
    
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='checking')
    account_number = EncryptedCharField(max_length=20)
    account_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    routing_number = EncryptedCharField(max_length=9)
    routing_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    bank_name = models.CharField(max_length=200)
    is_verified = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bank_accounts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.bank_name} - {self.account_name} for {self.user.email}"
    
    def save(self, *args, **kwargs):
        # Generate hashes for encrypted fields
        if self.account_number and not self.account_number_hash:
            self.account_number_hash = self._hash_field(self.account_number)
        if self.routing_number and not self.routing_number_hash:
            self.routing_number_hash = self._hash_field(self.routing_number)
        
        # Ensure only one default account per user
        if self.is_default:
            BankAccount.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _hash_field(value):
        """Generate a deterministic hash for a field value using HMAC-SHA256."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        return hmac.new(secret_key, value.encode('utf-8'), hashlib.sha256).hexdigest()
    
    def mask_account_number(self):
        """Return masked account number for display."""
        if len(self.account_number) > 4:
            return f"****{self.account_number[-4:]}"
        return "****"


class DirectDeposit(models.Model):
    """Model for direct deposit setup."""
    
    DEPOSIT_STATUS = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='direct_deposits')
    employer_name = models.CharField(max_length=200)
    account_number = EncryptedCharField(max_length=20)
    account_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    routing_number = EncryptedCharField(max_length=9)
    routing_number_hash = models.CharField(max_length=64, db_index=True, default='')  # SHA256 hash for lookups
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
    ])
    status = models.CharField(max_length=20, choices=DEPOSIT_STATUS, default='pending')
    start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'direct_deposits'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Direct deposit for {self.user.email} from {self.employer_name}"
    
    def save(self, *args, **kwargs):
        # Generate hashes for encrypted fields
        if self.account_number and not self.account_number_hash:
            self.account_number_hash = self._hash_field(self.account_number)
        if self.routing_number and not self.routing_number_hash:
            self.routing_number_hash = self._hash_field(self.routing_number)
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _hash_field(value):
        """Generate a deterministic hash for a field value using HMAC-SHA256."""
        secret_key = settings.SECRET_KEY.encode('utf-8')
        return hmac.new(secret_key, value.encode('utf-8'), hashlib.sha256).hexdigest()


class CheckDeposit(models.Model):
    """Model for check deposits."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='check_deposits')
    check_number = models.CharField(max_length=50, blank=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Check images
    front_image = models.ImageField(upload_to='check_deposits/front/')
    back_image = models.ImageField(upload_to='check_deposits/back/', blank=True, null=True)
    
    # Check details
    payer_name = models.CharField(max_length=200, blank=True)
    memo = models.CharField(max_length=200, blank=True)
    
    # OCR extracted data
    ocr_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ocr_check_number = models.CharField(max_length=50, blank=True)
    ocr_confidence = models.FloatField(default=0.0)
    
    # Status and approval
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True)
    
    # Hold period
    hold_until = models.DateTimeField(null=True, blank=True)
    
    # Admin approval
    requires_admin_approval = models.BooleanField(default=True)
    admin_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_check_deposits'
    )
    admin_approved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'check_deposits'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Check deposit ${self.amount} - {self.user.email} ({self.status})"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create transaction record when check deposit is first created
        if is_new:
            from transactions.models import Transaction
            payer_info = f" from {self.payer_name}" if self.payer_name else ""
            Transaction.objects.create(
                user=self.user,
                transaction_type='deposit',
                amount=self.amount,
                status='pending',
                description=f"Check deposit{payer_info} - Check #{self.check_number or 'Pending'}",
                balance_before=self.user.balance,
                balance_after=self.user.balance,
                merchant_name=self.payer_name or "Check Deposit",
            )
            
            # Trigger async tasks for new deposits
            try:
                from .tasks import validate_check_image_quality, detect_duplicate_checks, send_check_deposit_email_notification
                # Validate image quality
                validate_check_image_quality.delay(self.id)
                # Check for duplicates
                detect_duplicate_checks.delay()
                # Send email notification
                send_check_deposit_email_notification.delay(self.id, 'submitted')
            except Exception:
                logger.exception(
                    f"Failed to schedule Celery tasks for check deposit {self.id}. "
                    "Tasks: validate_check_image_quality, detect_duplicate_checks, send_check_deposit_email_notification. "
                    "Celery might not be running in development."
                )
    
    def approve(self, admin_user, hold_days=1, notes=""):
        """Approve check deposit and set hold period."""
        from datetime import timedelta
        
        self.status = 'approved'
        self.admin_approved_by = admin_user
        self.admin_approved_at = timezone.now()
        self.admin_notes = notes
        self.hold_until = timezone.now() + timedelta(days=hold_days)
        self.save()
        
        # Send real-time notification
        from socketio_app.utils import notify_check_deposit_update, send_notification
        notify_check_deposit_update(self.user.id, self.id, self.status, self.amount)
        send_notification(
            self.user.id,
            'Check Deposit Approved',
            f'Your check deposit of ${self.amount} has been approved. Funds will be available on {self.hold_until.strftime("%B %d, %Y")}.',
            'success'
        )
        
        # Send email notification
        try:
            from .tasks import send_check_deposit_email_notification
            send_check_deposit_email_notification.delay(self.id, 'approved')
        except Exception:
            logger.exception(
                f"Failed to schedule email notification task for approved check deposit {self.id}"
            )
    
    def reject(self, admin_user, notes=""):
        """Reject check deposit."""
        self.status = 'rejected'
        self.admin_approved_by = admin_user
        self.admin_approved_at = timezone.now()
        self.admin_notes = notes
        
        # Update transaction status to failed
        from transactions.models import Transaction
        # Match the description format used in save()
        payer_info = f" from {self.payer_name}" if self.payer_name else ""
        check_desc = f"Check deposit{payer_info} - Check #{self.check_number or 'Pending'}"
        transaction = Transaction.objects.filter(
            user=self.user,
            transaction_type='deposit',
            description__contains=f"Check #{self.check_number}" if self.check_number else "Check #Pending",
            amount=self.amount,
            status='pending'
        ).first()
        
        if transaction:
            transaction.status = 'failed'
            transaction.save()
        
        # Temporarily disable save to avoid recursion
        super(CheckDeposit, self).save(update_fields=['status', 'admin_approved_by', 'admin_approved_at', 'admin_notes'])
        
        # Send real-time notification
        from socketio_app.utils import notify_check_deposit_update, send_notification
        notify_check_deposit_update(self.user.id, self.id, self.status, self.amount)
        send_notification(
            self.user.id,
            'Check Deposit Rejected',
            f'Your check deposit of ${self.amount} has been rejected. {notes}',
            'error'
        )
        
        # Send email notification
        try:
            from .tasks import send_check_deposit_email_notification
            send_check_deposit_email_notification.delay(self.id, 'rejected')
        except Exception:
            logger.exception(
                f"Failed to schedule email notification task for rejected check deposit {self.id}"
            )
    
    def complete(self, bypass_hold=False):
        """Complete check deposit and add funds to user balance."""
        if self.status != 'approved':
            return False, "Check must be approved first"
        
        if not bypass_hold and self.hold_until and timezone.now() < self.hold_until:
            return False, "Hold period not yet expired"
        
        try:
            with transaction.atomic():
                # Lock the user row and atomically update balance
                User = self.user.__class__
                user = User.objects.select_for_update().get(pk=self.user.pk)
                
                # Calculate balance before and after
                balance_before = user.balance
                balance_after = balance_before + self.amount
                
                # Atomically update user balance using F() expression
                User.objects.filter(pk=user.pk).update(balance=F('balance') + self.amount)
                
                # Refresh user instance to get updated balance
                user.refresh_from_db()
                self.user = user
                
                # Update existing transaction record
                from transactions.models import Transaction
                payer_info = f" from {self.payer_name}" if self.payer_name else ""
                check_desc = f"Check deposit{payer_info} - Check #{self.check_number or 'Pending'}"
                
                # Try to find the pending transaction (it might have the old description format)
                txn = Transaction.objects.filter(
                    user=self.user,
                    transaction_type='deposit',
                    status='pending',
                    amount=self.amount
                ).filter(
                    description__contains=f"Check #{self.check_number}" if self.check_number else "Check #Pending"
                ).first()
                
                if txn:
                    txn.status = 'completed'
                    txn.description = check_desc  # Update description with payer name
                    txn.balance_before = balance_before
                    txn.balance_after = balance_after
                    txn.completed_at = timezone.now()
                    txn.merchant_name = self.payer_name or "Check Deposit"
                    txn.save()
                else:
                    # Fallback: create new transaction if not found
                    Transaction.objects.create(
                        user=self.user,
                        transaction_type='deposit',
                        amount=self.amount,
                        status='completed',
                        description=check_desc,
                        balance_before=balance_before,
                        balance_after=balance_after,
                        completed_at=timezone.now(),
                        merchant_name=self.payer_name or "Check Deposit",
                    )
                
                self.status = 'completed'
                self.completed_at = timezone.now()
                
                # Temporarily disable save to avoid recursion
                super(CheckDeposit, self).save(update_fields=['status', 'completed_at'])
                
        except Exception as e:
            logger.exception(f"Failed to complete check deposit {self.id}: {str(e)}")
            return False, f"Failed to complete deposit: {str(e)}"
        
        # Send real-time notifications
        from socketio_app.utils import notify_check_deposit_update, notify_balance_update, send_notification
        notify_check_deposit_update(self.user.id, self.id, self.status, self.amount)
        notify_balance_update(self.user.id, self.user.balance)
        send_notification(
            self.user.id,
            'Check Deposit Completed',
            f'Your check deposit of ${self.amount} is now available in your account.',
            'success'
        )
        
        # Send email notification
        try:
            from .tasks import send_check_deposit_email_notification
            send_check_deposit_email_notification.delay(self.id, 'completed')
        except Exception:
            logger.exception(
                f"Failed to schedule email notification task for completed check deposit {self.id}"
            )
        
        return True, "Check deposit completed" 