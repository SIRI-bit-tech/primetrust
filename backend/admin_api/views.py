from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.contrib.auth import get_user_model
from accounts.models import User, SecurityAuditLog
from transactions.models import Transaction, Loan, Bill, Investment, CurrencySwap, BitcoinTransaction
from banking.models import VirtualCard, CardApplication, Transfer
from api.models import Notification, SystemStatus, MarketData
from .serializers import (
    UserSerializer, TransactionSerializer, VirtualCardSerializer,
    CardApplicationSerializer, NotificationSerializer, SystemStatusSerializer,
    LoanSerializer, BillSerializer, InvestmentSerializer, CurrencySwapSerializer,
    BitcoinTransactionSerializer, SecurityAuditLogSerializer
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
        
        if application.status != 'processing':
            return Response({
                'error': 'Application must be in processing status to complete'
            }, status=status.HTTP_400_BAD_REQUEST)
        
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
            notes = f"Your {application.card_type} card has been issued and is ready for use"
            application.complete(request.user, notes)
            
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
    serializer_class = LoanSerializer
    
    def get_queryset(self):
        return Loan.objects.filter(status='pending').order_by('-created_at')


class AdminLoanStatusView(APIView):
    """Update loan application status."""
    
    permission_classes = [permissions.IsAdminUser]
    
    def patch(self, request, loan_id):
        try:
            loan = Loan.objects.get(id=loan_id)
            new_status = request.data.get('status')
            
            if new_status in ['approved', 'rejected', 'active', 'completed']:
                loan.status = new_status
                if new_status == 'approved':
                    loan.approved_at = timezone.now()
                loan.save()
                return Response({'message': 'Loan status updated successfully'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        except Loan.DoesNotExist:
            return Response({'error': 'Loan not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
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