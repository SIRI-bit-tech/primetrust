from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum
from django.utils import timezone

from .models import Loan, LoanApplication
from .serializers import (
    LoanSerializer, LoanCreateSerializer, LoanApplicationSerializer, LoanPaymentSerializer
)


class LoanListView(generics.ListAPIView):
    """List all loans for the authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Loan.objects.filter(user=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by loan type
        loan_type = self.request.query_params.get('type')
        if loan_type:
            queryset = queryset.filter(loan_type=loan_type)
        
        return queryset.order_by('-created_at')


class LoanCreateView(generics.CreateAPIView):
    """Create a new loan."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanCreateSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LoanDetailView(generics.RetrieveAPIView):
    """Get details of a specific loan."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanSerializer
    
    def get_queryset(self):
        return Loan.objects.filter(user=self.request.user)


class LoanPayView(APIView):
    """Make a payment on a loan."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        loan = get_object_or_404(Loan, pk=pk, user=request.user)
        serializer = LoanPaymentSerializer(data=request.data)
        
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            success, message = loan.make_payment(amount)
            
            if success:
                return Response({
                    'message': message,
                    'loan': LoanSerializer(loan).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoanApplicationListView(generics.ListCreateAPIView):
    """List and create loan applications."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanApplicationSerializer
    
    def get_queryset(self):
        return LoanApplication.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LoanApplicationDetailView(generics.RetrieveAPIView):
    """Get details of a specific loan application."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoanApplicationSerializer
    
    def get_queryset(self):
        return LoanApplication.objects.filter(user=self.request.user)


class LoanApplicationSubmitView(APIView):
    """Submit a loan application."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        application = get_object_or_404(LoanApplication, pk=pk, user=request.user)
        success, message = application.submit_application()
        
        if success:
            return Response({'message': message}, status=status.HTTP_200_OK)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


class LoanAnalyticsView(APIView):
    """Get loan analytics for the user."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        loans = Loan.objects.filter(user=user)
        
        # Calculate analytics
        total_loans = loans.count()
        active_loans = loans.filter(status='active').count()
        total_borrowed = loans.aggregate(total=Sum('amount'))['total'] or 0
        total_remaining = loans.filter(status='active').aggregate(total=Sum('remaining_balance'))['total'] or 0
        total_paid = loans.aggregate(total=Sum('total_paid'))['total'] or 0
        
        # Monthly payment total
        monthly_payments = loans.filter(status='active').aggregate(total=Sum('monthly_payment'))['total'] or 0
        
        analytics = {
            'total_loans': total_loans,
            'active_loans': active_loans,
            'total_borrowed': str(total_borrowed),
            'total_remaining': str(total_remaining),
            'total_paid': str(total_paid),
            'monthly_payments': str(monthly_payments),
            'loan_types': list(loans.values('loan_type').annotate(count=Sum('id')))
        }
        
        return Response(analytics, status=status.HTTP_200_OK) 