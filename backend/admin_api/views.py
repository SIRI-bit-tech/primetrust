from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone

from accounts.models import User
from transactions.models import Transaction
from banking.models import Transfer
from loans.models import Loan


class AdminUserListView(generics.ListAPIView):
    """List all users (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
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


class AdminTransactionListView(generics.ListAPIView):
    """List all transactions (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
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
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK) 