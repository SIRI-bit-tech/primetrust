from rest_framework import serializers
from .models import BitcoinWallet, IncomingBitcoinTransaction


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