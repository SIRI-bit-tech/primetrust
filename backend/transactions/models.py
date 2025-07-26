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


class Bill(models.Model):
    """Model for bill payments."""
    
    BILL_CATEGORIES = [
        ('utilities', 'Utilities'),
        ('insurance', 'Insurance'),
        ('subscription', 'Subscription'),
        ('credit_card', 'Credit Card'),
        ('other', 'Other'),
    ]
    
    BILL_STATUS = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    RECURRING_FREQUENCIES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bills')
    biller_name = models.CharField(max_length=200)
    biller_category = models.CharField(max_length=20, choices=BILL_CATEGORIES)
    account_number = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=BILL_STATUS, default='pending')
    
    # Recurring payment settings
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, choices=RECURRING_FREQUENCIES, null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    
    # Payment tracking
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='bills')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bills'
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['user', 'status', 'due_date']),
            models.Index(fields=['biller_category']),
        ]
    
    def __str__(self):
        return f"{self.biller_name} - {self.amount} due {self.due_date}"
    
    def save(self, *args, **kwargs):
        # Set next due date for recurring bills
        if self.is_recurring and self.recurring_frequency and not self.next_due_date:
            self.set_next_due_date()
        
        super().save(*args, **kwargs)
    
    def set_next_due_date(self):
        """Set the next due date based on recurring frequency."""
        from datetime import timedelta
        
        if self.recurring_frequency == 'monthly':
            self.next_due_date = self.due_date + timedelta(days=30)
        elif self.recurring_frequency == 'quarterly':
            self.next_due_date = self.due_date + timedelta(days=90)
        elif self.recurring_frequency == 'annually':
            self.next_due_date = self.due_date + timedelta(days=365)
    
    def is_overdue(self):
        """Check if the bill is overdue."""
        return self.status == 'pending' and self.due_date < timezone.now().date()
    
    def pay_bill(self, payment_amount=None):
        """Pay the bill."""
        if self.status != 'pending':
            return False, "Bill is not in pending status"
        
        if payment_amount is None:
            payment_amount = self.amount
        
        # Check if user has sufficient funds
        if self.user.balance < payment_amount:
            return False, "Insufficient funds"
        
        try:
            # Create transaction
            transaction = Transaction.objects.create(
                user=self.user,
                transaction_type='payment',
                amount=payment_amount,
                currency='USD',
                status='pending',
                description=f"Payment to {self.biller_name}",
                merchant_name=self.biller_name,
                merchant_category=self.biller_category,
                balance_before=self.user.balance,
                balance_after=self.user.balance - payment_amount
            )
            
            # Process transaction
            success, message = transaction.process_transaction()
            
            if success:
                # Update bill status
                self.status = 'paid'
                self.paid_at = timezone.now()
                self.paid_amount = payment_amount
                self.transaction = transaction
                self.save()
                
                # Create next recurring bill if applicable
                if self.is_recurring and self.recurring_frequency:
                    self.create_next_bill()
                
                return True, "Bill paid successfully"
            else:
                transaction.delete()
                return False, f"Payment failed: {message}"
                
        except Exception as e:
            return False, f"Payment failed: {str(e)}"
    
    def create_next_bill(self):
        """Create the next recurring bill."""
        if not self.is_recurring or not self.next_due_date:
            return
        
        Bill.objects.create(
            user=self.user,
            biller_name=self.biller_name,
            biller_category=self.biller_category,
            account_number=self.account_number,
            amount=self.amount,
            due_date=self.next_due_date,
            is_recurring=self.is_recurring,
            recurring_frequency=self.recurring_frequency
        )
    
    def get_formatted_amount(self):
        """Get formatted amount."""
        return f"${self.amount:,.2f}"
    
    def get_days_until_due(self):
        """Get days until due date."""
        from datetime import date
        today = date.today()
        return (self.due_date - today).days


class Investment(models.Model):
    """Model for investment transactions."""
    
    INVESTMENT_TYPES = [
        ('stock', 'Stock'),
        ('etf', 'ETF'),
        ('crypto', 'Cryptocurrency'),
        ('bond', 'Bond'),
        ('mutual_fund', 'Mutual Fund'),
    ]
    
    INVESTMENT_ACTIONS = [
        ('buy', 'Buy'),
        ('sell', 'Sell'),
        ('dividend', 'Dividend'),
    ]
    
    INVESTMENT_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='investments')
    investment_type = models.CharField(max_length=20, choices=INVESTMENT_TYPES)
    action = models.CharField(max_length=20, choices=INVESTMENT_ACTIONS)
    symbol = models.CharField(max_length=20)
    company_name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=15, decimal_places=6)
    price_per_share = models.DecimalField(max_digits=15, decimal_places=2)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=INVESTMENT_STATUS, default='pending')
    
    # Transaction reference
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='investments')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'investments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'investment_type', 'symbol']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.action.title()} {self.quantity} {self.symbol} for {self.user.email}"
    
    def process_investment(self):
        """Process the investment transaction."""
        if self.status != 'pending':
            return False, "Investment is not in pending status"
        
        try:
            # Create transaction
            transaction = Transaction.objects.create(
                user=self.user,
                transaction_type='investment',
                amount=self.total_amount,
                currency=self.currency,
                status='pending',
                description=f"{self.action.title()} {self.quantity} {self.symbol}",
                merchant_name=self.company_name,
                merchant_category=self.investment_type,
                balance_before=self.user.balance,
                balance_after=self.user.balance - self.total_amount
            )
            
            # Process transaction
            success, message = transaction.process_transaction()
            
            if success:
                # Update investment status
                self.status = 'completed'
                self.completed_at = timezone.now()
                self.transaction = transaction
                self.save()
                
                return True, "Investment completed successfully"
            else:
                transaction.delete()
                return False, f"Investment failed: {message}"
                
        except Exception as e:
            self.status = 'failed'
            self.save()
            return False, f"Investment failed: {str(e)}"
    
    def get_formatted_total(self):
        """Get formatted total amount."""
        return f"${self.total_amount:,.2f}"
    
    def get_formatted_price(self):
        """Get formatted price per share."""
        return f"${self.price_per_share:,.2f}"
