from rest_framework import serializers
from .models import BitcoinWallet, IncomingBitcoinTransaction, CurrencySwap


class BitcoinWalletSerializer(serializers.ModelSerializer):
    """Serializer for Bitcoin wallet information"""
    user = serializers.ReadOnlyField(source='user.username')
    qr_code_url = serializers.SerializerMethodField()
    
    class Meta:
        model = BitcoinWallet
        fields = [
            'id', 'user', 'wallet_address', 'qr_code_url', 
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_qr_code_url(self, obj):
        """Get the URL for the QR code image"""
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None


class BitcoinWalletCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Bitcoin wallet"""
    
    class Meta:
        model = BitcoinWallet
        fields = ['wallet_address', 'qr_code', 'is_active']


class IncomingBitcoinTransactionSerializer(serializers.ModelSerializer):
    """Serializer for incoming Bitcoin transactions"""
    user = serializers.ReadOnlyField(source='user.username')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = IncomingBitcoinTransaction
        fields = [
            'id', 'user', 'transaction_hash', 'amount_btc', 'amount_usd',
            'sender_address', 'status', 'status_display', 'confirmation_count',
            'required_confirmations', 'block_height', 'created_at', 'updated_at',
            'completed_at', 'admin_notes', 'is_manually_approved'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at', 'completed_at',
            'admin_notes', 'is_manually_approved'
        ]


class IncomingBitcoinTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating incoming Bitcoin transactions (admin only)"""
    
    class Meta:
        model = IncomingBitcoinTransaction
        fields = [
            'user', 'transaction_hash', 'amount_btc', 'amount_usd',
            'sender_address', 'confirmation_count', 'block_height',
            'admin_notes', 'is_manually_approved'
        ]


class IncomingBitcoinTransactionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating incoming Bitcoin transactions (admin only)"""
    
    class Meta:
        model = IncomingBitcoinTransaction
        fields = [
            'status', 'confirmation_count', 'block_height',
            'admin_notes', 'is_manually_approved'
        ]

class CurrencySwapSerializer(serializers.ModelSerializer):
    swap_type_display = serializers.CharField(source='get_swap_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = CurrencySwap
        fields = [
            'id', 'user', 'swap_type', 'swap_type_display', 'amount_from', 
            'amount_to', 'exchange_rate', 'status', 'status_display',
            'created_at', 'updated_at', 'completed_at', 'transaction_id'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'transaction_id']

class CurrencySwapCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurrencySwap
        fields = ['swap_type', 'amount_from', 'amount_to', 'exchange_rate']
        read_only_fields = ['user']

    def validate(self, data):
        user = self.context['request'].user
        
        # Validate amount is positive
        if data['amount_from'] <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        
        # Validate user has sufficient balance
        if data['swap_type'] == 'usd_to_btc':
            if user.balance < data['amount_from']:
                raise serializers.ValidationError("Insufficient USD balance")
        elif data['swap_type'] == 'btc_to_usd':
            # Handle case where bitcoin_balance might be None or not properly initialized
            bitcoin_balance = user.bitcoin_balance or 0
            if bitcoin_balance < data['amount_from']:
                raise serializers.ValidationError("Insufficient Bitcoin balance")
        
        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)