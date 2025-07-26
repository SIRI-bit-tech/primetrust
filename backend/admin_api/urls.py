from django.urls import path
from . import views

app_name = 'admin_api'

urlpatterns = [
    # User management
    path('users/', views.AdminUserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/balance/', views.AdminUserBalanceView.as_view(), name='user-balance'),
    
    # Transaction management
    path('transactions/', views.AdminTransactionListView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/', views.AdminTransactionDetailView.as_view(), name='transaction-detail'),
    path('transactions/<int:pk>/status/', views.AdminTransactionStatusView.as_view(), name='transaction-status'),
    
    # Dashboard
    path('dashboard/', views.AdminDashboardView.as_view(), name='dashboard'),
] 