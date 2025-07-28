from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from .models import BitcoinWallet, IncomingBitcoinTransaction
from .serializers import (
    BitcoinWalletSerializer, BitcoinWalletCreateSerializer,
    IncomingBitcoinTransactionSerializer, IncomingBitcoinTransactionCreateSerializer,
    IncomingBitcoinTransactionUpdateSerializer
)


class BitcoinWalletViewSet(viewsets.ModelViewSet):
    """ViewSet for Bitcoin wallet operations"""
    serializer_class = BitcoinWalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return wallet for the current user"""
        return BitcoinWallet.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return BitcoinWalletCreateSerializer
        return BitcoinWalletSerializer

    def perform_create(self, serializer):
        """Set the user when creating a wallet"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_wallet(self, request):
        """Get current user's Bitcoin wallet"""
        try:
            wallet = BitcoinWallet.objects.get(user=request.user)
            serializer = self.get_serializer(wallet)
            return Response(serializer.data)
        except BitcoinWallet.DoesNotExist:
            return Response(
                {'detail': 'Bitcoin wallet not found. Please contact admin to set up your wallet.'},
                status=status.HTTP_404_NOT_FOUND
            )


class IncomingBitcoinTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for incoming Bitcoin transactions"""
    serializer_class = IncomingBitcoinTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return transactions for the current user"""
        return IncomingBitcoinTransaction.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return IncomingBitcoinTransactionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return IncomingBitcoinTransactionUpdateSerializer
        return IncomingBitcoinTransactionSerializer

    @action(detail=False, methods=['get'])
    def my_transactions(self, request):
        """Get current user's incoming Bitcoin transactions"""
        transactions = self.get_queryset()
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark transaction as completed (admin only)"""
        transaction = self.get_object()
        
        if transaction.mark_as_completed():
            serializer = self.get_serializer(transaction)
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Transaction cannot be marked as completed. Insufficient confirmations.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminBitcoinWalletViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for managing Bitcoin wallets and transactions"""
    serializer_class = BitcoinWalletSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Return all wallets for admin"""
        return BitcoinWallet.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return BitcoinWalletCreateSerializer
        return BitcoinWalletSerializer

    @action(detail=True, methods=['post'])
    def update_wallet(self, request, pk=None):
        """Update user's Bitcoin wallet"""
        wallet = self.get_object()
        serializer = BitcoinWalletCreateSerializer(wallet, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminIncomingBitcoinTransactionViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for managing incoming Bitcoin transactions"""
    serializer_class = IncomingBitcoinTransactionSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Return all transactions for admin"""
        return IncomingBitcoinTransaction.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return IncomingBitcoinTransactionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return IncomingBitcoinTransactionUpdateSerializer
        return IncomingBitcoinTransactionSerializer

    def perform_create(self, serializer):
        """Create transaction and send notification"""
        transaction = serializer.save()
        
        # Send notification to user about incoming transaction
        from api.models import UserNotification
        UserNotification.objects.create(
            user=transaction.user,
            title="Incoming Bitcoin Transaction",
            message=f"You have received {transaction.amount_btc} BTC (${transaction.amount_usd}) from {transaction.sender_address}",
            notification_type="bitcoin_transaction",
            data={
                'transaction_id': transaction.id,
                'amount_btc': str(transaction.amount_btc),
                'amount_usd': str(transaction.amount_usd),
                'sender_address': transaction.sender_address,
                'status': transaction.status
            }
        )

    @action(detail=True, methods=['post'])
    def approve_transaction(self, request, pk=None):
        """Manually approve a transaction"""
        transaction = self.get_object()
        transaction.is_manually_approved = True
        transaction.status = 'confirmed'
        transaction.confirmation_count = transaction.required_confirmations
        transaction.save()
        
        serializer = self.get_serializer(transaction)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete_transaction(self, request, pk=None):
        """Mark transaction as completed"""
        transaction = self.get_object()
        
        if transaction.mark_as_completed():
            serializer = self.get_serializer(transaction)
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Transaction cannot be completed. Insufficient confirmations.'},
                status=status.HTTP_400_BAD_REQUEST
            ) 