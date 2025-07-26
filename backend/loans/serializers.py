from rest_framework import serializers
from decimal import Decimal
from .models import Loan, LoanApplication


class LoanSerializer(serializers.ModelSerializer):
    """Serializer for Loan model."""
    
    class Meta:
        model = Loan
        fields = [
            'id', 'loan_type', 'amount', 'interest_rate', 'term_months', 'status',
            'monthly_payment', 'total_paid', 'remaining_balance', 'next_payment_date',
            'purpose', 'employment_status', 'annual_income', 'application_date',
            'approval_date', 'start_date', 'end_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'monthly_payment', 'total_paid', 'remaining_balance', 
                           'application_date', 'approval_date', 'start_date', 'end_date', 
                           'created_at', 'updated_at']


class LoanCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating loans."""
    
    class Meta:
        model = Loan
        fields = [
            'loan_type', 'amount', 'interest_rate', 'term_months', 'purpose',
            'employment_status', 'annual_income', 'next_payment_date'
        ]


class LoanApplicationSerializer(serializers.ModelSerializer):
    """Serializer for LoanApplication model."""
    
    class Meta:
        model = LoanApplication
        fields = [
            'id', 'loan_type', 'requested_amount', 'purpose', 'employment_status',
            'annual_income', 'credit_score', 'status', 'documents_uploaded', 'notes',
            'created_at', 'submitted_at', 'reviewed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'submitted_at', 'reviewed_at', 'updated_at']


class LoanPaymentSerializer(serializers.Serializer):
    """Serializer for loan payments."""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01')) 