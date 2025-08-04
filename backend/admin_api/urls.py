from django.urls import path
from . import views

app_name = 'admin_api'

urlpatterns = [
    # Existing endpoints
    path('admin-auth/', views.AdminAuthView.as_view(), name='admin-auth'),
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('users/', views.AdminUserListView.as_view(), name='admin-users'),
    path('users/<int:user_id>/delete/', views.AdminUserDeleteView.as_view(), name='admin-user-delete'),
    path('users/<int:user_id>/balance/', views.AdminUserBalanceView.as_view(), name='admin-user-balance'),
    path('users/<int:user_id>/bitcoin-balance/', views.AdminUserBitcoinBalanceView.as_view(), name='admin-user-bitcoin-balance'),
    path('transactions/', views.AdminTransactionListView.as_view(), name='admin-transactions'),
    path('transactions/<int:transaction_id>/status/', views.AdminTransactionStatusView.as_view(), name='admin-transaction-status'),
    path('cards/', views.AdminVirtualCardListView.as_view(), name='admin-cards'),
    path('cards/<int:card_id>/delete/', views.AdminVirtualCardDeleteView.as_view(), name='admin-card-delete'),
    path('applications/', views.AdminCardApplicationListView.as_view(), name='admin-applications'),
    path('applications/<int:application_id>/status/', views.AdminCardApplicationStatusView.as_view(), name='admin-application-status'),
    path('applications/<int:application_id>/complete/', views.AdminCardApplicationCompleteView.as_view(), name='admin-application-complete'),
    path('notifications/', views.AdminNotificationListView.as_view(), name='admin-notifications'),
    
    # New endpoints
    path('system-status/', views.AdminSystemStatusView.as_view(), name='admin-system-status'),
    path('currency-swaps/', views.AdminCurrencySwapListView.as_view(), name='admin-currency-swaps'),
    path('bitcoin-transactions/', views.AdminBitcoinTransactionListView.as_view(), name='admin-bitcoin-transactions'),
    path('loans/', views.AdminLoanListView.as_view(), name='admin-loans'),
    path('loan-applications/', views.AdminLoanApplicationListView.as_view(), name='admin-loan-applications'),
    path('loans/<int:loan_id>/status/', views.AdminLoanStatusView.as_view(), name='admin-loan-status'),
    path('bills/', views.AdminBillListView.as_view(), name='admin-bills'),
    path('investments/', views.AdminInvestmentListView.as_view(), name='admin-investments'),
    path('security-logs/', views.AdminSecurityAuditLogListView.as_view(), name='admin-security-logs'),
] 