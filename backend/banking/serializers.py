from rest_framework import serializers
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit, CardApplication, ExternalBankAccount, SavedBeneficiary


class VirtualCardSerializer(serializers.ModelSerializer):
    """Serializer for VirtualCard model."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    card_number_display = serializers.CharField(source='mask_card_number', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    expiry_date = serializers.CharField(read_only=True)
    
    class Meta:
        model = VirtualCard
        fields = [
            'id', 'user', 'user_email', 'user_name', 'card_number', 'card_number_display', 'cvv',
            'expiry_month', 'expiry_year', 'expiry_date', 'card_type', 'status',
            'daily_limit', 'monthly_limit', 'current_daily_spent', 'current_monthly_spent',
            'is_default', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['card_number', 'cvv', 'expiry_month', 'expiry_year', 'created_at', 'updated_at']


class VirtualCardCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating VirtualCard (admin only)."""
    
    class Meta:
        model = VirtualCard
        fields = [
            'user', 'card_type', 'daily_limit', 'monthly_limit', 'is_default'
        ]


class CardApplicationSerializer(serializers.ModelSerializer):
    """Serializer for CardApplication model."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    estimated_completion_days = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CardApplication
        fields = [
            'id', 'user', 'user_email', 'user_name', 'card_type', 'reason',
            'preferred_daily_limit', 'preferred_monthly_limit', 'status', 'status_display',
            'admin_notes', 'estimated_completion_date', 'estimated_completion_days',
            'processed_by', 'processed_by_name', 'processed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'admin_notes', 'estimated_completion_date', 'processed_by', 'processed_at', 'created_at', 'updated_at']


class CardApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating CardApplication."""
    
    class Meta:
        model = CardApplication
        fields = ['card_type', 'reason', 'preferred_daily_limit', 'preferred_monthly_limit']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransferSerializer(serializers.ModelSerializer):
    """Serializer for Transfer model."""
    
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    # Don't override recipient_name - use the model field directly for ACH/Wire transfers
    admin_approved_by_name = serializers.CharField(source='admin_approved_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Transfer
        fields = [
            'id', 'sender', 'sender_email', 'sender_name', 'recipient', 'recipient_name',
            'recipient_email', 'amount', 'currency', 'transfer_type', 'status',
            'reference_number', 'description', 'fee', 
            'requires_admin_approval', 'admin_approved', 'admin_approved_by', 
            'admin_approved_by_name', 'admin_approved_at', 'admin_notes',
            'scheduled_completion_time', 'completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'reference_number', 'admin_approved', 'admin_approved_by', 
            'admin_approved_at', 'scheduled_completion_time', 'completed_at', 
            'created_at', 'updated_at'
        ]


class TransferCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating transfers."""
    
    class Meta:
        model = Transfer
        fields = ['to_account', 'amount', 'currency', 'transfer_type', 'description']


class BankAccountSerializer(serializers.ModelSerializer):
    """Serializer for BankAccount model."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    account_number_display = serializers.CharField(source='mask_account_number', read_only=True)
    
    class Meta:
        model = BankAccount
        fields = [
            'id', 'user', 'user_email', 'account_name', 'account_type',
            'account_number', 'account_number_display', 'routing_number',
            'bank_name', 'is_verified', 'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['is_verified', 'created_at', 'updated_at']


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
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = DirectDeposit
        fields = [
            'id', 'user', 'user_email', 'employer_name', 'account_number',
            'routing_number', 'deposit_amount', 'frequency', 'status',
            'start_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DirectDepositCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating direct deposits."""
    
    class Meta:
        model = DirectDeposit
        fields = ['employer_name', 'account_number', 'routing_number', 'deposit_amount', 'frequency']


class ExternalBankAccountSerializer(serializers.ModelSerializer):
    """Serializer for ExternalBankAccount model."""
    
    account_number_display = serializers.CharField(source='mask_account_number', read_only=True)
    
    class Meta:
        model = ExternalBankAccount
        fields = [
            'id', 'user', 'account_holder_name', 'account_number', 'account_number_display',
            'routing_number', 'account_type', 'bank_name', 'bank_address', 'nickname',
            'is_verified', 'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'is_verified', 'created_at', 'updated_at']


class SavedBeneficiarySerializer(serializers.ModelSerializer):
    """Serializer for SavedBeneficiary model."""
    
    class Meta:
        model = SavedBeneficiary
        fields = [
            'id', 'user', 'nickname', 'transfer_type', 'recipient_name',
            'account_number', 'routing_number', 'account_type',
            'iban', 'swift_code', 'bank_name', 'bank_address',
            'last_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'last_used', 'created_at', 'updated_at']


class ACHTransferSerializer(serializers.Serializer):
    """Serializer for ACH transfer requests."""
    
    recipient_account_id = serializers.IntegerField(required=False, allow_null=True)
    recipient_name = serializers.CharField(max_length=200)
    account_number = serializers.CharField(max_length=20)
    routing_number = serializers.CharField(max_length=9)
    bank_name = serializers.CharField(max_length=200)
    account_type = serializers.ChoiceField(choices=['checking', 'savings'])
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01, max_value=50000)
    description = serializers.CharField(max_length=200)
    save_recipient = serializers.BooleanField(default=False)
    recipient_nickname = serializers.CharField(max_length=100, required=False, allow_blank=True)


class WireTransferSerializer(serializers.Serializer):
    """Serializer for wire transfer requests."""
    
    recipient_name = serializers.CharField(max_length=200)
    account_number = serializers.CharField(max_length=20)
    routing_number = serializers.CharField(max_length=9)
    bank_name = serializers.CharField(max_length=200)
    bank_address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01, max_value=100000)
    description = serializers.CharField(max_length=200)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    save_recipient = serializers.BooleanField(default=False)
    recipient_nickname = serializers.CharField(max_length=100, required=False, allow_blank=True)


class InternationalWireTransferSerializer(serializers.Serializer):
    """Serializer for international wire transfer requests."""
    
    recipient_name = serializers.CharField(max_length=200)
    recipient_address = serializers.CharField(max_length=500)
    recipient_city = serializers.CharField(max_length=100)
    recipient_country = serializers.CharField(max_length=100)
    iban = serializers.CharField(max_length=34, required=False, allow_blank=True)
    swift_code = serializers.CharField(max_length=11)
    bank_name = serializers.CharField(max_length=200)
    bank_address = serializers.CharField(max_length=500)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01, max_value=250000)
    currency = serializers.CharField(max_length=3, default='USD')
    description = serializers.CharField(max_length=200)
    purpose = serializers.CharField(max_length=200)
    save_recipient = serializers.BooleanField(default=False)
    recipient_nickname = serializers.CharField(max_length=100, required=False, allow_blank=True)


class BankLookupSerializer(serializers.Serializer):
    """Serializer for bank routing number lookup."""
    
    routing_number = serializers.CharField(max_length=9, min_length=9) 