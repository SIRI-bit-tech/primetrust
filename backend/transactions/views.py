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
    InvestmentSerializer, InvestmentPurchaseSerializer, InvestmentSellSerializer
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
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override list to update real-time prices before returning."""
        queryset = self.get_queryset()
        
        # Update real-time prices for active investments
        self._update_investment_prices(queryset)
        
        # Serialize and return
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def _update_investment_prices(self, investments):
        """Update current prices for all investments using real-time market data."""
        from api.market_services import get_stock_quotes, get_crypto_quotes
        
        # Group investments by type
        stock_investments = []
        crypto_investments = []
        
        for investment in investments:
            if investment.status != 'active':
                continue
                
            if investment.investment_type in ['stocks', 'etfs']:
                stock_investments.append(investment)
            elif investment.investment_type == 'crypto':
                crypto_investments.append(investment)
        
        # Fetch stock prices
        if stock_investments:
            stock_symbols = [inv.symbol for inv in stock_investments if inv.symbol]
            if stock_symbols:
                try:
                    stock_quotes = get_stock_quotes(stock_symbols)
                    for investment in stock_investments:
                        if investment.symbol in stock_quotes:
                            new_price = stock_quotes[investment.symbol].get('price', 0)
                            if new_price > 0:
                                investment.update_current_value(new_price)
                except Exception:
                    pass  # Silently fail if market data unavailable
        
        # Fetch crypto prices
        if crypto_investments:
            crypto_symbols = [inv.symbol for inv in crypto_investments if inv.symbol]
            if crypto_symbols:
                try:
                    crypto_quotes = get_crypto_quotes(crypto_symbols)
                    for investment in crypto_investments:
                        if investment.symbol in crypto_quotes:
                            new_price = crypto_quotes[investment.symbol].get('price', 0)
                            if new_price > 0:
                                investment.update_current_value(new_price)
                except Exception:
                    pass  # Silently fail if market data unavailable


class InvestmentPurchaseView(generics.CreateAPIView):
    """Purchase a new investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvestmentPurchaseSerializer
    
    def perform_create(self, serializer):
        investment = serializer.save(user=self.request.user)
        
        # Trigger notification for investment purchase
        try:
            trigger_investment_notification(self.request.user, investment, 'purchased')
        except:
            pass  # Don't fail if notification fails
        
        # Send real-time notification via WebSocket
        try:
            from socketio_app.utils import send_notification, notify_balance_update
            send_notification(
                self.request.user.id,
                'Investment Purchased',
                f'Successfully purchased {investment.name} ({investment.symbol}) for ${investment.amount_invested}',
                'success'
            )
            notify_balance_update(self.request.user.id, self.request.user.balance)
        except:
            pass


class InvestmentDetailView(generics.RetrieveAPIView):
    """Get details of a specific investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvestmentSerializer
    
    def get_queryset(self):
        return Investment.objects.filter(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to update real-time price before returning."""
        instance = self.get_object()
        
        # Update real-time price for active investment
        if instance.status == 'active' and instance.symbol:
            self._update_investment_price(instance)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def _update_investment_price(self, investment):
        """Update current price for a single investment."""
        from api.market_services import get_stock_quotes, get_crypto_quotes
        
        try:
            if investment.investment_type in ['stocks', 'etfs']:
                quotes = get_stock_quotes([investment.symbol])
                if investment.symbol in quotes:
                    new_price = quotes[investment.symbol].get('price', 0)
                    if new_price > 0:
                        investment.update_current_value(new_price)
            elif investment.investment_type == 'crypto':
                quotes = get_crypto_quotes([investment.symbol])
                if investment.symbol in quotes:
                    new_price = quotes[investment.symbol].get('price', 0)
                    if new_price > 0:
                        investment.update_current_value(new_price)
        except Exception:
            pass  # Silently fail if market data unavailable


class InvestmentSellView(APIView):
    """Sell an investment."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        investment = get_object_or_404(Investment, pk=pk, user=request.user)
        
        # Get quantity to sell (optional)
        serializer = InvestmentSellSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        quantity = serializer.validated_data.get('quantity')
        
        # Sell the investment
        success, message = investment.sell_investment(quantity)
        
        if success:
            # Trigger notification
            try:
                trigger_investment_notification(request.user, investment, 'sold')
            except:
                pass
            
            # Send real-time notification via WebSocket
            try:
                from socketio_app.utils import send_notification, notify_balance_update
                send_notification(
                    request.user.id,
                    'Investment Sold',
                    f'Successfully sold {investment.name} ({investment.symbol})',
                    'success'
                )
                notify_balance_update(request.user.id, request.user.balance)
            except:
                pass
            
            # Return updated investment
            serializer = InvestmentSerializer(investment)
            return Response({
                'message': message,
                'investment': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


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
