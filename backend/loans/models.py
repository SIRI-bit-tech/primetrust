from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Loan(models.Model):
    """Model for user loans."""
    
    LOAN_TYPES = [
        ('personal', 'Personal Loan'),
        ('business', 'Business Loan'),
        ('mortgage', 'Mortgage'),
        ('auto', 'Auto Loan'),
        ('student', 'Student Loan'),
    ]
    
    LOAN_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('active', 'Active'),
        ('paid_off', 'Paid Off'),
        ('defaulted', 'Defaulted'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # Annual percentage rate
    term_months = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=LOAN_STATUS, default='pending')
    
    # Payment tracking
    monthly_payment = models.DecimalField(max_digits=10, decimal_places=2)
    total_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    remaining_balance = models.DecimalField(max_digits=15, decimal_places=2)
    next_payment_date = models.DateField()
    
    # Application details
    purpose = models.TextField(blank=True)
    employment_status = models.CharField(max_length=50, blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    application_date = models.DateTimeField(auto_now_add=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'loans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['loan_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.loan_type} loan for {self.user.email} - {self.amount}"
    
    def save(self, *args, **kwargs):
        # Calculate monthly payment if not set
        if not self.monthly_payment and self.amount and self.interest_rate and self.term_months:
            self.calculate_monthly_payment()
        
        # Set remaining balance if not set
        if not self.remaining_balance:
            self.remaining_balance = self.amount
        
        super().save(*args, **kwargs)
    
    def calculate_monthly_payment(self):
        """Calculate monthly payment using loan amortization formula."""
        if self.amount and self.interest_rate and self.term_months:
            # Convert annual rate to monthly rate
            monthly_rate = self.interest_rate / 100 / 12
            
            if monthly_rate > 0:
                # Loan amortization formula
                self.monthly_payment = self.amount * (monthly_rate * (1 + monthly_rate) ** self.term_months) / ((1 + monthly_rate) ** self.term_months - 1)
            else:
                self.monthly_payment = self.amount / self.term_months
    
    def make_payment(self, amount):
        """Make a payment on the loan."""
        if self.status != 'active':
            return False, "Loan is not active"
        
        if amount <= 0:
            return False, "Payment amount must be positive"
        
        if amount > self.remaining_balance:
            return False, "Payment amount exceeds remaining balance"
        
        self.total_paid += amount
        self.remaining_balance -= amount
        
        # Check if loan is paid off
        if self.remaining_balance <= 0:
            self.status = 'paid_off'
            self.end_date = timezone.now()
        
        self.save()
        return True, "Payment processed successfully"
    
    def get_loan_summary(self):
        """Get loan summary information."""
        return {
            'id': self.id,
            'loan_type': self.loan_type,
            'amount': str(self.amount),
            'remaining_balance': str(self.remaining_balance),
            'monthly_payment': str(self.monthly_payment),
            'status': self.status,
            'next_payment_date': self.next_payment_date,
            'total_paid': str(self.total_paid),
            'interest_rate': str(self.interest_rate),
            'term_months': self.term_months
        }


class LoanApplication(models.Model):
    """Model for loan applications."""
    
    APPLICATION_STATUS = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loan_applications')
    loan_type = models.CharField(max_length=20, choices=Loan.LOAN_TYPES)
    requested_amount = models.DecimalField(max_digits=15, decimal_places=2)
    purpose = models.TextField()
    employment_status = models.CharField(max_length=50)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2)
    credit_score = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=APPLICATION_STATUS, default='draft')
    
    # Additional information
    documents_uploaded = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'loan_applications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Loan application for {self.user.email} - {self.loan_type}"
    
    def submit_application(self):
        """Submit the loan application."""
        if self.status == 'draft':
            self.status = 'submitted'
            self.submitted_at = timezone.now()
            self.save()
            return True, "Application submitted successfully"
        return False, "Application cannot be submitted" 