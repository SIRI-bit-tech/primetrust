from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import uuid


class Transaction(models.Model):
    """Model for all financial transactions."""
    
    TRANSACTION_TYPES = [
        ('transfer', 'Transfer'),
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('payment', 'Payment'),
        ('investment', 'Investment'),
        ('loan', 'Loan'),
        ('fee', 'Fee'),
        ('refund', 'Refund'),
        ('adjustment', 'Adjustment'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('reversed', 'Reversed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS, default='pending')
    reference_number = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    
    # Related objects
    transfer = models.ForeignKey('banking.Transfer', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    virtual_card = models.ForeignKey('banking.VirtualCard', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    # Balance tracking
    balance_before = models.DecimalField(max_digits=15, decimal_places=2)
    balance_after = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Metadata
    merchant_name = models.CharField(max_length=200, blank=True)
    merchant_category = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['transaction_type', 'status']),
            models.Index(fields=['reference_number']),
        ]
    
    def __str__(self):
        return f"Transaction {self.reference_number} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Generate reference number if not exists
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate a unique reference number."""
        while True:
            ref_number = f"TXN{str(uuid.uuid4().int)[:12]}"
            if not Transaction.objects.filter(reference_number=ref_number).exists():
                return ref_number
    
    def process_transaction(self):
        """Process the transaction and update user balance."""
        if self.status != 'pending':
            return False, "Transaction is not in pending status"
        
        try:
            # Update user balance
            user = self.user
            
            if self.transaction_type in ['deposit', 'refund', 'adjustment']:
                # Add to balance
                user.balance += self.amount
            elif self.transaction_type in ['withdrawal', 'payment', 'investment', 'loan', 'fee', 'transfer']:
                # Check if user has sufficient funds
                if user.balance < self.amount:
                    self.status = 'failed'
                    self.save()
                    return False, "Insufficient funds"
                
                # Deduct from balance
                user.balance -= self.amount
            
            # Update balance tracking
            self.balance_before = user.balance - self.amount if self.transaction_type in ['deposit', 'refund', 'adjustment'] else user.balance + self.amount
            self.balance_after = user.balance
            
            # Save user
            user.save()
            
            # Mark transaction as completed
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
            
            return True, "Transaction completed successfully"
            
        except Exception as e:
            self.status = 'failed'
            self.save()
            return False, f"Transaction failed: {str(e)}"
    
    def reverse_transaction(self):
        """Reverse a completed transaction."""
        if self.status != 'completed':
            return False, "Only completed transactions can be reversed"
        
        try:
            # Create reversal transaction
            reversal = Transaction.objects.create(
                user=self.user,
                transaction_type='refund' if self.transaction_type in ['withdrawal', 'payment', 'investment', 'loan', 'fee', 'transfer'] else 'adjustment',
                amount=self.amount,
                currency=self.currency,
                status='pending',
                description=f"Reversal of transaction {self.reference_number}",
                balance_before=self.user.balance,
                balance_after=self.user.balance + self.amount
            )
            
            # Process reversal
            success, message = reversal.process_transaction()
            
            if success:
                self.status = 'reversed'
                self.save()
                return True, "Transaction reversed successfully"
            else:
                reversal.delete()
                return False, f"Failed to reverse transaction: {message}"
                
        except Exception as e:
            return False, f"Failed to reverse transaction: {str(e)}"
    
    def get_formatted_amount(self):
        """Get formatted amount with currency symbol."""
        return f"${self.amount:,.2f}" if self.currency == 'USD' else f"{self.amount:,.2f} {self.currency}"
    
    def get_status_color(self):
        """Get color for status display."""
        status_colors = {
            'pending': 'yellow',
            'completed': 'green',
            'failed': 'red',
            'cancelled': 'gray',
            'reversed': 'orange',
        }
        return status_colors.get(self.status, 'gray')


class Loan(models.Model):
    """Model for loan applications and loans."""
    
    LOAN_TYPES = [
        ('personal', 'Personal Loan'),
        ('business', 'Business Loan'),
        ('mortgage', 'Mortgage'),
        ('auto', 'Auto Loan'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    term_months = models.PositiveIntegerField()
    purpose = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'transaction_loans'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.loan_type} - {self.amount}"


class Bill(models.Model):
    """Model for bill payments."""
    
    BILL_TYPES = [
        ('utilities', 'Utilities'),
        ('insurance', 'Insurance'),
        ('subscription', 'Subscription'),
        ('credit_card', 'Credit Card'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bills')
    bill_type = models.CharField(max_length=20, choices=BILL_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bills'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.bill_type} - {self.amount}"


class Investment(models.Model):
    """Model for investments."""
    
    INVESTMENT_TYPES = [
        ('stocks', 'Stocks'),
        ('bonds', 'Bonds'),
        ('mutual_funds', 'Mutual Funds'),
        ('etfs', 'ETFs'),
        ('crypto', 'Cryptocurrency'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='investments')
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    return_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'investments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.investment_type} - {self.amount}"


class CurrencySwap(models.Model):
    """Model for currency swaps."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='currency_swaps')
    currency_from = models.CharField(max_length=10)
    currency_to = models.CharField(max_length=10)
    amount_from = models.DecimalField(max_digits=15, decimal_places=8)
    amount_to = models.DecimalField(max_digits=15, decimal_places=8)
    exchange_rate = models.DecimalField(max_digits=15, decimal_places=8)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transaction_currency_swaps'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.currency_from} to {self.currency_to}"


class BitcoinTransaction(models.Model):
    """Model for Bitcoin transactions."""
    
    TRANSACTION_TYPES = [
        ('incoming', 'Incoming'),
        ('outgoing', 'Outgoing'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bitcoin_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=8)
    bitcoin_address = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    confirmations = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transaction_bitcoin_transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} - {self.amount} BTC"
