from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit, CardApplication, ExternalBankAccount, SavedBeneficiary
from .serializers import (
    VirtualCardSerializer, VirtualCardCreateSerializer, TransferSerializer,
    BankAccountSerializer, DirectDepositSerializer, CardApplicationSerializer, CardApplicationCreateSerializer,
    ExternalBankAccountSerializer, SavedBeneficiarySerializer, ACHTransferSerializer,
    WireTransferSerializer, InternationalWireTransferSerializer, BankLookupSerializer
)
from .transfer_services import BankLookupService, ACHTransferService, WireTransferService


class CardApplicationViewSet(ModelViewSet):
    """ViewSet for card applications."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return applications for the current user."""
        return CardApplication.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CardApplicationCreateSerializer
        return CardApplicationSerializer
    
    def perform_create(self, serializer):
        """Create application for the current user."""
        application = serializer.save(user=self.request.user)
        
        # Send notification for new application
        from .services import CardApplicationNotificationService
        CardApplicationNotificationService.send_application_submitted_notification(application)
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Get all applications for the current user."""
        applications = self.get_queryset()
        serializer = self.get_serializer(applications, many=True)
        return Response(serializer.data)


class VirtualCardListView(generics.ListAPIView):
    """List all virtual cards for the current user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user, status='active')


class VirtualCardDetailView(generics.RetrieveAPIView):
    """Retrieve a specific virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user)


class VirtualCardUpdateView(generics.UpdateAPIView):
    """Update a virtual card (limited fields)."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        return VirtualCard.objects.filter(user=self.request.user)


class VirtualCardCancelView(APIView):
    """Cancel a virtual card."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, card_id):
        try:
            card = VirtualCard.objects.get(id=card_id, user=request.user)
            card.status = 'cancelled'
            card.save()
            return Response({'message': 'Card cancelled successfully'})
        except VirtualCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=404)


class VirtualCardDeleteView(APIView):
    """Delete a virtual card (admin only)."""
    permission_classes = [permissions.IsAdminUser]
    
    def delete(self, request, card_id):
        try:
            card = VirtualCard.objects.get(id=card_id)
            card.delete()
            return Response({'message': 'Card deleted successfully'})
        except VirtualCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=404)


class VirtualCardFreezeView(APIView):
    """Freeze a virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, card_id):
        try:
            card = VirtualCard.objects.get(id=card_id, user=request.user)
            card.status = 'suspended'
            card.save()
            return Response({'message': 'Card frozen successfully'})
        except VirtualCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)


class VirtualCardUnfreezeView(APIView):
    """Unfreeze a virtual card."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, card_id):
        try:
            card = VirtualCard.objects.get(id=card_id, user=request.user)
            card.status = 'active'
            card.save()
            return Response({'message': 'Card unfrozen successfully'})
        except VirtualCard.DoesNotExist:
            return Response({'error': 'Card not found'}, status=status.HTTP_404_NOT_FOUND)


# Admin views for card applications
class AdminCardApplicationViewSet(ModelViewSet):
    """Admin ViewSet for managing card applications."""
    
    permission_classes = [permissions.IsAdminUser]
    queryset = CardApplication.objects.all()
    serializer_class = CardApplicationSerializer
    
    def get_queryset(self):
        """Return applications based on status filter."""
        queryset = CardApplication.objects.all()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an application and move to processing."""
        application = self.get_object()
        notes = request.data.get('notes', '')
        application.approve(request.user, notes)
        return Response({'message': 'Application approved and moved to processing'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an application."""
        application = self.get_object()
        notes = request.data.get('notes', '')
        application.reject(request.user, notes)
        return Response({'message': 'Application rejected'})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an application and generate card."""
        application = self.get_object()
        if application.status != 'processing':
            return Response({'error': 'Application must be in processing status'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create the virtual card
            card = VirtualCard.objects.create(
                user=application.user,
                application=application,
                card_type=application.card_type,
                daily_limit=application.preferred_daily_limit or 1000.00,
                monthly_limit=application.preferred_monthly_limit or 10000.00
            )
            
            # Mark application as completed
            notes = request.data.get('notes', f'Card {card.card_number} generated successfully')
            application.complete(request.user, notes)
            
            return Response({
                'message': 'Application completed and card generated',
                'card_id': card.id,
                'card_number': card.mask_card_number()
            })
            
        except Exception as e:
            return Response({'error': f'Error creating card: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Keep existing Transfer, BankAccount, and DirectDeposit views
class TransferListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransferSerializer
    
    def get_queryset(self):
        return Transfer.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        )


class TransferDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransferSerializer
    
    def get_queryset(self):
        return Transfer.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        )


class BankAccountListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BankAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BankAccountSerializer
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)


class DirectDepositListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositSerializer
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DirectDepositDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectDepositSerializer
    
    def get_queryset(self):
        return DirectDeposit.objects.filter(user=self.request.user)


# New Transfer Endpoints

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_routing_number(request):
    """
    Validate routing number format and checksum.
    Returns validation result. User must provide bank name manually.
    """
    serializer = BankLookupSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    routing_number = serializer.validated_data['routing_number']
    
    # Validate routing number format and checksum
    validation_result = BankLookupService.validate_routing_number(routing_number)
    
    if not validation_result['is_valid']:
        return Response({
            'is_valid': False,
            'message': validation_result['message']
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Return success - user will enter bank name manually
    return Response({
        'is_valid': True,
        'message': validation_result['message'],
        'routing_number': routing_number,
        'note': 'Please enter your bank name manually'
    }, status=status.HTTP_200_OK)


class ExternalBankAccountViewSet(ModelViewSet):
    """ViewSet for managing external bank accounts."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExternalBankAccountSerializer
    
    def get_queryset(self):
        return ExternalBankAccount.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavedBeneficiaryViewSet(ModelViewSet):
    """ViewSet for managing saved beneficiaries."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SavedBeneficiarySerializer
    
    def get_queryset(self):
        return SavedBeneficiary.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_ach_transfer(request):
    """Create an ACH transfer."""
    serializer = ACHTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        transfer = ACHTransferService.create_transfer(
            user=request.user,
            data=serializer.validated_data
        )
        
        return Response({
            'message': 'ACH transfer created successfully',
            'transfer_id': transfer.id,
            'reference_number': transfer.reference_number,
            'status': transfer.status,
            'scheduled_completion_time': transfer.scheduled_completion_time
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Failed to create transfer'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_wire_transfer(request):
    """Create a domestic wire transfer."""
    serializer = WireTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        transfer = WireTransferService.create_transfer(
            user=request.user,
            data=serializer.validated_data,
            is_international=False
        )
        
        return Response({
            'message': 'Wire transfer created successfully',
            'transfer_id': transfer.id,
            'reference_number': transfer.reference_number,
            'status': transfer.status,
            'scheduled_completion_time': transfer.scheduled_completion_time
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Failed to create transfer'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_international_wire_transfer(request):
    """Create an international wire transfer."""
    serializer = InternationalWireTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        transfer = WireTransferService.create_transfer(
            user=request.user,
            data=serializer.validated_data,
            is_international=True
        )
        
        return Response({
            'message': 'International wire transfer created successfully',
            'transfer_id': transfer.id,
            'reference_number': transfer.reference_number,
            'status': transfer.status,
            'scheduled_completion_time': transfer.scheduled_completion_time
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Failed to create transfer'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
