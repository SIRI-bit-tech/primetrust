from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from .models import VirtualCard, Transfer, BankAccount, DirectDeposit
from .serializers import (
    VirtualCardSerializer, VirtualCardCreateSerializer, TransferSerializer,
    TransferCreateSerializer, BankAccountSerializer, BankAccountCreateSerializer,
    DirectDepositSerializer, DirectDepositCreateSerializer
)
from transactions.models import Transaction


# Virtual Card Views
class VirtualCardListView(generics.ListAPIView):
    """List all virtual cards for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user)


class VirtualCardCreateView(generics.CreateAPIView):
    """Create a new virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class VirtualCardDetailView(generics.RetrieveAPIView):
    """Get details of a specific virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user)


class VirtualCardUpdateView(generics.UpdateAPIView):
    """Update virtual card settings."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user)


class VirtualCardCancelView(APIView):
    """Cancel a virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        card = get_object_or_404(VirtualCard, pk=pk, user=request.user)
        
        if card.status == 'cancelled':
            return Response({'error': 'Card is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)
        
        card.status = 'cancelled'
        card.save()
        
        return Response({'message': 'Card cancelled successfully'}, status=status.HTTP_200_OK)


class VirtualCardFreezeView(APIView):
    """Freeze a virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        card = get_object_or_404(VirtualCard, pk=pk, user=request.user)
        
        if card.status == 'suspended':
            return Response({'error': 'Card is already frozen'}, status=status.HTTP_400_BAD_REQUEST)
        
        card.status = 'suspended'
        card.save()
        
        return Response({'message': 'Card frozen successfully'}, status=status.HTTP_200_OK)


class VirtualCardUnfreezeView(APIView):
    """Unfreeze a virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        card = get_object_or_404(VirtualCard, pk=pk, user=request.user)
        
        if card.status != 'suspended':
            return Response({'error': 'Card is not frozen'}, status=status.HTTP_400_BAD_REQUEST)
        
        card.status = 'active'
        card.save()
        
        return Response({'message': 'Card unfrozen successfully'}, status=status.HTTP_200_OK)


# Transfer Views
class TransferListView(generics.ListAPIView):
    """List all transfers for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransferSerializer
    
    def get_queryset(self):
        user = self.request.user
        return Transfer.objects.filter(
            models.Q(sender=user) | models.Q(recipient=user)
        )


class TransferCreateView(generics.CreateAPIView):
    """Create a new transfer."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransferCreateSerializer
    
    def perform_create(self, serializer):
        transfer = serializer.save(sender=self.request.user)
        
        # Process the transfer
        success, message = transfer.process_transfer()
        
        if not success:
            raise serializers.ValidationError(message)


class TransferDetailView(generics.RetrieveAPIView):
    """Get details of a specific transfer."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransferSerializer
    
    def get_queryset(self):
        user = self.request.user
        return Transfer.objects.filter(
            models.Q(sender=user) | models.Q(recipient=user)
        )


class TransferCancelView(APIView):
    """Cancel a pending transfer."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        transfer = get_object_or_404(Transfer, pk=pk, sender=request.user)
        
        success, message = transfer.cancel_transfer()
        
        if success:
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


class TransferProcessView(APIView):
    """Process a pending transfer."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        transfer = get_object_or_404(Transfer, pk=pk, sender=request.user)
        
        success, message = transfer.process_transfer()
        
        if success:
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


# Bank Account Views
class BankAccountListView(generics.ListAPIView):
    """List all bank accounts for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class BankAccountCreateView(generics.CreateAPIView):
    """Create a new bank account."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BankAccountDetailView(generics.RetrieveAPIView):
    """Get details of a specific bank account."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class BankAccountUpdateView(generics.UpdateAPIView):
    """Update bank account information."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class BankAccountDeleteView(generics.DestroyAPIView):
    """Delete a bank account."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class BankAccountVerifyView(APIView):
    """Verify a bank account."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        account = get_object_or_404(BankAccount, pk=pk, user=request.user)
        
        # In a real implementation, this would integrate with a bank verification service
        # For now, we'll simulate verification
        account.is_verified = True
        account.save()
        
        return Response({'message': 'Bank account verified successfully'}, status=status.HTTP_200_OK)


# Direct Deposit Views
class DirectDepositListView(generics.ListAPIView):
    """List all direct deposits for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositSerializer
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)


class DirectDepositCreateView(generics.CreateAPIView):
    """Create a new direct deposit."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DirectDepositDetailView(generics.RetrieveAPIView):
    """Get details of a specific direct deposit."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositSerializer
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)


class DirectDepositUpdateView(generics.UpdateAPIView):
    """Update direct deposit information."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositSerializer
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)


class DirectDepositDeleteView(generics.DestroyAPIView):
    """Delete a direct deposit."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)


# Banking Utilities
class TransferLimitsView(APIView):
    """Get transfer limits for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        limits = {
            'minimum_transfer_amount': getattr(settings, 'MINIMUM_TRANSFER_AMOUNT', 1.00),
            'maximum_transfer_amount': getattr(settings, 'MAXIMUM_TRANSFER_AMOUNT', 10000.00),
            'daily_transfer_limit': getattr(settings, 'DAILY_TRANSFER_LIMIT', 50000.00),
            'monthly_transfer_limit': getattr(settings, 'MONTHLY_TRANSFER_LIMIT', 500000.00),
        }
        
        return Response(limits, status=status.HTTP_200_OK)


class TransferFeesView(APIView):
    """Get transfer fees information."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        fees = {
            'internal_transfer_fee': 0.00,
            'external_transfer_fee': 2.50,
            'instant_transfer_fee': 1.00,
            'international_transfer_fee': 15.00,
        }
        
        return Response(fees, status=status.HTTP_200_OK)
