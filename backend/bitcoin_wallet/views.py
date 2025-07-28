from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
import requests
import threading
import time
from .models import BitcoinWallet, IncomingBitcoinTransaction, CurrencySwap
from .serializers import (
    BitcoinWalletSerializer, BitcoinWalletCreateSerializer,
    IncomingBitcoinTransactionSerializer, IncomingBitcoinTransactionCreateSerializer,
    IncomingBitcoinTransactionUpdateSerializer, CurrencySwapSerializer, CurrencySwapCreateSerializer
)

class BitcoinWalletViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BitcoinWallet.objects.all()
    serializer_class = BitcoinWalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='my_wallet')
    def my_wallet(self, request):
        wallet = get_object_or_404(BitcoinWallet, user=request.user)
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)

class IncomingBitcoinTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IncomingBitcoinTransaction.objects.all()
    serializer_class = IncomingBitcoinTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='my_transactions')
    def my_transactions(self, request):
        transactions = self.get_queryset()
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)

class CurrencySwapViewSet(viewsets.ModelViewSet):
    queryset = CurrencySwap.objects.all()
    serializer_class = CurrencySwapSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return CurrencySwapCreateSerializer
        return CurrencySwapSerializer

    @action(detail=False, methods=['get'], url_path='my_swaps')
    def my_swaps(self, request):
        swaps = self.get_queryset()
        serializer = self.get_serializer(swaps, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='create_swap')
    def create_swap(self, request):
        """Create a new currency swap with 3-minute processing time"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            swap = serializer.save()
            
            # Start processing after 3 minutes
            def process_swap_delayed():
                time.sleep(180)  # 3 minutes
                swap.status = 'processing'
                swap.save()
                
                # Process the actual swap
                if swap.process_swap():
                    swap.status = 'completed'
                else:
                    swap.status = 'failed'
                swap.save()
            
            # Run in background thread
            thread = threading.Thread(target=process_swap_delayed)
            thread.daemon = True
            thread.start()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='exchange_rate')
    def get_exchange_rate(self, request):
        """Get real-time Bitcoin to USD exchange rate"""
        # Check cache first
        cache_key = 'btc_usd_exchange_rate'
        cached_rate = cache.get(cache_key)
        
        if cached_rate:
            return Response({'exchange_rate': cached_rate})
        
        try:
            # Fetch from CoinGecko API
            response = requests.get(
                'https://api.coingecko.com/api/v3/simple/price',
                params={
                    'ids': 'bitcoin',
                    'vs_currencies': 'usd'
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            exchange_rate = data['bitcoin']['usd']
            
            # Cache for 30 seconds
            cache.set(cache_key, exchange_rate, 30)
            
            return Response({'exchange_rate': exchange_rate})
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch exchange rate'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminBitcoinWalletViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for managing Bitcoin wallets and transactions"""
    serializer_class = BitcoinWalletSerializer
    queryset = BitcoinWallet.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return BitcoinWalletCreateSerializer
        return BitcoinWalletSerializer

class AdminIncomingBitcoinTransactionViewSet(viewsets.ModelViewSet):
    queryset = IncomingBitcoinTransaction.objects.all()
    serializer_class = IncomingBitcoinTransactionSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return IncomingBitcoinTransactionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return IncomingBitcoinTransactionUpdateSerializer
        return IncomingBitcoinTransactionSerializer

    @action(detail=True, methods=['post'])
    def mark_as_confirmed(self, request, pk=None):
        transaction = self.get_object()
        transaction.status = 'confirmed'
        transaction.save()
        # TODO: Trigger notification to user
        return Response({'status': 'transaction marked as confirmed'})

    @action(detail=True, methods=['post'])
    def mark_as_completed(self, request, pk=None):
        transaction = self.get_object()
        if transaction.mark_as_completed():
            # TODO: Trigger notification to user
            return Response({'status': 'transaction marked as completed and balance updated'})
        return Response(
            {'detail': 'Transaction cannot be completed. Insufficient confirmations.'},
            status=status.HTTP_400_BAD_REQUEST
        )

class AdminCurrencySwapViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for managing currency swaps"""
    queryset = CurrencySwap.objects.all()
    serializer_class = CurrencySwapSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def process_swap(self, request, pk=None):
        """Manually process a swap"""
        swap = self.get_object()
        if swap.process_swap():
            return Response({'status': 'swap processed successfully'})
        return Response(
            {'detail': 'Failed to process swap'},
            status=status.HTTP_400_BAD_REQUEST
        ) 