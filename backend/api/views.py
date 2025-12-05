from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum
from django.utils import timezone
from django.conf import settings
import requests
import json

from .models import Notification, MarketData, SystemStatus, SupportTicket, FAQ, SearchLog
from .serializers import (
    NotificationSerializer, MarketDataSerializer, SystemStatusSerializer,
    SupportTicketSerializer, FAQSerializer, SearchLogSerializer
)
from accounts.models import User
from transactions.models import Transaction
from banking.models import Transfer


# Market Data Views
class MarketDataView(APIView):
    """Get market data for stocks and cryptocurrencies."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            from .market_services import get_market_data
            
            # Get real-time market data
            data = get_market_data()
            data['last_updated'] = timezone.now()
            
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StockDataView(APIView):
    """Get stock market data."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            stocks = MarketData.objects.filter(data_type='stock')
            serializer = MarketDataSerializer(stocks, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CryptoDataView(APIView):
    """Get cryptocurrency market data."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            crypto = MarketData.objects.filter(data_type='crypto')
            serializer = MarketDataSerializer(crypto, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AvailableInvestmentsView(APIView):
    """Get available investments by type with current prices."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            from .market_services import get_available_investments
            
            investment_type = request.query_params.get('type', 'stocks')
            data = get_available_investments(investment_type)
            
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Notification Views
class NotificationListView(generics.ListAPIView):
    """List notifications for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationDetailView(generics.RetrieveAPIView):
    """Get details of a specific notification."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.mark_as_read()
        return super().retrieve(request, *args, **kwargs)


class NotificationMarkReadView(APIView):
    """Mark notifications as read."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        notification_ids = request.data.get('notification_ids', [])
        
        if notification_ids:
            Notification.objects.filter(
                id__in=notification_ids,
                user=request.user
            ).update(is_read=True, read_at=timezone.now())
        else:
            # Mark all notifications as read
            Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        
        return Response({'message': 'Notifications marked as read'}, status=status.HTTP_200_OK)


class NotificationSettingsView(APIView):
    """Get and update notification settings."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        settings = {
            'email_notifications': user.profile.receive_email_notifications,
            'sms_notifications': user.profile.receive_sms_notifications,
            'marketing_emails': user.profile.receive_marketing_emails,
        }
        return Response(settings, status=status.HTTP_200_OK)
    
    def post(self, request):
        user = request.user
        profile = user.profile
        
        profile.receive_email_notifications = request.data.get('email_notifications', profile.receive_email_notifications)
        profile.receive_sms_notifications = request.data.get('sms_notifications', profile.receive_sms_notifications)
        profile.receive_marketing_emails = request.data.get('marketing_emails', profile.receive_marketing_emails)
        profile.save()
        
        return Response({'message': 'Notification settings updated'}, status=status.HTTP_200_OK)


# System Information Views
class SystemStatusView(APIView):
    """Get system status information."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            status_data = SystemStatus.objects.all()
            serializer = SystemStatusSerializer(status_data, many=True)
            
            # Calculate overall system status
            components = serializer.data
            overall_status = 'operational'
            
            for component in components:
                if component['status'] == 'major_outage':
                    overall_status = 'major_outage'
                    break
                elif component['status'] == 'partial_outage' and overall_status == 'operational':
                    overall_status = 'partial_outage'
                elif component['status'] == 'degraded' and overall_status == 'operational':
                    overall_status = 'degraded'
            
            return Response({
                'overall_status': overall_status,
                'components': components,
                'last_updated': timezone.now()
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HealthCheckView(APIView):
    """Health check endpoint."""
    
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        try:
            # Basic health checks
            checks = {
                'database': 'healthy',
                'redis': 'healthy',
                'celery': 'healthy',
                'api': 'healthy'
            }
            
            # Check database
            try:
                User.objects.count()
            except:
                checks['database'] = 'unhealthy'
            
            # Check Redis (if configured)
            try:
                from django.core.cache import cache
                cache.set('health_check', 'ok', 10)
                if cache.get('health_check') != 'ok':
                    checks['redis'] = 'unhealthy'
            except:
                checks['redis'] = 'unhealthy'
            
            overall_health = 'healthy' if all(status == 'healthy' for status in checks.values()) else 'unhealthy'
            
            return Response({
                'status': overall_health,
                'checks': checks,
                'timestamp': timezone.now()
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': timezone.now()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VersionInfoView(APIView):
    """Get API version information."""
    
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        version_info = {
            'version': '1.0.0',
            'api_version': 'v1',
            'django_version': '5.2.4',
            'python_version': '3.11+',
            'build_date': '2024-01-01',
            'environment': 'production' if not settings.DEBUG else 'development'
        }
        return Response(version_info, status=status.HTTP_200_OK)


# Search Views
class SearchView(APIView):
    """General search endpoint."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        search_type = request.query_params.get('type', 'general')
        
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Log search
        SearchLog.objects.create(
            user=request.user,
            query=query,
            search_type=search_type,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        results = {}
        
        if search_type == 'transaction':
            transactions = Transaction.objects.filter(
                Q(description__icontains=query) | Q(reference_number__icontains=query),
                user=request.user
            )[:10]
            results['transactions'] = [{'id': t.id, 'description': t.description, 'amount': str(t.amount)} for t in transactions]
        
        elif search_type == 'user':
            users = User.objects.filter(
                Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(email__icontains=query)
            )[:10]
            results['users'] = [{'id': u.id, 'name': u.get_full_name(), 'email': u.email} for u in users]
        
        return Response({
            'query': query,
            'type': search_type,
            'results': results
        }, status=status.HTTP_200_OK)


class TransactionSearchView(APIView):
    """Search transactions."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        transactions = Transaction.objects.filter(
            Q(description__icontains=query) | Q(reference_number__icontains=query) | Q(merchant_name__icontains=query),
            user=request.user
        )
        
        results = [{'id': t.id, 'description': t.description, 'amount': str(t.amount), 'date': t.created_at} for t in transactions]
        
        return Response({'results': results}, status=status.HTTP_200_OK)


class UserSearchView(APIView):
    """Search users."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        users = User.objects.filter(
            Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(email__icontains=query)
        )
        
        results = [{'id': u.id, 'name': u.get_full_name(), 'email': u.email} for u in users]
        
        return Response({'results': results}, status=status.HTTP_200_OK)


# Dashboard Views
class DashboardView(APIView):
    """Get dashboard data."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get recent transactions
        recent_transactions = Transaction.objects.filter(user=user).order_by('-created_at')[:5]
        
        # Get account balance
        balance = user.balance
        
        # Get notification count
        unread_notifications = Notification.objects.filter(user=user, is_read=False).count()
        
        # Get pending transfers
        pending_transfers = Transfer.objects.filter(sender=user, status='pending').count()
        
        dashboard_data = {
            'balance': str(balance),
            'unread_notifications': unread_notifications,
            'pending_transfers': pending_transfers,
            'recent_transactions': [
                {
                    'id': t.id,
                    'description': t.description,
                    'amount': str(t.amount),
                    'type': t.transaction_type,
                    'date': t.created_at
                } for t in recent_transactions
            ]
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)


class DashboardSummaryView(APIView):
    """Get dashboard summary."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Calculate monthly spending
        from datetime import datetime, timedelta
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        monthly_spending = Transaction.objects.filter(
            user=user,
            transaction_type__in=['payment', 'withdrawal', 'transfer'],
            created_at__gte=start_of_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Get account status
        account_status = {
            'is_verified': user.is_verified,
            'email_verified': user.email_verified,
            'phone_verified': user.phone_verified,
            'two_factor_enabled': user.two_factor_enabled
        }
        
        summary = {
            'monthly_spending': str(monthly_spending),
            'account_status': account_status,
            'last_activity': user.last_activity
        }
        
        return Response(summary, status=status.HTTP_200_OK)


class DashboardChartsView(APIView):
    """Get chart data for dashboard."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get transaction data for the last 30 days
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        transactions = Transaction.objects.filter(
            user=user,
            created_at__gte=start_date
        ).values('created_at__date', 'transaction_type').annotate(
            total=Sum('amount')
        ).order_by('created_at__date')
        
        chart_data = {
            'labels': [],
            'datasets': []
        }
        
        # Process transaction data for charts
        dates = []
        amounts = []
        
        for t in transactions:
            dates.append(t['created_at__date'].strftime('%Y-%m-%d'))
            amounts.append(float(t['total']))
        
        chart_data['labels'] = dates
        chart_data['datasets'] = [{
            'label': 'Daily Spending',
            'data': amounts,
            'borderColor': 'rgb(75, 192, 192)',
            'backgroundColor': 'rgba(75, 192, 192, 0.2)'
        }]
        
        return Response(chart_data, status=status.HTTP_200_OK)


# Support Views
class SupportContactView(APIView):
    """Contact support."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        subject = request.data.get('subject')
        message = request.data.get('message')
        
        if not subject or not message:
            return Response({'error': 'Subject and message are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create support ticket
        ticket = SupportTicket.objects.create(
            user=request.user,
            category='general',
            subject=subject,
            description=message
        )
        
        return Response({
            'message': 'Support ticket created successfully',
            'ticket_number': ticket.ticket_number
        }, status=status.HTTP_201_CREATED)


class FAQView(generics.ListAPIView):
    """Get frequently asked questions."""
    
    permission_classes = [permissions.AllowAny]
    serializer_class = FAQSerializer
    
    def get_queryset(self):
        category = self.request.query_params.get('category')
        queryset = FAQ.objects.filter(is_published=True)
        
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset


class SupportTicketView(generics.CreateAPIView):
    """Create a support ticket."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SupportTicketSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
