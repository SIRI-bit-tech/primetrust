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
    path('transactions/<int:pk>/status/', views.AdminTransactionStatusView.as_view(), name='admin-transaction-status'),
    path('transfers/<int:pk>/status/', views.AdminTransferStatusView.as_view(), name='admin-transfer-status'),
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
    path('loan-applications/<int:loan_id>/status/', views.AdminLoanStatusView.as_view(), name='admin-loan-status'),
    path('bills/', views.AdminBillListView.as_view(), name='admin-bills'),
    path('investments/', views.AdminInvestmentListView.as_view(), name='admin-investments'),
    path('security-logs/', views.AdminSecurityAuditLogListView.as_view(), name='admin-security-logs'),
    
    # Transfer approval endpoints
    path('pending-transfers/', views.AdminPendingTransfersView.as_view(), name='admin-pending-transfers'),
    path('transfers/<int:transfer_id>/approve/', views.AdminApproveTransferView.as_view(), name='admin-approve-transfer'),
    path('transfers/<int:transfer_id>/reject/', views.AdminRejectTransferView.as_view(), name='admin-reject-transfer'),
    
    # Account locking endpoints
    path('users/<int:user_id>/lock/', views.AdminLockUserAccountView.as_view(), name='admin-lock-user'),
    path('users/<int:user_id>/unlock/', views.AdminUnlockUserAccountView.as_view(), name='admin-unlock-user'),
    path('unlock-requests/', views.AdminUnlockRequestListView.as_view(), name='admin-unlock-requests'),
    path('users/<int:user_id>/unlock/approve/', views.AdminApproveUnlockView.as_view(), name='admin-approve-unlock'),
    path('users/<int:user_id>/unlock/reject/', views.AdminRejectUnlockView.as_view(), name='admin-reject-unlock'),
    
    # Check deposit endpoints
    path('check-deposits/', views.AdminCheckDepositListView.as_view(), name='admin-check-deposits'),
    path('check-deposits/<int:pk>/', views.AdminCheckDepositDetailView.as_view(), name='admin-check-deposit-detail'),
    path('check-deposits/<int:deposit_id>/approve/', views.AdminApproveCheckDepositView.as_view(), name='admin-approve-check-deposit'),
    path('check-deposits/<int:deposit_id>/reject/', views.AdminRejectCheckDepositView.as_view(), name='admin-reject-check-deposit'),
    path('check-deposits/<int:deposit_id>/complete/', views.AdminCompleteCheckDepositView.as_view(), name='admin-complete-check-deposit'),
    path('pending-check-deposits/', views.AdminPendingCheckDepositsView.as_view(), name='admin-pending-check-deposits'),
] 