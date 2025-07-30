from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone

from accounts.models import User
from accounts.serializers import UserSerializer
from transactions.models import Transaction
from transactions.serializers import TransactionSerializer
from banking.models import Transfer, VirtualCard, CardApplication
from banking.serializers import VirtualCardSerializer, CardApplicationSerializer
from loans.models import Loan
from api.models import Notification
from api.serializers import NotificationSerializer


class AdminAuthView(APIView):
    """Check if user has admin privileges."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Check if the authenticated user has admin privileges."""
        user = request.user
        
        # Check if user is staff/superuser (Django's built-in admin check)
        is_admin = user.is_staff or user.is_superuser
        
        # Also check for custom admin emails if needed
        admin_emails = ['admin@primetrust.com', 'admin@example.com']
        is_admin_email = user.email in admin_emails
        
        has_admin_access = is_admin or is_admin_email
        
        return Response({
            'is_admin': has_admin_access,
            'user_id': user.id,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        }, status=status.HTTP_200_OK)


class AdminUserListView(generics.ListAPIView):
    """List all users (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        # Filter by search query
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | 
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search)
            )
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        return queryset.order_by('-date_joined')


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Get and update user details (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all()


class AdminUserBalanceView(APIView):
    """Update user balance (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        balance = request.data.get('balance')
        
        if balance is not None:
            try:
                balance = float(balance)
                user.balance = balance
                user.save()
                return Response({
                    'message': 'Balance updated successfully',
                    'balance': str(user.balance)
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({'error': 'Invalid balance amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Balance is required'}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserBitcoinBalanceView(APIView):
    """Update user Bitcoin balance (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        bitcoin_balance = request.data.get('bitcoin_balance')
        action = request.data.get('action', 'set')  # 'set', 'add', 'subtract'
        
        if bitcoin_balance is not None:
            try:
                bitcoin_balance = float(bitcoin_balance)
                current_balance = float(user.bitcoin_balance or 0)
                
                if action == 'add':
                    user.bitcoin_balance = current_balance + bitcoin_balance
                elif action == 'subtract':
                    if current_balance < bitcoin_balance:
                        return Response({'error': 'Insufficient Bitcoin balance'}, status=status.HTTP_400_BAD_REQUEST)
                    user.bitcoin_balance = current_balance - bitcoin_balance
                else:  # 'set'
                    user.bitcoin_balance = bitcoin_balance
                
                user.save()
                return Response({
                    'message': f'Bitcoin balance {action} successfully',
                    'bitcoin_balance': str(user.bitcoin_balance),
                    'action': action
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({'error': 'Invalid Bitcoin balance amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Bitcoin balance is required'}, status=status.HTTP_400_BAD_REQUEST)


class AdminTransactionListView(generics.ListAPIView):
    """List all transactions (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        queryset = Transaction.objects.all()
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        return queryset.order_by('-created_at')


class AdminTransactionDetailView(generics.RetrieveUpdateAPIView):
    """Get and update transaction details (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    queryset = Transaction.objects.all()


class AdminTransactionStatusView(APIView):
    """Update transaction status (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk)
        new_status = request.data.get('status')
        
        if new_status in dict(Transaction.TRANSACTION_STATUS):
            transaction.status = new_status
            if new_status == 'completed':
                transaction.completed_at = timezone.now()
            transaction.save()
            
            return Response({
                'message': 'Transaction status updated successfully',
                'status': transaction.status
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


class AdminVirtualCardListView(generics.ListAPIView):
    """List all virtual cards (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = VirtualCardSerializer
    
    def get_queryset(self):
        queryset = VirtualCard.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-created_at')


class AdminVirtualCardDeleteView(APIView):
    """Delete virtual card (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def delete(self, request, pk):
        card = get_object_or_404(VirtualCard, pk=pk)
        card.delete()
        
        return Response({
            'message': 'Virtual card deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


class AdminCardApplicationListView(generics.ListAPIView):
    """List all card applications (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = CardApplicationSerializer
    
    def get_queryset(self):
        queryset = CardApplication.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-created_at')


class AdminCardApplicationStatusView(APIView):
    """Update card application status (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, pk):
        application = get_object_or_404(CardApplication, pk=pk)
        new_status = request.data.get('status')
        
        if new_status in dict(CardApplication.STATUS_CHOICES):
            application.status = new_status
            application.processed_at = timezone.now()
            application.save()
            
            return Response({
                'message': 'Card application status updated successfully',
                'status': application.status
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


class AdminNotificationListView(generics.ListAPIView):
    """List all notifications (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        queryset = Notification.objects.all()
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-created_at')


class AdminDashboardView(APIView):
    """Get admin dashboard data."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(date_joined__date=timezone.now().date()).count()
        
        # Transaction statistics
        total_transactions = Transaction.objects.count()
        total_transaction_amount = Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0
        pending_transactions = Transaction.objects.filter(status='pending').count()
        
        # Transfer statistics
        total_transfers = Transfer.objects.count()
        pending_transfers = Transfer.objects.filter(status='pending').count()
        
        # Loan statistics
        total_loans = Loan.objects.count()
        active_loans = Loan.objects.filter(status='active').count()
        total_loan_amount = Loan.objects.aggregate(total=Sum('amount'))['total'] or 0
        
        # Card statistics
        total_cards = VirtualCard.objects.count()
        active_cards = VirtualCard.objects.filter(status='active').count()
        
        # Application statistics
        total_applications = CardApplication.objects.count()
        pending_applications = CardApplication.objects.filter(status='pending').count()
        
        # Notification statistics
        total_notifications = Notification.objects.count()
        unread_notifications = Notification.objects.filter(is_read=False).count()
        
        dashboard_data = {
            'users': {
                'total': total_users,
                'active': active_users,
                'new_today': new_users_today
            },
            'transactions': {
                'total': total_transactions,
                'total_amount': str(total_transaction_amount),
                'pending': pending_transactions
            },
            'transfers': {
                'total': total_transfers,
                'pending': pending_transfers
            },
            'loans': {
                'total': total_loans,
                'active': active_loans,
                'total_amount': str(total_loan_amount)
            },
            'cards': {
                'total': total_cards,
                'active': active_cards
            },
            'applications': {
                'total': total_applications,
                'pending': pending_applications
            },
            'notifications': {
                'total': total_notifications,
                'unread': unread_notifications
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK) 