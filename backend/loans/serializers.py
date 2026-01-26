from rest_framework import serializers
from decimal import Decimal
import logging
from .models import Loan, LoanApplication

logger = logging.getLogger(__name__)


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
    
    # Accept frontend field names (write-only, not mapped to model fields directly)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, write_only=True, required=True)
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=True)
    
    class Meta:
        model = LoanApplication
        fields = [
            'id', 'loan_type', 'requested_amount', 'amount', 'purpose', 'employment_status',
            'annual_income', 'monthly_income', 'credit_score', 'status', 'documents_uploaded', 'notes',
            'created_at', 'submitted_at', 'reviewed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'submitted_at', 'reviewed_at', 'updated_at']
    
    def to_internal_value(self, data):
        """Convert frontend field names to backend field names before validation."""
        # Log only field names at DEBUG level, not values
        logger.debug(f"LoanApplicationSerializer.to_internal_value - Processing fields: {list(data.keys())}")
        
        # Create a copy to avoid modifying the original
        internal_data = data.copy()
        
        # Add converted fields BEFORE validation (keep originals for now)
        if 'amount' in internal_data:
            internal_data['requested_amount'] = internal_data['amount']
            logger.debug("LoanApplicationSerializer: Mapped 'amount' to 'requested_amount'")
        
        if 'monthly_income' in internal_data:
            try:
                monthly = Decimal(str(internal_data['monthly_income']))
                internal_data['annual_income'] = monthly * Decimal('12')
                logger.debug("LoanApplicationSerializer: Converted 'monthly_income' to 'annual_income'")
            except (ValueError, TypeError) as e:
                logger.error("LoanApplicationSerializer: Error converting monthly_income field (invalid format)")
        
        logger.debug(f"LoanApplicationSerializer.to_internal_value - Converted fields: {list(internal_data.keys())}")
        
        try:
            result = super().to_internal_value(internal_data)
            logger.debug(f"LoanApplicationSerializer.to_internal_value - Validation successful, processed fields: {list(result.keys())}")
            return result
        except Exception as e:
            logger.error(f"LoanApplicationSerializer.to_internal_value - Validation error (field: {getattr(e, 'field_name', 'unknown')})")
            raise
    
    def validate(self, data):
        """Remove frontend field names after validation."""
        logger.debug(f"LoanApplicationSerializer.validate - Processing fields: {list(data.keys())}")
        
        # Remove the frontend field names (they've been converted)
        data.pop('amount', None)
        data.pop('monthly_income', None)
        
        logger.debug(f"LoanApplicationSerializer.validate - Finalized fields: {list(data.keys())}")
        return data


class LoanPaymentSerializer(serializers.Serializer):
    """Serializer for loan payments."""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01')) 