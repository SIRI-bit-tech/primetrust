from rest_framework import serializers
from .models import Transaction, Bill, Investment
from decimal import Decimal, InvalidOperation


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
            'id', 'investment_type', 'name', 'symbol', 'balance_source',
            'quantity', 'price_per_unit', 'amount_invested', 'current_price_per_unit',
            'current_value', 'profit_loss', 'profit_loss_percentage',
            'status', 'created_at', 'last_updated', 'sold_at'
        ]
        read_only_fields = [
            'id', 'current_price_per_unit', 'current_value', 'profit_loss',
            'profit_loss_percentage', 'created_at', 'last_updated', 'sold_at'
        ]


class InvestmentPurchaseSerializer(serializers.ModelSerializer):
    """Serializer for purchasing investments."""
    
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, write_only=True, required=False)
    
    class Meta:
        model = Investment
        fields = [
            'investment_type', 'name', 'symbol', 'balance_source',
            'amount', 'quantity'
        ]
    
    def validate(self, data):
        """Validate investment purchase data."""
        # Calculate amount_invested and price_per_unit
        amount = data.pop('amount', None)
        quantity = data.get('quantity', 1)
        
        # Validate amount
        if not amount:
            raise serializers.ValidationError("Amount is required")
        
        if amount < 100:
            raise serializers.ValidationError("Minimum investment amount is $100")
        
        # Validate quantity
        if quantity is None:
            raise serializers.ValidationError("Quantity is required")
        
        try:
            quantity_decimal = Decimal(str(quantity))
        except (ValueError, TypeError, InvalidOperation):
            raise serializers.ValidationError("Quantity must be a valid number")
        
        if quantity_decimal <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero")
        
        # Calculate price per unit using safe Decimal arithmetic
        data['amount_invested'] = amount
        data['price_per_unit'] = Decimal(str(amount)) / quantity_decimal
        
        return data
    
    def create(self, validated_data):
        """Create investment and process purchase."""
        investment = Investment.objects.create(**validated_data, status='pending')
        success, message = investment.purchase_investment()
        
        if not success:
            investment.delete()
            raise serializers.ValidationError(message)
        
        return investment


class InvestmentSellSerializer(serializers.Serializer):
    """Serializer for selling investments."""
    
    quantity = serializers.DecimalField(max_digits=15, decimal_places=8, required=False, allow_null=True) 