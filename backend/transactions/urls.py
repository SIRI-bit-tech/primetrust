from django.urls import path
from . import views

app_name = 'transactions'

urlpatterns = [
    # Transactions
    path('', views.TransactionListView.as_view(), name='transaction-list'),
    path('<int:pk>/', views.TransactionDetailView.as_view(), name='transaction-detail'),
    path('<int:pk>/reverse/', views.TransactionReverseView.as_view(), name='transaction-reverse'),
    
    # Bills
    path('bills/', views.BillListView.as_view(), name='bill-list'),
    path('bills/create/', views.BillCreateView.as_view(), name='bill-create'),
    path('bills/<int:pk>/', views.BillDetailView.as_view(), name='bill-detail'),
    path('bills/<int:pk>/update/', views.BillUpdateView.as_view(), name='bill-update'),
    path('bills/<int:pk>/delete/', views.BillDeleteView.as_view(), name='bill-delete'),
    path('bills/<int:pk>/pay/', views.BillPayView.as_view(), name='bill-pay'),
    
    # Investments
    path('investments/', views.InvestmentListView.as_view(), name='investment-list'),
    path('investments/create/', views.InvestmentCreateView.as_view(), name='investment-create'),
    path('investments/<int:pk>/', views.InvestmentDetailView.as_view(), name='investment-detail'),
    path('investments/<int:pk>/sell/', views.InvestmentSellView.as_view(), name='investment-sell'),
    
    # Analytics and reports
    path('analytics/', views.TransactionAnalyticsView.as_view(), name='transaction-analytics'),
    path('reports/', views.TransactionReportView.as_view(), name='transaction-report'),
    path('export/', views.TransactionExportView.as_view(), name='transaction-export'),
] 