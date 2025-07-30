from django.urls import path
from . import views

app_name = 'admin_api'

urlpatterns = [
    # Admin authentication
    path('auth/', views.AdminAuthView.as_view(), name='admin-auth'),
    
    # User management
    path('users/', views.AdminUserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/balance/', views.AdminUserBalanceView.as_view(), name='user-balance'),
    path('users/<int:pk>/bitcoin-balance/', views.AdminUserBitcoinBalanceView.as_view(), name='user-bitcoin-balance'),
    
    # Transaction management
    path('transactions/', views.AdminTransactionListView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/', views.AdminTransactionDetailView.as_view(), name='transaction-detail'),
    path('transactions/<int:pk>/status/', views.AdminTransactionStatusView.as_view(), name='transaction-status'),
    
    # Virtual card management
    path('cards/', views.AdminVirtualCardListView.as_view(), name='card-list'),
    path('cards/<int:pk>/', views.AdminVirtualCardDeleteView.as_view(), name='card-delete'),
    
    # Card application management
    path('card-applications/', views.AdminCardApplicationListView.as_view(), name='card-application-list'),
    path('card-applications/<int:pk>/status/', views.AdminCardApplicationStatusView.as_view(), name='card-application-status'),
    
    # Notification management
    path('notifications/', views.AdminNotificationListView.as_view(), name='notification-list'),
    
    # Dashboard
    path('dashboard/', views.AdminDashboardView.as_view(), name='dashboard'),
] 