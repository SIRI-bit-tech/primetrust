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
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    recipient_name = serializers.SerializerMethodField()
    recipient_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Transfer
        fields = '__all__'
        
    def get_sender_name(self, obj):
        return f"{obj.sender.first_name or ''} {obj.sender.last_name or ''}".strip()
        
    def get_recipient_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name or ''} {obj.recipient.last_name or ''}".strip()
        return obj.recipient_name
        
    def get_recipient_email(self, obj):
        if obj.recipient:
            return obj.recipient.email
        return obj.recipient_email


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
        fields = ['id', 'card_type', 'reason', 'preferred_daily_limit', 'preferred_monthly_limit', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


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
    
    def validate_routing_number(self, value):
        from .transfer_services import BankLookupService
        result = BankLookupService.validate_routing_number(value)
        if not result['is_valid']:
            raise serializers.ValidationError(result['message'])
        return value


class WireTransferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    recipient_name = serializers.CharField()
    account_number = serializers.CharField()
    routing_number = serializers.CharField()
    bank_name = serializers.CharField()
    description = serializers.CharField(required=False)

    def validate_routing_number(self, value):
        from .transfer_services import BankLookupService
        result = BankLookupService.validate_routing_number(value)
        if not result['is_valid']:
            raise serializers.ValidationError(result['message'])
        return value


class InternationalWireTransferSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    recipient_name = serializers.CharField()
    swift_code = serializers.CharField()
    iban = serializers.CharField(required=False)
    bank_name = serializers.CharField()
    description = serializers.CharField(required=False)

    def validate_routing_number(self, value):
        if not value or value.strip() == "":
            return value
        from .transfer_services import BankLookupService
        result = BankLookupService.validate_routing_number(value)
        if not result['is_valid']:
            raise serializers.ValidationError(result['message'])
        return value


class BankLookupSerializer(serializers.Serializer):
    routing_number = serializers.CharField()
