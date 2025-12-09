from rest_framework import serializers
from .models import CheckDeposit, Transfer, BankAccount, DirectDeposit, ExternalBankAccount, SavedBeneficiary, CardApplication, VirtualCard


class CheckDepositSerializer(serializers.ModelSerializer):
    """Serializer for CheckDeposit model."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    admin_approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CheckDeposit
        fields = [
            'id', 'user', 'user_email', 'user_name', 'check_number', 'amount',
            'front_image', 'back_image', 'payer_name', 'memo',
            'ocr_amount', 'ocr_check_number', 'ocr_confidence',
            'status', 'status_display', 'admin_notes', 'hold_until',
            'admin_approved_by', 'admin_approved_by_name', 'admin_approved_at',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['user', 'ocr_amount', 'ocr_check_number', 'ocr_confidence', 'status']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    
    def get_admin_approved_by_name(self, obj):
        if obj.admin_approved_by:
            return f"{obj.admin_approved_by.first_name} {obj.admin_approved_by.last_name}".strip()
        return None


class CheckDepositCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating check deposits."""
    
    class Meta:
        model = CheckDeposit
        fields = ['check_number', 'amount', 'front_image', 'back_image', 'payer_name', 'memo']
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        if value > 10000:  # Max check amount
            raise serializers.ValidationError("Check amount cannot exceed $10,000")
        return value


# Stub serializers for existing models (to be expanded)
class TransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = '__all__'


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = '__all__'


class DirectDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectDeposit
        fields = '__all__'


class ExternalBankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalBankAccount
        fields = '__all__'


class SavedBeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedBeneficiary
        fields = '__all__'


class CardApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardApplication
        fields = ['card_type', 'reason', 'preferred_daily_limit', 'preferred_monthly_limit']


class VirtualCardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VirtualCard
        fields = '__all__'


class ACHTransferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    recipient_name = serializers.CharField()
    account_number = serializers.CharField()
    routing_number = serializers.CharField()
    description = serializers.CharField(required=False)


class WireTransferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    recipient_name = serializers.CharField()
    account_number = serializers.CharField()
    routing_number = serializers.CharField()
    bank_name = serializers.CharField()
    description = serializers.CharField(required=False)


class InternationalWireTransferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    recipient_name = serializers.CharField()
    swift_code = serializers.CharField()
    iban = serializers.CharField(required=False)
    bank_name = serializers.CharField()
    description = serializers.CharField(required=False)


class BankLookupSerializer(serializers.Serializer):
    routing_number = serializers.CharField()
