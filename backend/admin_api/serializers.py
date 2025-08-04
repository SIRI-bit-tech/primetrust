from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models import SecurityAuditLog
from transactions.models import Transaction, Loan, Bill, Investment, CurrencySwap, BitcoinTransaction
from banking.models import VirtualCard, CardApplication, Transfer
from api.models import Notification, SystemStatus

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'is_active',
            'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'balance', 'bitcoin_balance', 'two_factor_setup_completed',
            'transfer_pin_setup_completed'
        ]


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'user_name', 'transaction_type', 'amount',
            'currency', 'status', 'description', 'created_at'
        ]


class VirtualCardSerializer(serializers.ModelSerializer):
    """Serializer for VirtualCard model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = VirtualCard
        fields = [
            'id', 'user', 'user_name', 'card_number', 'card_type',
            'status', 'balance', 'created_at'
        ]


class CardApplicationSerializer(serializers.ModelSerializer):
    """Serializer for CardApplication model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = CardApplication
        fields = [
            'id', 'user', 'user_name', 'card_type', 'status',
            'created_at', 'approved_at'
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
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Loan
        fields = [
            'id', 'user', 'user_name', 'amount', 'interest_rate',
            'term_months', 'status', 'purpose', 'created_at',
            'approved_at', 'disbursed_at'
        ]


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
    
    class Meta:
        model = Investment
        fields = [
            'id', 'user', 'user_name', 'investment_type', 'amount',
            'status', 'return_rate', 'created_at'
        ]


class CurrencySwapSerializer(serializers.ModelSerializer):
    """Serializer for CurrencySwap model."""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = CurrencySwap
        fields = [
            'id', 'user', 'user_name', 'currency_from', 'currency_to',
            'amount_from', 'amount_to', 'exchange_rate', 'status',
            'created_at'
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