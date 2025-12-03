from rest_framework import serializers
from .models import BitcoinWallet, IncomingBitcoinTransaction, OutgoingBitcoinTransaction, CurrencySwap


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

class OutgoingBitcoinTransactionSerializer(serializers.ModelSerializer):
    """Serializer for outgoing Bitcoin transactions"""
    user = serializers.ReadOnlyField(source='user.username')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    balance_source_display = serializers.CharField(source='get_balance_source_display', read_only=True)
    
    class Meta:
        model = OutgoingBitcoinTransaction
        fields = [
            'id', 'user', 'balance_source', 'balance_source_display',
            'recipient_wallet_address', 'amount_btc', 'amount_usd',
            'bitcoin_price_at_time', 'transaction_fee', 'transaction_hash',
            'status', 'status_display', 'created_at', 'updated_at',
            'completed_at', 'admin_notes'
        ]
        read_only_fields = [
            'id', 'user', 'transaction_hash', 'status', 'created_at',
            'updated_at', 'completed_at', 'admin_notes'
        ]


class OutgoingBitcoinTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating outgoing Bitcoin transactions"""
    
    class Meta:
        model = OutgoingBitcoinTransaction
        fields = [
            'balance_source', 'recipient_wallet_address', 'amount_btc',
            'amount_usd', 'bitcoin_price_at_time', 'transaction_fee'
        ]

    def validate(self, data):
        from decimal import Decimal
        
        user = self.context['request'].user
        balance_source = data.get('balance_source')
        amount_btc = data.get('amount_btc')
        amount_usd = data.get('amount_usd')
        
        # Get transaction_fee as Decimal to avoid type mismatch
        if 'transaction_fee' not in data or data['transaction_fee'] is None:
            default_fee = OutgoingBitcoinTransaction._meta.get_field('transaction_fee').default
            transaction_fee = default_fee if default_fee is not None else Decimal('0.00001')
        else:
            transaction_fee = data['transaction_fee']
        
        # Validate amount is positive
        if amount_btc <= 0:
            raise serializers.ValidationError("Bitcoin amount must be greater than zero")
        
        # Validate user has sufficient balance
        if balance_source == 'fiat':
            if not amount_usd or amount_usd <= 0:
                raise serializers.ValidationError("USD amount is required when paying from fiat balance")
            if user.balance < amount_usd:
                raise serializers.ValidationError("Insufficient fiat balance")
        elif balance_source == 'bitcoin':
            bitcoin_balance = user.bitcoin_balance or Decimal('0')
            total_btc_needed = amount_btc + transaction_fee
            if bitcoin_balance < total_btc_needed:
                raise serializers.ValidationError(f"Insufficient Bitcoin balance. Need {total_btc_needed} BTC (including fee)")
        
        # Validate recipient address
        recipient_address = data.get('recipient_wallet_address', '')
        if len(recipient_address) < 26 or len(recipient_address) > 62:
            raise serializers.ValidationError("Invalid Bitcoin address format")
        
        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


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