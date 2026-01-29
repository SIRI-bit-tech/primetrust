from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models import SecurityAuditLog
from transactions.models import Transaction, Bill, Investment, BitcoinTransaction
from loans.models import Loan as AppLoan
from banking.models import VirtualCard, CardApplication, Transfer, CheckDeposit
from api.models import Notification, SystemStatus
from bitcoin_wallet.models import CurrencySwap

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'is_active',
            'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'balance', 'bitcoin_balance', 'bitcoin_wallet_address', 
            'bitcoin_qr_code', 'profile_image_url',
            'two_factor_setup_completed',
            'transfer_pin_setup_completed', 'account_locked_until', 
            'account_lock_reason', 'unlock_request_pending',
            'unlock_request_submitted_at', 'unlock_request_message'
        ]


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""
    
    user_name = serializers.SerializerMethodField()
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_name', 'transaction_type', 'amount',
            'currency', 'status', 'description', 'created_at'
        ]


class VirtualCardSerializer(serializers.ModelSerializer):
    """Serializer for VirtualCard model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    card_number_display = serializers.SerializerMethodField()
    has_cvv = serializers.SerializerMethodField()
    
    class Meta:
        model = VirtualCard
        fields = [
            'id', 'user', 'user_name', 'card_number', 'card_number_display', 'card_type',
            'status', 'has_cvv', 'expiry_month', 'expiry_year', 
            'daily_limit', 'monthly_limit', 'current_daily_spent', 'current_monthly_spent',
            'created_at'
        ]
    
    def get_card_number_display(self, obj):
        """Return masked card number for display."""
        return obj.mask_card_number()
        
    def get_has_cvv(self, obj):
        """Return true if CVV exists."""
        return bool(obj.cvv)


class CardApplicationSerializer(serializers.ModelSerializer):
    """Serializer for CardApplication model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    estimated_completion_days = serializers.IntegerField(source='get_estimated_completion_days', read_only=True)
    
    class Meta:
        model = CardApplication
        fields = [
            'id', 'user', 'user_name', 'card_type', 'status',
            'reason', 'preferred_daily_limit', 'preferred_monthly_limit',
            'admin_notes', 'estimated_completion_days',
            'created_at', 'processed_at'
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_name', 'notification_type', 'priority',
            'title', 'message', 'is_read', 'is_sent', 'created_at'
        ]


class SystemStatusSerializer(serializers.ModelSerializer):
    """Serializer for SystemStatus model."""
    
    class Meta:
        model = SystemStatus
        fields = [
            'id', 'component', 'status', 'message', 'response_time',
            'uptime_percentage', 'error_count', 'request_count',
            'last_check', 'created_at'
        ]


class LoanSerializer(serializers.ModelSerializer):
    """Serializer for Loan model."""
    
    user = serializers.SerializerMethodField(read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AppLoan
        fields = [
            'id', 'user', 'user_name', 'loan_type', 'amount', 'interest_rate',
            'term_months', 'status', 'purpose', 'monthly_payment', 'remaining_balance',
            'next_payment_date', 'approval_date', 'start_date', 'created_at'
        ]
    
    def get_user(self, obj):
        """Return user object with email and username."""
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email
        }


class BillSerializer(serializers.ModelSerializer):
    """Serializer for Bill model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'id', 'user', 'user_name', 'bill_type', 'amount',
            'due_date', 'status', 'description', 'created_at'
        ]


class InvestmentSerializer(serializers.ModelSerializer):
    """Serializer for Investment model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Investment
        fields = [
            'id', 'user', 'user_name', 'user_email', 'investment_type', 'name', 'symbol',
            'balance_source', 'quantity', 'price_per_unit', 'amount_invested',
            'current_price_per_unit', 'current_value', 'profit_loss', 'profit_loss_percentage',
            'status', 'created_at', 'last_updated', 'sold_at'
        ]


class CurrencySwapSerializer(serializers.ModelSerializer):
    """Serializer for CurrencySwap model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    swap_type_display = serializers.CharField(source='get_swap_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CurrencySwap
        fields = [
            'id', 'user', 'user_name', 'swap_type', 'swap_type_display',
            'amount_from', 'amount_to', 'exchange_rate', 'status', 'status_display',
            'created_at', 'completed_at', 'transaction_id'
        ]


class BitcoinTransactionSerializer(serializers.ModelSerializer):
    """Serializer for BitcoinTransaction model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = BitcoinTransaction
        fields = [
            'id', 'user', 'user_name', 'transaction_type', 'amount',
            'bitcoin_address', 'status', 'confirmations', 'created_at'
        ]


class SecurityAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for SecurityAuditLog model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = SecurityAuditLog
        fields = [
            'id', 'user', 'user_name', 'event_type', 'description',
            'ip_address', 'user_agent', 'created_at'
        ] 



class CheckDepositSerializer(serializers.ModelSerializer):
    """Serializer for CheckDeposit model (admin view)."""
    
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    admin_approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CheckDeposit
        fields = [
            'id', 'user', 'user_name', 'user_email', 'check_number', 'amount',
            'front_image', 'back_image', 'payer_name', 'memo',
            'ocr_amount', 'ocr_check_number', 'ocr_confidence',
            'status', 'status_display', 'admin_notes', 'hold_until',
            'admin_approved_by', 'admin_approved_by_name', 'admin_approved_at',
            'created_at', 'updated_at', 'completed_at'
        ]
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_admin_approved_by_name(self, obj):
        if obj.admin_approved_by:
            return f"{obj.admin_approved_by.first_name} {obj.admin_approved_by.last_name}".strip() or obj.admin_approved_by.email
        return None
