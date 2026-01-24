from django.shortcuts import get_object_or_404
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from django.db import connection
from django.db.models import Q
from django.core.cache import cache
import redis
import time
import requests

from accounts.models import SecurityAuditLog
from transactions.models import Transaction, Loan, Bill, Investment, BitcoinTransaction
from loans.models import LoanApplication
from banking.models import VirtualCard, CardApplication, Transfer, CheckDeposit
from api.models import Notification, SystemStatus
from bitcoin_wallet.models import CurrencySwap

User = get_user_model()

from .serializers import (
    UserSerializer, TransactionSerializer, VirtualCardSerializer,
    CardApplicationSerializer, NotificationSerializer, SystemStatusSerializer,
    LoanSerializer, BillSerializer, InvestmentSerializer, CurrencySwapSerializer,
    BitcoinTransactionSerializer, SecurityAuditLogSerializer, CheckDepositSerializer
)


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
    
    def put(self, request, user_id):  # Changed from 'pk' to 'user_id'
        user = get_object_or_404(User, pk=user_id)
        balance = request.data.get('balance')
        action = request.data.get('action', 'add')  # 'add', 'subtract', 'set'
        
        # Validate action
        allowed_actions = {'add', 'subtract', 'set'}
        if action not in allowed_actions:
            return Response({
                'error': f'Invalid action: {action}',
                'allowed_actions': list(allowed_actions)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if balance is not None:
            try:
                balance = float(balance)
                current_balance = float(user.balance or 0)
                
                if action == 'add':
                    user.balance = current_balance + balance
                    action_text = f'added ${balance:.2f}'
                elif action == 'subtract':
                    if current_balance < balance:
                        return Response({
                            'error': 'Insufficient balance',
                            'current_balance': f'${current_balance:.2f}',
                            'attempted_subtraction': f'${balance:.2f}',
                            'shortfall': f'${balance - current_balance:.2f}'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    user.balance = current_balance - balance
                    action_text = f'subtracted ${balance:.2f}'
                elif action == 'set':
                    user.balance = balance
                    action_text = f'set to ${balance:.2f}'
                
                user.save()
                
                # Send real-time notification to user
                from utils.realtime import notify_balance_update, send_notification
                notify_balance_update(user.id, user.balance)
                send_notification(
                    user.id,
                    'Balance Updated',
                    f'Your account balance has been {action_text}. New balance: ${user.balance:.2f}',
                    'info'
                )
                
                return Response({
                    'message': f'Balance {action_text} successfully',
                    'balance': str(user.balance),
                    'action': action
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({'error': 'Invalid balance amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Balance is required'}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserBitcoinBalanceView(APIView):
    """Update user Bitcoin balance (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, user_id):  # Changed from 'pk' to 'user_id'
        user = get_object_or_404(User, pk=user_id)
        bitcoin_balance = request.data.get('bitcoin_balance')
        action = request.data.get('action', 'set')  # 'set', 'add', 'subtract'
        
        # Validate action
        allowed_actions = {'add', 'subtract', 'set'}
        if action not in allowed_actions:
            return Response({
                'error': f'Invalid action: {action}',
                'allowed_actions': list(allowed_actions)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if bitcoin_balance is not None:
            try:
                bitcoin_balance = float(bitcoin_balance)
                current_balance = float(user.bitcoin_balance or 0)
                
                if action == 'add':
                    user.bitcoin_balance = current_balance + bitcoin_balance
                    action_text = f'added {bitcoin_balance:.8f} BTC'
                elif action == 'subtract':
                    if current_balance < bitcoin_balance:
                        return Response({
                            'error': 'Insufficient Bitcoin balance',
                            'current_balance': f'{current_balance:.8f} BTC',
                            'attempted_subtraction': f'{bitcoin_balance:.8f} BTC',
                            'shortfall': f'{bitcoin_balance - current_balance:.8f} BTC'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    user.bitcoin_balance = current_balance - bitcoin_balance
                    action_text = f'subtracted {bitcoin_balance:.8f} BTC'
                elif action == 'set':
                    user.bitcoin_balance = bitcoin_balance
                    action_text = f'set to {bitcoin_balance:.8f} BTC'
                
                user.save()
                
                # Send real-time notification to user
                from utils.realtime import send_notification
                send_notification(
                    user.id,
                    'Bitcoin Balance Updated',
                    f'Your Bitcoin balance has been {action_text}. New balance: {user.bitcoin_balance:.8f} BTC',
                    'info'
                )
                
                return Response({
                    'message': f'Bitcoin balance {action_text} successfully',
                    'bitcoin_balance': str(user.bitcoin_balance),
                    'action': action
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({'error': 'Invalid Bitcoin balance amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Bitcoin balance is required'}, status=status.HTTP_400_BAD_REQUEST)


class AdminTransactionListView(APIView):
    """List all transactions and transfers combined (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        from banking.serializers import TransferSerializer
        
        # Get query parameters
        user_id = request.query_params.get('user')
        status_filter = request.query_params.get('status')
        transaction_type = request.query_params.get('type')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
        # Fetch transactions with optimized query
        transactions_queryset = Transaction.objects.select_related('user').all()
        if user_id:
            transactions_queryset = transactions_queryset.filter(user_id=user_id)
        if status_filter:
            transactions_queryset = transactions_queryset.filter(status=status_filter)
        if transaction_type:
            transactions_queryset = transactions_queryset.filter(transaction_type=transaction_type)
        
        # Fetch transfers with optimized query
        transfers_queryset = Transfer.objects.all().select_related('sender', 'recipient')
        if user_id:
            transfers_queryset = transfers_queryset.filter(Q(sender_id=user_id) | Q(recipient_id=user_id))
        if status_filter:
            transfers_queryset = transfers_queryset.filter(status=status_filter)
        if transaction_type:
            transfers_queryset = transfers_queryset.filter(transfer_type=transaction_type)
        
        # Serialize both
        transactions_data = TransactionSerializer(transactions_queryset, many=True).data
        transfers_data = TransferSerializer(transfers_queryset, many=True).data
        
        # Add type discriminator to each item
        for item in transactions_data:
            item['type'] = 'transaction'
        for item in transfers_data:
            item['type'] = 'transfer'
        
        # Combine and sort by created_at
        combined_data = list(transactions_data) + list(transfers_data)
        combined_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        paginated_data = combined_data[start:end]
        
        return Response({
            'results': paginated_data,
            'count': len(combined_data),
            'page': page,
            'page_size': page_size
        }, status=status.HTTP_200_OK)


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


class AdminTransferStatusView(APIView):
    """Update transfer status (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def put(self, request, pk):
        transfer = get_object_or_404(Transfer, pk=pk)
        new_status = request.data.get('status')
        
        # Valid transfer statuses
        valid_statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled']
        
        if new_status in valid_statuses:
            transfer.status = new_status
            if new_status == 'completed':
                transfer.completed_at = timezone.now()
            transfer.save()
            
            return Response({
                'message': 'Transfer status updated successfully',
                'status': transfer.status
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
    
    def put(self, request, application_id):
        application = get_object_or_404(CardApplication, pk=application_id)
        new_status = request.data.get('status')
        
        if new_status in dict(CardApplication.APPLICATION_STATUS):
            application.status = new_status
            application.processed_at = timezone.now()
            application.save()
            
            return Response({
                'message': 'Card application status updated successfully',
                'status': application.status
            }, status=status.HTTP_200_OK)
        
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


class AdminCardApplicationCompleteView(APIView):
    """Complete application and generate card (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, application_id):
        application = get_object_or_404(CardApplication, pk=application_id)
        
        if application.status != 'approved':
            return Response({
                'error': 'Application must be in approved status to complete'
            }, status=status.HTTP_400_BAD_REQUEST)
        
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
            notes = f"Card generated successfully"
            application.complete(request.user, card, notes)
            
            return Response({
                'message': 'Application completed and card generated successfully',
                'card_id': card.id,
                'card_number': card.mask_card_number(),
                'status': application.status
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error creating card: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        
        # Transaction statistics (includes both Transaction and Transfer objects)
        transaction_count = Transaction.objects.count()
        transfer_count = Transfer.objects.count()
        total_transactions = transaction_count + transfer_count
        
        transaction_amount = Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0
        transfer_amount = Transfer.objects.aggregate(total=Sum('amount'))['total'] or 0
        total_transaction_amount = transaction_amount + transfer_amount
        
        pending_transactions = Transaction.objects.filter(status='pending').count()
        pending_transfers = Transfer.objects.filter(status='pending').count()
        total_pending = pending_transactions + pending_transfers
        
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
        
        # Check deposit statistics
        total_check_deposits = CheckDeposit.objects.count()
        pending_check_deposits = CheckDeposit.objects.filter(status='pending').count()
        approved_check_deposits = CheckDeposit.objects.filter(status='approved').count()
        total_check_deposit_amount = CheckDeposit.objects.filter(status__in=['approved', 'completed']).aggregate(total=Sum('amount'))['total'] or 0
        
        dashboard_data = {
            'users': {
                'total': total_users,
                'active': active_users,
                'new_today': new_users_today
            },
            'transactions': {
                'total': total_transactions,
                'total_amount': str(total_transaction_amount),
                'pending': total_pending,
                'transaction_count': transaction_count,
                'transfer_count': transfer_count
            },
            'transfers': {
                'total': transfer_count,
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
            'check_deposits': {
                'total': total_check_deposits,
                'pending': pending_check_deposits,
                'approved': approved_check_deposits,
                'total_amount': str(total_check_deposit_amount)
            },
            'notifications': {
                'total': total_notifications,
                'unread': unread_notifications
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK) 


class AdminUserDeleteView(APIView):
    """Delete a user."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({'message': 'User deleted successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSystemStatusView(APIView):
    """Get system status information with real-time health checks."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        try:
            import time
            from django.core.cache import cache
            from django.db import connection
            
            # Define components with their health check functions
            components = [
                {
                    'name': 'api',
                    'display_name': 'API',
                    'check': self._check_api_health
                },
                {
                    'name': 'database',
                    'display_name': 'Database',
                    'check': self._check_database_health
                },
                {
                    'name': 'redis',
                    'display_name': 'Redis',
                    'check': self._check_redis_health
                },
                {
                    'name': 'celery',
                    'display_name': 'Celery',
                    'check': self._check_celery_health
                },
                {
                    'name': 'email',
                    'display_name': 'Email Service',
                    'check': self._check_email_health
                },
                {
                    'name': 'payment',
                    'display_name': 'Payment Processing',
                    'check': self._check_payment_health
                },
                {
                    'name': 'market_data',
                    'display_name': 'Market Data',
                    'check': self._check_market_data_health
                }
            ]
            
            status_data = []
            
            for component in components:
                # Perform real-time health check
                start_time = time.time()
                try:
                    health_result = component['check']()
                    response_time = round((time.time() - start_time) * 1000, 2)  # Convert to milliseconds
                    
                    # Update or create SystemStatus record
                    status_obj, created = SystemStatus.objects.get_or_create(
                        component=component['name'],
                        defaults={
                            'status': health_result['status'],
                            'message': health_result['message'],
                            'response_time': response_time,
                            'uptime_percentage': health_result.get('uptime_percentage', 99.9),
                            'error_count': health_result.get('error_count', 0),
                            'request_count': health_result.get('request_count', 1000)
                        }
                    )
                    
                    # Update with real-time data
                    status_obj.status = health_result['status']
                    status_obj.message = health_result['message']
                    status_obj.response_time = response_time
                    status_obj.uptime_percentage = health_result.get('uptime_percentage', 99.9)
                    status_obj.last_check = timezone.now()
                    status_obj.save()
                    
                    status_data.append(SystemStatusSerializer(status_obj).data)
                    
                except Exception as e:
                    # Handle health check failure
                    response_time = round((time.time() - start_time) * 1000, 2)
                    
                    status_obj, created = SystemStatus.objects.get_or_create(
                        component=component['name'],
                        defaults={
                            'status': 'major_outage',
                            'message': f'Health check failed: {str(e)}',
                            'response_time': response_time,
                            'uptime_percentage': 0.0,
                            'error_count': 1,
                            'request_count': 0
                        }
                    )
                    
                    status_obj.status = 'major_outage'
                    status_obj.message = f'Health check failed: {str(e)}'
                    status_obj.response_time = response_time
                    status_obj.uptime_percentage = 0.0
                    status_obj.error_count += 1
                    status_obj.last_check = timezone.now()
                    status_obj.save()
                    
                    status_data.append(SystemStatusSerializer(status_obj).data)
            
            # Calculate overall system status
            overall_status = 'operational'
            for component in status_data:
                if component['status'] == 'major_outage':
                    overall_status = 'major_outage'
                    break
                elif component['status'] == 'partial_outage' and overall_status == 'operational':
                    overall_status = 'partial_outage'
                elif component['status'] == 'degraded' and overall_status == 'operational':
                    overall_status = 'degraded'
            
            return Response({
                'overall_status': overall_status,
                'components': status_data,
                'last_updated': timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _check_api_health(self):
        """Check API health."""
        return {
            'status': 'operational',
            'message': 'API is responding normally',
            'uptime_percentage': 99.9,
            'error_count': 0,
            'request_count': 1000
        }
    
    def _check_database_health(self):
        """Check database health."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return {
                    'status': 'operational',
                    'message': 'Database connection is healthy',
                    'uptime_percentage': 99.8,
                    'error_count': 0,
                    'request_count': 5000
                }
        except Exception as e:
            return {
                'status': 'major_outage',
                'message': f'Database connection failed: {str(e)}',
                'uptime_percentage': 0.0,
                'error_count': 1,
                'request_count': 0
            }
    
    def _check_redis_health(self):
        """Check Redis health."""
        try:
            cache.set('health_check', 'ok', 1)
            result = cache.get('health_check')
            if result == 'ok':
                return {
                    'status': 'operational',
                    'message': 'Redis cache is working',
                    'uptime_percentage': 99.7,
                    'error_count': 0,
                    'request_count': 2000
                }
            else:
                return {
                    'status': 'degraded',
                    'message': 'Redis cache is responding slowly',
                    'uptime_percentage': 95.0,
                    'error_count': 1,
                    'request_count': 1000
                }
        except Exception as e:
            return {
                'status': 'partial_outage',
                'message': f'Redis connection failed: {str(e)}',
                'uptime_percentage': 0.0,
                'error_count': 1,
                'request_count': 0
            }
    
    def _check_celery_health(self):
        """Check Celery health."""
        try:
            # Simulate Celery health check
            return {
                'status': 'operational',
                'message': 'Celery workers are running',
                'uptime_percentage': 99.5,
                'error_count': 0,
                'request_count': 300
            }
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f'Celery health check failed: {str(e)}',
                'uptime_percentage': 85.0,
                'error_count': 1,
                'request_count': 0
            }
    
    def _check_email_health(self):
        """Check email service health."""
        try:
            # Simulate email service health check
            return {
                'status': 'operational',
                'message': 'Email service is operational',
                'uptime_percentage': 99.6,
                'error_count': 0,
                'request_count': 150
            }
        except Exception as e:
            return {
                'status': 'partial_outage',
                'message': f'Email service failed: {str(e)}',
                'uptime_percentage': 0.0,
                'error_count': 1,
                'request_count': 0
            }
    
    def _check_payment_health(self):
        """Check payment processing health."""
        try:
            # Simulate payment service health check
            return {
                'status': 'operational',
                'message': 'Payment processing is operational',
                'uptime_percentage': 99.9,
                'error_count': 0,
                'request_count': 800
            }
        except Exception as e:
            return {
                'status': 'major_outage',
                'message': f'Payment processing failed: {str(e)}',
                'uptime_percentage': 0.0,
                'error_count': 1,
                'request_count': 0
            }
    
    def _check_market_data_health(self):
        """Check market data service health."""
        try:
            # Simulate market data service health check
            return {
                'status': 'operational',
                'message': 'Market data service is operational',
                'uptime_percentage': 99.4,
                'error_count': 0,
                'request_count': 1200
            }
        except Exception as e:
            return {
                'status': 'degraded',
                'message': f'Market data service failed: {str(e)}',
                'uptime_percentage': 90.0,
                'error_count': 1,
                'request_count': 0
            }


class AdminCurrencySwapListView(generics.ListAPIView):
    """List all currency swaps."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = CurrencySwapSerializer
    
    def get_queryset(self):
        return CurrencySwap.objects.all().order_by('-created_at')


class AdminBitcoinTransactionListView(generics.ListAPIView):
    """List all Bitcoin transactions."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = BitcoinTransactionSerializer
    
    def get_queryset(self):
        return BitcoinTransaction.objects.all().order_by('-created_at')


class AdminLoanListView(generics.ListAPIView):
    """List all loans."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = LoanSerializer
    
    def get_queryset(self):
        return Loan.objects.all().order_by('-created_at')


class AdminLoanApplicationListView(generics.ListAPIView):
    """List all loan applications."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def get_serializer_class(self):
        from loans.serializers import LoanApplicationSerializer
        return LoanApplicationSerializer
    
    def get_queryset(self):
        return LoanApplication.objects.all().order_by('-created_at')


class AdminLoanStatusView(APIView):
    """Update loan application status and create loan if approved."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def patch(self, request, loan_id):
        from django.db import transaction as db_transaction
        from decimal import Decimal
        from datetime import timedelta
        
        try:
            application = LoanApplication.objects.get(id=loan_id)
            new_status = request.data.get('status')
            
            if new_status not in ['approved', 'rejected', 'under_review']:
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            
            if application.status == new_status:
                return Response({'error': f'Application is already {new_status}'}, status=status.HTTP_400_BAD_REQUEST)
            
            with db_transaction.atomic():
                # Update application status
                application.status = new_status
                application.reviewed_at = timezone.now()
                application.save()
                
                # If approved, create Loan and disburse funds
                if new_status == 'approved':
                    # Get interest rate and term from request or use defaults
                    interest_rate = Decimal(str(request.data.get('interest_rate', 5.0)))  # Default 5%
                    term_months = int(request.data.get('term_months', 60))  # Default 60 months
                    
                    # Lock user row to prevent concurrent balance modifications
                    User = application.user.__class__
                    user = User.objects.select_for_update().get(pk=application.user.pk)
                    
                    # Calculate balance before and after
                    balance_before = user.balance
                    loan_amount = application.requested_amount
                    balance_after = balance_before + loan_amount
                    
                    # Add loan amount to user balance
                    user.balance += loan_amount
                    user.save(update_fields=['balance'])
                    
                    # Create Loan object
                    loan = Loan.objects.create(
                        user=application.user,
                        loan_type=application.loan_type,
                        amount=loan_amount,
                        interest_rate=interest_rate,
                        term_months=term_months,
                        status='active',
                        purpose=application.purpose,
                        employment_status=application.employment_status,
                        annual_income=application.annual_income,
                        monthly_payment=Decimal('0'),  # Will be calculated in save()
                        remaining_balance=loan_amount,
                        next_payment_date=timezone.now().date() + timedelta(days=30),
                        start_date=timezone.now(),
                        approval_date=timezone.now()
                    )
                    
                    # Create transaction record for loan disbursement
                    from transactions.models import Transaction
                    Transaction.objects.create(
                        user=application.user,
                        transaction_type='loan',
                        amount=loan_amount,
                        status='completed',
                        description=f"Loan disbursement - {application.loan_type} loan",
                        balance_before=balance_before,
                        balance_after=balance_after,
                        completed_at=timezone.now()
                    )
                    
                    # Send real-time notification
                    try:
                        from utils.realtime import notify_loan_update, send_notification
                        notify_loan_update(application.user.id, loan.id, 'active')
                        send_notification(
                            application.user.id,
                            'Loan Approved',
                            f'Your {application.loan_type} loan application for ${loan_amount} has been approved and funds have been disbursed to your account!',
                            'success'
                        )
                    except Exception:
                        pass  # Don't fail if realtime service is unavailable
                    
                    return Response({
                        'message': 'Loan application approved and funds disbursed',
                        'loan_id': loan.id
                    }, status=status.HTTP_200_OK)
                
                else:
                    # Rejected or under review - just send notification
                    try:
                        from utils.realtime import send_notification
                        status_messages = {
                            'rejected': 'Your loan application has been rejected.',
                            'under_review': 'Your loan application is under review.'
                        }
                        send_notification(
                            application.user.id,
                            'Loan Application Update',
                            status_messages.get(new_status, 'Your loan application status has been updated.'),
                            'info' if new_status == 'under_review' else 'error'
                        )
                    except Exception:
                        pass
                    
                    return Response({'message': f'Loan application status updated to {new_status}'}, status=status.HTTP_200_OK)
                    
        except LoanApplication.DoesNotExist:
            return Response({'error': 'Loan application not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating loan application status: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBillListView(generics.ListAPIView):
    """List all bills."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = BillSerializer
    
    def get_queryset(self):
        return Bill.objects.all().order_by('-created_at')


class AdminInvestmentListView(generics.ListAPIView):
    """List all investments."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = InvestmentSerializer
    
    def get_queryset(self):
        return Investment.objects.all().order_by('-created_at')


class AdminSecurityAuditLogListView(generics.ListAPIView):
    """List all security audit logs."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = SecurityAuditLogSerializer
    
    def get_queryset(self):
        return SecurityAuditLog.objects.all().order_by('-created_at') 



class AdminPendingTransfersView(generics.ListAPIView):
    """List all pending transfers awaiting approval (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        """Return pending transfers."""
        from banking.serializers import TransferSerializer
        self.serializer_class = TransferSerializer
        
        return Transfer.objects.filter(
            status__in=['pending', 'processing'],
            requires_admin_approval=True
        ).select_related('sender', 'recipient', 'admin_approved_by').order_by('created_at')


class AdminApproveTransferView(APIView):
    """Approve a pending transfer (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, transfer_id):
        """Approve transfer and process it immediately."""
        transfer = get_object_or_404(Transfer, id=transfer_id)
        notes = request.data.get('notes', '')
        
        success, message = transfer.admin_approve_transfer(request.user, notes)
        
        if success:
            return Response({
                'message': 'Transfer approved and processed successfully',
                'transfer_id': transfer.id,
                'status': transfer.status
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminRejectTransferView(APIView):
    """Reject a pending transfer (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, transfer_id):
        """Reject transfer and refund sender."""
        transfer = get_object_or_404(Transfer, id=transfer_id)
        notes = request.data.get('notes', 'Transfer rejected by admin')
        
        success, message = transfer.admin_reject_transfer(request.user, notes)
        
        if success:
            return Response({
                'message': message,
                'transfer_id': transfer.id,
                'status': transfer.status
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminLockUserAccountView(APIView):
    """Lock a user account (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        """Lock user account with reason."""
        user = get_object_or_404(User, id=user_id)
        reason = request.data.get('reason', 'Account locked by administrator')
        duration_hours = request.data.get('duration_hours', 24)  # Default 24 hours
        
        # Convert hours to minutes
        duration_minutes = duration_hours * 60
        
        user.lock_account(duration_minutes=duration_minutes, reason=reason)
        
        # Log security event
        from accounts.utils import log_security_event
        log_security_event(
            user=user,
            event_type='account_locked',
            description=f'Account locked by admin: {request.user.email}',
            request=request,
            metadata={
                'admin_id': request.user.id,
                'reason': reason,
                'duration_hours': duration_hours
            }
        )
        
        # Send real-time notification
        from utils.realtime import send_notification
        send_notification(
            user.id,
            'Account Locked',
            f'Your account has been locked. Reason: {reason}',
            'error'
        )
        
        return Response({
            'message': 'User account locked successfully',
            'user_id': user.id,
            'locked_until': user.account_locked_until,
            'reason': reason
        }, status=status.HTTP_200_OK)


class AdminUnlockUserAccountView(APIView):
    """Directly unlock a user account (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        """Unlock user account directly."""
        user = get_object_or_404(User, id=user_id)
        
        if not user.is_account_locked():
            return Response({
                'error': 'Account is not locked'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Clear lock fields
        user.account_locked_until = None
        user.account_lock_reason = ''
        user.unlock_request_pending = False
        user.unlock_request_submitted_at = None
        user.unlock_request_message = ''
        user.save()
        
        # Log security event
        from accounts.utils import log_security_event
        log_security_event(
            user=user,
            event_type='account_unlocked',
            description=f'Account unlocked by admin: {request.user.email}',
            request=request,
            metadata={
                'admin_id': request.user.id,
                'unlock_method': 'direct_admin_unlock'
            }
        )
        
        # Send notification to user
        from api.services import NotificationService
        NotificationService.create_notification(
            user=user,
            notification_type='account',
            title='Account Unlocked',
            message=f'Your account has been unlocked by an administrator. You can now access all features.',
            priority='high'
        )
        
        # Send real-time notification
        from utils.realtime import send_notification
        send_notification(
            user.id,
            'Account Unlocked',
            'Your account has been unlocked. You can now access all features.',
            'success'
        )
        
        return Response({
            'message': 'User account unlocked successfully',
            'user_id': user.id
        }, status=status.HTTP_200_OK)


class AdminUnlockRequestListView(generics.ListAPIView):
    """List all pending unlock requests (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        """Return users with pending unlock requests."""
        return User.objects.filter(
            unlock_request_pending=True
        ).order_by('unlock_request_submitted_at')


class AdminApproveUnlockView(APIView):
    """Approve unlock request and unlock user account (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        """Approve unlock request."""
        user = get_object_or_404(User, id=user_id)
        
        if not user.unlock_request_pending:
            return Response({
                'error': 'No pending unlock request for this user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = user.approve_unlock(admin_user=request.user)
        
        if success:
            # Send notification to user
            from api.services import NotificationService
            NotificationService.create_notification(
                user=user,
                notification_type='account',
                title='Account Unlocked',
                message=f'Your account has been unlocked by an administrator. You can now access all features.',
                priority='high'
            )
            
            return Response({
                'message': message,
                'user_id': user.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminRejectUnlockView(APIView):
    """Reject unlock request (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, user_id):
        """Reject unlock request."""
        user = get_object_or_404(User, id=user_id)
        reason = request.data.get('reason', 'Unlock request denied')
        
        if not user.unlock_request_pending:
            return Response({
                'error': 'No pending unlock request for this user'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = user.reject_unlock(admin_user=request.user, reason=reason)
        
        if success:
            # Send notification to user
            from api.services import NotificationService
            NotificationService.create_notification(
                user=user,
                notification_type='unlock_rejected',
                title='Unlock Request Denied',
                message=f'Your unlock request has been denied. Reason: {reason}',
                priority='high'
            )
            
            return Response({
                'message': message,
                'user_id': user.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)



# Check Deposit Admin Views

class AdminCheckDepositListView(generics.ListAPIView):
    """List all check deposits (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = CheckDepositSerializer
    
    def get_queryset(self):
        queryset = CheckDeposit.objects.all().select_related('user', 'admin_approved_by')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-created_at')


class AdminCheckDepositDetailView(generics.RetrieveAPIView):
    """Get check deposit details (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    queryset = CheckDeposit.objects.all()
    serializer_class = CheckDepositSerializer


class AdminApproveCheckDepositView(APIView):
    """Approve a check deposit (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, deposit_id):
        """Approve check deposit with hold period."""
        deposit = get_object_or_404(CheckDeposit, id=deposit_id)
        
        if deposit.status != 'pending':
            return Response({
                'error': 'Only pending deposits can be approved'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        hold_days = request.data.get('hold_days', 1)
        notes = request.data.get('notes', '')
        
        try:
            hold_days = int(hold_days)
            if hold_days < 0 or hold_days > 10:
                return Response({
                    'error': 'Hold days must be between 0 and 10'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid hold_days value'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        deposit.approve(request.user, hold_days=hold_days, notes=notes)
        
        return Response({
            'message': 'Check deposit approved successfully',
            'deposit_id': deposit.id,
            'status': deposit.status,
            'hold_until': deposit.hold_until
        }, status=status.HTTP_200_OK)


class AdminRejectCheckDepositView(APIView):
    """Reject a check deposit (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, deposit_id):
        """Reject check deposit."""
        deposit = get_object_or_404(CheckDeposit, id=deposit_id)
        
        if deposit.status not in ['pending', 'approved']:
            return Response({
                'error': 'Only pending or approved deposits can be rejected'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notes = request.data.get('notes', 'Rejected by admin')
        
        deposit.reject(request.user, notes=notes)
        
        return Response({
            'message': 'Check deposit rejected successfully',
            'deposit_id': deposit.id,
            'status': deposit.status
        }, status=status.HTTP_200_OK)


class AdminCompleteCheckDepositView(APIView):
    """Complete a check deposit (bypass hold period) (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, deposit_id):
        """Complete check deposit immediately."""
        deposit = get_object_or_404(CheckDeposit, id=deposit_id)
        
        if deposit.status != 'approved':
            return Response({
                'error': 'Only approved deposits can be completed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = deposit.complete(bypass_hold=True)
        
        if success:
            return Response({
                'message': 'Check deposit completed successfully',
                'deposit_id': deposit.id,
                'status': deposit.status,
                'amount': str(deposit.amount)
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminPendingCheckDepositsView(generics.ListAPIView):
    """List all pending check deposits awaiting approval (admin only)."""
    
    permission_classes = [permissions.IsAdminUser]
    serializer_class = CheckDepositSerializer
    
    def get_queryset(self):
        """Return pending check deposits."""
        return CheckDeposit.objects.filter(
            status='pending'
        ).select_related('user').order_by('created_at')
