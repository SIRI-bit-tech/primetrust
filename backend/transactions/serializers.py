from rest_framework import serializers
from .models import Transaction, Bill, Investment


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_type', 'amount', 'currency', 'status',
            'reference_number', 'description', 'merchant_name', 'merchant_category',
            'location', 'balance_before', 'balance_after', 'created_at',
            'completed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reference_number', 'balance_before', 'balance_after', 'created_at', 'completed_at', 'updated_at']


class BillSerializer(serializers.ModelSerializer):
    """Serializer for Bill model."""
    
    class Meta:
        model = Bill
        fields = [
            'id', 'biller_name', 'biller_category', 'account_number',
            'amount', 'due_date', 'status', 'is_recurring', 'recurring_frequency',
            'next_due_date', 'paid_at', 'paid_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'paid_at', 'paid_amount', 'created_at', 'updated_at']


class BillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bills."""
    
    class Meta:
        model = Bill
        fields = [
            'biller_name', 'biller_category', 'account_number',
            'amount', 'due_date', 'is_recurring', 'recurring_frequency'
        ]


class InvestmentSerializer(serializers.ModelSerializer):
    """Serializer for Investment model."""
    
    class Meta:
        model = Investment
        fields = [
            'id', 'investment_type', 'action', 'symbol', 'company_name',
            'quantity', 'price_per_share', 'total_amount', 'currency',
            'status', 'created_at', 'completed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at', 'updated_at']


class InvestmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating investments."""
    
    class Meta:
        model = Investment
        fields = [
            'investment_type', 'action', 'symbol', 'company_name',
            'quantity', 'price_per_share', 'total_amount', 'currency'
        ] 