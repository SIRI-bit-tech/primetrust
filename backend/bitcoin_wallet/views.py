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
from .models import BitcoinWallet, IncomingBitcoinTransaction, OutgoingBitcoinTransaction, CurrencySwap
from .serializers import (
    BitcoinWalletSerializer, BitcoinWalletCreateSerializer,
    IncomingBitcoinTransactionSerializer, IncomingBitcoinTransactionCreateSerializer,
    IncomingBitcoinTransactionUpdateSerializer, OutgoingBitcoinTransactionSerializer,
    OutgoingBitcoinTransactionCreateSerializer, CurrencySwapSerializer, CurrencySwapCreateSerializer
)

class BitcoinWalletViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BitcoinWallet.objects.all()
    serializer_class = BitcoinWalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='my_wallet')
    def my_wallet(self, request):
        wallet, created = BitcoinWallet.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='bitcoin_balance')
    def get_bitcoin_balance(self, request):
        """Get the current user's Bitcoin balance"""
        user = request.user
        bitcoin_balance = user.bitcoin_balance or 0
        return Response({
            'bitcoin_balance': str(bitcoin_balance),
            'bitcoin_balance_usd': float(bitcoin_balance) * float(request.GET.get('exchange_rate', 0))
        })

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

class OutgoingBitcoinTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for sending Bitcoin"""
    queryset = OutgoingBitcoinTransaction.objects.all()
    serializer_class = OutgoingBitcoinTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'send_bitcoin']:
            return OutgoingBitcoinTransactionCreateSerializer
        return OutgoingBitcoinTransactionSerializer

    @action(detail=False, methods=['post'], url_path='send')
    def send_bitcoin(self, request):
        """Send Bitcoin to a recipient address"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            transaction = serializer.save()
            
            # Process the transaction
            if transaction.process_transaction():
                response_serializer = OutgoingBitcoinTransactionSerializer(transaction)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'Transaction failed', 'details': transaction.admin_notes},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my_transactions')
    def my_transactions(self, request):
        """Get all outgoing transactions for the current user"""
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
        if self.action in ['create', 'create_swap']:
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
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            swap = serializer.save()
            
            # Start processing after 30 seconds
            def process_swap_delayed():
                time.sleep(30)  # 30 seconds
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
        """Get real-time Bitcoin to USD exchange rate from multiple sources"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Check cache first
        cache_key = 'btc_usd_exchange_rate'
        cached_rate = cache.get(cache_key)
        
        if cached_rate:
            return Response({'exchange_rate': cached_rate})
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        exchange_rate = None
        errors = []

        # 1. Try CoinGecko
        try:
            response = requests.get(
                'https://api.coingecko.com/api/v3/simple/price',
                params={'ids': 'bitcoin', 'vs_currencies': 'usd'},
                headers=headers,
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                exchange_rate = data['bitcoin']['usd']
        except Exception as e:
            errors.append(f"CoinGecko: {str(e)}")

        # 2. Try Binance (if CoinGecko failed)
        if exchange_rate is None:
            try:
                response = requests.get(
                    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    exchange_rate = float(data['price'])
            except Exception as e:
                errors.append(f"Binance: {str(e)}")
        
        # 3. Try CoinCap (if others failed)
        if exchange_rate is None:
            try:
                response = requests.get(
                    'https://api.coincap.io/v2/assets/bitcoin',
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    exchange_rate = float(data['data']['priceUsd'])
            except Exception as e:
                errors.append(f"CoinCap: {str(e)}")

        if exchange_rate:
            # Cache for 60 seconds (slightly longer to reduce API load)
            cache.set(cache_key, exchange_rate, 60)
            return Response({'exchange_rate': exchange_rate})
        
        # Log all errors
        logger.error(f"Failed to fetch BTC exchange rate. Errors: {errors}")
        
        # Return a fallback or 503 if critical
        # Using a reliable fallback price if all APIs fail is safer than crashing
        # This prevents the 500 Internal Server Error
        fallback_price = 95000.00 
        return Response({'exchange_rate': fallback_price, 'warning': 'Using fallback price'})

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