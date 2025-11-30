from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class CardApplication(models.Model):
    """Model for card applications that need admin approval."""
    
    APPLICATION_STATUS = [
        ('pending', 'Pending Review'),
        ('processing', 'Processing'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
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
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS, default='pending')
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
        """Approve the application and move to processing."""
        self.status = 'processing'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        CardApplicationNotificationService.send_application_approved_notification(self)
    
    def reject(self, admin_user, notes=""):
        """Reject the application."""
        self.status = 'rejected'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        CardApplicationNotificationService.send_application_rejected_notification(self)
    
    def complete(self, admin_user, notes=""):
        """Mark application as completed (card created)."""
        self.status = 'completed'
        self.processed_by = admin_user
        self.processed_at = timezone.now()
        self.admin_notes = notes
        self.save()
        
        # Send notification
        from .services import CardApplicationNotificationService
        card_number = None
        # Get the created card properly
        created_card = self.created_card.first() if hasattr(self, 'created_card') else None
        if created_card:
            card_number = created_card.card_number
        CardApplicationNotificationService.send_application_completed_notification(self, card_number)
    
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
    card_number = models.CharField(max_length=16, unique=True)
    cvv = models.CharField(max_length=4)
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
    
    def generate_card_number(self):
        """Generate a unique 16-digit card number."""
        import random
        while True:
            # Generate a card number starting with 4 (Visa) or 5 (Mastercard)
            prefix = '4' if self.card_type == 'debit' else '5'
            # Generate 15 random digits
            digits = ''.join([str(random.randint(0, 9)) for _ in range(15)])
            card_number = prefix + digits
            
            if not VirtualCard.objects.filter(card_number=card_number).exists():
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
        ('external', 'External Transfer'),
        ('instant', 'Instant Transfer'),
    ]
    
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_transfers')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_transfers', null=True, blank=True)
    recipient_email = models.EmailField()  # For external transfers
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
        
        # Set scheduled completion time (15-30 minutes from now) if not set
        if not self.scheduled_completion_time and self.status == 'pending':
            import random
            delay_minutes = random.randint(15, 30)
            self.scheduled_completion_time = timezone.now() + timezone.timedelta(minutes=delay_minutes)
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate a unique reference number."""
        while True:
            ref_number = f"TFR{str(uuid.uuid4().int)[:12]}"
            if not Transfer.objects.filter(reference_number=ref_number).exists():
                return ref_number
    
    def process_transfer(self):
        """Process the transfer."""
        if self.status != 'pending':
            return False, "Transfer is not in pending status"
        
        # Check sender balance
        if self.sender.balance < self.amount:
            self.status = 'failed'
            self.save()
            return False, "Insufficient funds"
        
        # Check transfer limits
        can_transfer, message = self.sender.can_transfer(self.amount)
        if not can_transfer:
            self.status = 'failed'
            self.save()
            return False, message
        
        try:
            # Deduct from sender
            self.sender.balance -= self.amount
            self.sender.save()
            
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
        
        self.admin_approved = True
        self.admin_approved_by = admin_user
        self.admin_approved_at = timezone.now()
        self.admin_notes = notes
        self.status = 'processing'
        self.save()
        
        # Process the transfer immediately
        success, message = self.process_transfer()
        
        return success, message
    
    def admin_reject_transfer(self, admin_user, notes=""):
        """Admin rejects the transfer."""
        if self.status not in ['pending', 'processing']:
            return False, "Only pending or processing transfers can be rejected"
        
        # Refund sender if amount was already deducted
        if self.status == 'processing':
            self.sender.balance += self.amount
            self.sender.save()
        
        self.status = 'failed'
        self.admin_notes = notes
        self.save()
        
        return True, "Transfer rejected successfully"
    
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


class BankAccount(models.Model):
    """Model for external bank accounts."""
    
    ACCOUNT_TYPES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='checking')
    account_number = models.CharField(max_length=20)
    routing_number = models.CharField(max_length=9)
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
        # Ensure only one default account per user
        if self.is_default:
            BankAccount.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
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
    account_number = models.CharField(max_length=20)
    routing_number = models.CharField(max_length=9)
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