from rest_framework import serializers
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit


class VirtualCardSerializer(serializers.ModelSerializer):
    """Serializer for VirtualCard model."""
    
    class Meta:
        model = VirtualCard
        fields = [
            'id', 'card_number', 'card_type', 'status', 'balance', 'daily_limit',
            'monthly_limit', 'expiry_date', 'cvv', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'card_number', 'cvv', 'created_at', 'updated_at']


class VirtualCardCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating virtual cards."""
    
    class Meta:
        model = VirtualCard
        fields = ['card_type', 'daily_limit', 'monthly_limit']


class TransferSerializer(serializers.ModelSerializer):
    """Serializer for Transfer model."""
    
    class Meta:
        model = Transfer
        fields = [
            'id', 'from_account', 'to_account', 'amount', 'currency', 'status',
            'transfer_type', 'reference_number', 'description', 'fee', 'created_at',
            'completed_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reference_number', 'fee', 'created_at', 'completed_at', 'updated_at']


class TransferCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating transfers."""
    
    class Meta:
        model = Transfer
        fields = ['to_account', 'amount', 'currency', 'transfer_type', 'description']


class BankAccountSerializer(serializers.ModelSerializer):
    """Serializer for BankAccount model."""
    
    class Meta:
        model = BankAccount
        fields = [
            'id', 'account_number', 'account_type', 'bank_name', 'routing_number',
            'balance', 'currency', 'status', 'is_primary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'account_number', 'created_at', 'updated_at']


class BankAccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bank accounts."""
    
    class Meta:
        model = BankAccount
        fields = ['account_type', 'bank_name', 'routing_number', 'currency']


class TransferStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating transfer status."""
    status = serializers.ChoiceField(choices=Transfer.TRANSFER_STATUS)


class DirectDepositSerializer(serializers.ModelSerializer):
    """Serializer for DirectDeposit model."""
    
    class Meta:
        model = DirectDeposit
        fields = [
            'id', 'employer_name', 'account_number', 'routing_number', 'amount',
            'frequency', 'status', 'next_deposit_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DirectDepositCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating direct deposits."""
    
    class Meta:
        model = DirectDeposit
        fields = ['employer_name', 'account_number', 'routing_number', 'amount', 'frequency'] 