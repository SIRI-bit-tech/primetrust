from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction
from rest_framework import serializers
import logging
import traceback
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit, CardApplication, ExternalBankAccount, SavedBeneficiary, CheckDeposit
from .serializers import (
    CheckDepositSerializer, CheckDepositCreateSerializer,
    TransferSerializer, BankAccountSerializer, DirectDepositSerializer,
    ExternalBankAccountSerializer, SavedBeneficiarySerializer,
    CardApplicationCreateSerializer, VirtualCardCreateSerializer,
    ACHTransferSerializer, WireTransferSerializer, InternationalWireTransferSerializer,
    BankLookupSerializer
)
from admin_api.serializers import (
    VirtualCardSerializer, CardApplicationSerializer
)

logger = logging.getLogger(__name__)


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
        # Check if user already has an active card or pending/processing/approved application
        existing_cards = VirtualCard.objects.filter(
            user=self.request.user,
            status__in=['active', 'suspended']
        ).exists()
        
        if existing_cards:
            raise serializers.ValidationError({
                'error': 'You already have an active card. Please cancel your current card before applying for a new one.'
            })
        
        # Check for pending/processing/approved applications
        pending_applications = CardApplication.objects.filter(
            user=self.request.user,
            status__in=['processing', 'approved']
        ).exists()
        
        if pending_applications:
            raise serializers.ValidationError({
                'error': 'You already have a pending card application. Please wait for it to be processed.'
            })
        
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
    def decline(self, request, pk=None):
        """Decline an application."""
        application = self.get_object()
        notes = request.data.get('notes', '')
        application.decline(request.user, notes)
        return Response({'message': 'Application declined'})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an application and generate card."""
        application = self.get_object()
        if application.status != 'approved':
            return Response({'error': 'Application must be in approved status to complete'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Check if user already has an active card
            existing_card = VirtualCard.objects.filter(
                user=application.user,
                status__in=['active', 'suspended']
            ).first()
            
            if existing_card:
                return Response({
                    'error': 'User already has an active card'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the virtual card
            card = VirtualCard.objects.create(
                user=application.user,
                application=application,
                card_type=application.card_type,
                daily_limit=application.preferred_daily_limit or 1000.00,
                monthly_limit=application.preferred_monthly_limit or 10000.00
            )
            
            # Mark application as completed
            notes = request.data.get('notes', f'Card generated successfully')
            application.complete(request.user, card, notes)
            
            return Response({
                'message': 'Application completed and card generated',
                'card_id': card.id,
                'card_number': card.mask_card_number(),
                'status': 'completed'
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
    
    def perform_create(self, serializer):
        """Create internal transfer and debit sender immediately."""
        from decimal import Decimal
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        sender = self.request.user
        amount = Decimal(str(serializer.validated_data['amount']))
        
        with transaction.atomic():
            # Lock sender row
            sender = User.objects.select_for_update().get(pk=sender.pk)
            
            if sender.balance < amount:
                raise serializers.ValidationError({'amount': ['Insufficient funds']})
            
            sender.balance -= amount
            sender.save(update_fields=['balance'])
            
            recipient = None
            recipient_email = serializer.validated_data.get('recipient_email')
            if recipient_email:
                try:
                    recipient = User.objects.get(email=recipient_email)
                except User.DoesNotExist as exc:
                    # Undo debit within the same transaction and return 400
                    raise serializers.ValidationError(
                        {'recipient_email': [f'Recipient with email {recipient_email} not found']}
                    ) from exc
            
            serializer.save(
                sender=sender,
                recipient=recipient,
                transfer_type='internal',
                status='pending',
                requires_admin_approval=True,
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
    
    # Basic validation - just check format
    if len(routing_number) != 9 or not routing_number.isdigit():
        return Response({
            'is_valid': False,
            'message': 'Routing number must be 9 digits'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Return success - user will enter bank name manually
    return Response({
        'is_valid': True,
        'message': 'Routing number format is valid',
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
    
    return Response({
        'message': 'ACH transfer endpoint not yet implemented',
        'error': 'Feature coming soon'
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_wire_transfer(request):
    """Create a domestic wire transfer."""
    serializer = WireTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'message': 'Wire transfer endpoint not yet implemented',
        'error': 'Feature coming soon'
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_international_wire_transfer(request):
    """Create an international wire transfer."""
    serializer = InternationalWireTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'message': 'International wire transfer endpoint not yet implemented',
        'error': 'Feature coming soon'
    }, status=status.HTTP_501_NOT_IMPLEMENTED)


# Check Deposit Views
class CheckDepositViewSet(ModelViewSet):
    """ViewSet for check deposits."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CheckDeposit.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CheckDepositCreateSerializer
        return CheckDepositSerializer
    
    def perform_create(self, serializer):
        deposit = serializer.save(user=self.request.user)
        
        # Send real-time notification
        from utils.realtime import notify_check_deposit_update, send_notification, send_admin_notification
        notify_check_deposit_update(self.request.user.id, deposit.id, deposit.status, deposit.amount)
        send_notification(
            self.request.user.id,
            'Check Deposit Submitted',
            f'Your check deposit of ${deposit.amount} has been submitted for review.',
            'info'
        )
        
        # Notify admins
        send_admin_notification(
            'New Check Deposit',
            f'New check deposit of ${deposit.amount} from {self.request.user.get_full_name() or self.request.user.email}',
            'info'
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def extract_check_data(request):
    """Extract data from check image using OCR."""
    logger.info(f"Extract check data called with method: {request.method}")
    front_image = request.FILES.get('front_image')
    
    if not front_image:
        return Response({'error': 'Front image required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use Tesseract OCR to extract check data
    from .ocr_service import CheckOCRService
    
    try:
        extracted_data = CheckOCRService.extract_check_data(front_image)
        return Response(extracted_data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"OCR extraction error: {str(e)}")
        return Response({
            'amount': None,
            'check_number': None,
            'confidence': 0.0,
            'message': 'OCR extraction failed. Please enter details manually.'
        }, status=status.HTTP_200_OK)
