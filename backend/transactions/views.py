from rest_framework import status, generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
import csv
import json

from .models import Transaction, Bill, Investment
from .serializers import (
    TransactionSerializer, BillSerializer, BillCreateSerializer,
    InvestmentSerializer, InvestmentCreateSerializer
)
from api.services import trigger_transaction_notification, trigger_bill_notification, trigger_investment_notification


# Transaction Views
class TransactionListView(generics.ListAPIView):
    """List all transactions for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.filter(user=user)
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount')
        max_amount = self.request.query_params.get('max_amount')
        
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        
        return queryset.order_by('-created_at')


class TransactionDetailView(generics.RetrieveAPIView):
    """Get details of a specific transaction."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


class TransactionReverseView(APIView):
    """Reverse a completed transaction."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        transaction = get_object_or_404(Transaction, pk=pk, user=request.user)
        
        success, message = transaction.reverse_transaction()
        
        if success:
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


# Bill Views
class BillListView(generics.ListAPIView):
    """List all bills for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BillSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Bill.objects.filter(user=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(biller_category=category)
        
        # Filter by due date
        due_before = self.request.query_params.get('due_before')
        if due_before:
            queryset = queryset.filter(due_date__lte=due_before)
        
        return queryset.order_by('due_date')


class BillCreateView(generics.CreateAPIView):
    """Create a new bill."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BillCreateSerializer
    
    def perform_create(self, serializer):
        bill = serializer.save(user=self.request.user)
        # Trigger notification for new bill
        trigger_bill_notification(self.request.user, bill, 'added')


class BillDetailView(generics.RetrieveAPIView):
    """Get details of a specific bill."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BillSerializer
    
    def get_queryset(self):
        return Bill.objects.filter(user=self.request.user)


class BillUpdateView(generics.UpdateAPIView):
    """Update bill information."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BillSerializer
    
    def get_queryset(self):
        return Bill.objects.filter(user=self.request.user)


class BillDeleteView(generics.DestroyAPIView):
    """Delete a bill."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Bill.objects.filter(user=self.request.user)


class BillPayView(APIView):
    """Pay a bill."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        bill = get_object_or_404(Bill, pk=pk, user=request.user)
        payment_amount = request.data.get('amount')
        
        success, message = bill.pay_bill(payment_amount)
        
        if success:
            # Trigger notification for bill payment
            trigger_bill_notification(request.user, bill, 'paid')
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


# Investment Views
class InvestmentListView(generics.ListAPIView):
    """List all investments for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvestmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Investment.objects.filter(user=user)
        
        # Filter by investment type
        investment_type = self.request.query_params.get('type')
        if investment_type:
            queryset = queryset.filter(investment_type=investment_type)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)
        
        return queryset.order_by('-created_at')


class InvestmentCreateView(generics.CreateAPIView):
    """Create a new investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvestmentCreateSerializer
    
    def perform_create(self, serializer):
        investment = serializer.save(user=self.request.user)
        
        # Process the investment
        success, message = investment.process_investment()
        
        if not success:
            raise serializers.ValidationError(message)
        else:
            # Trigger notification for investment purchase
            trigger_investment_notification(self.request.user, investment, 'purchased')


class InvestmentDetailView(generics.RetrieveAPIView):
    """Get details of a specific investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvestmentSerializer
    
    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)


class InvestmentSellView(APIView):
    """Sell an investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        investment = get_object_or_404(Investment, pk=pk, user=request.user)
        
        # Create sell investment
        sell_data = {
            'investment_type': investment.investment_type,
            'action': 'sell',
            'symbol': investment.symbol,
            'company_name': investment.company_name,
            'quantity': investment.quantity,
            'price_per_share': request.data.get('price_per_share'),
            'total_amount': request.data.get('total_amount'),
            'currency': investment.currency
        }
        
        serializer = InvestmentCreateSerializer(data=sell_data)
        if serializer.is_valid():
            sell_investment = serializer.save(user=request.user)
            success, message = sell_investment.process_investment()
            
            if success:
                return Response({'message': 'Investment sold successfully'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Analytics and Reports Views
class TransactionAnalyticsView(APIView):
    """Get transaction analytics."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get date range
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get transactions in date range
        transactions = Transaction.objects.filter(
            user=user,
            created_at__gte=start_date
        )
        
        # Calculate analytics
        total_transactions = transactions.count()
        total_amount = transactions.aggregate(total=Sum('amount'))['total'] or 0
        
        # Transaction type breakdown
        type_breakdown = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        )
        
        # Daily spending
        daily_spending = transactions.filter(
            transaction_type__in=['payment', 'withdrawal', 'transfer']
        ).values('created_at__date').annotate(
            daily_total=Sum('amount')
        ).order_by('created_at__date')
        
        # Top merchants
        top_merchants = transactions.exclude(
            merchant_name=''
        ).values('merchant_name').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('-total_amount')[:10]
        
        analytics = {
            'period': f'Last {days} days',
            'total_transactions': total_transactions,
            'total_amount': str(total_amount),
            'type_breakdown': list(type_breakdown),
            'daily_spending': list(daily_spending),
            'top_merchants': list(top_merchants)
        }
        
        return Response(analytics, status=status.HTTP_200_OK)


class TransactionReportView(APIView):
    """Generate transaction reports."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        report_type = request.query_params.get('type', 'monthly')
        
        if report_type == 'monthly':
            # Monthly report
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            transactions = Transaction.objects.filter(
                user=user,
                created_at__month=current_month,
                created_at__year=current_year
            )
            
            report_data = {
                'period': f'{current_month}/{current_year}',
                'total_transactions': transactions.count(),
                'total_spending': str(transactions.filter(
                    transaction_type__in=['payment', 'withdrawal', 'transfer']
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'total_income': str(transactions.filter(
                    transaction_type__in=['deposit', 'refund']
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'transaction_types': list(transactions.values('transaction_type').annotate(
                    count=Count('id'),
                    total=Sum('amount')
                ))
            }
        
        elif report_type == 'yearly':
            # Yearly report
            current_year = timezone.now().year
            
            transactions = Transaction.objects.filter(
                user=user,
                created_at__year=current_year
            )
            
            report_data = {
                'period': str(current_year),
                'total_transactions': transactions.count(),
                'total_spending': str(transactions.filter(
                    transaction_type__in=['payment', 'withdrawal', 'transfer']
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'total_income': str(transactions.filter(
                    transaction_type__in=['deposit', 'refund']
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'monthly_breakdown': list(transactions.values('created_at__month').annotate(
                    count=Count('id'),
                    total=Sum('amount')
                ).order_by('created_at__month'))
            }
        
        else:
            return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(report_data, status=status.HTTP_200_OK)


class TransactionExportView(APIView):
    """Export transactions to CSV."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = Transaction.objects.filter(user=user)
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="transactions_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Type', 'Description', 'Amount', 'Currency', 'Status',
            'Reference Number', 'Merchant', 'Category'
        ])
        
        for transaction in queryset:
            writer.writerow([
                transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                transaction.transaction_type,
                transaction.description,
                transaction.amount,
                transaction.currency,
                transaction.status,
                transaction.reference_number,
                transaction.merchant_name,
                transaction.merchant_category
            ])
        
        return response
