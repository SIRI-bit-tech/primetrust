from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    # Market data
    path('market-data/', views.MarketDataView.as_view(), name='market-data'),
    path('market-data/stocks/', views.StockDataView.as_view(), name='stock-data'),
    path('market-data/crypto/', views.CryptoDataView.as_view(), name='crypto-data'),
    path('available-investments/', views.AvailableInvestmentsView.as_view(), name='available-investments'),
    
    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/settings/', views.NotificationSettingsView.as_view(), name='notification-settings'),
    
    # System information
    path('system/status/', views.SystemStatusView.as_view(), name='system-status'),
    path('system/health/', views.HealthCheckView.as_view(), name='health-check'),
    path('system/version/', views.VersionInfoView.as_view(), name='version-info'),
    
    # Search
    path('search/', views.SearchView.as_view(), name='search'),
    path('search/transactions/', views.TransactionSearchView.as_view(), name='transaction-search'),
    path('search/users/', views.UserSearchView.as_view(), name='user-search'),
    
    # Dashboard data
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('dashboard/summary/', views.DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/charts/', views.DashboardChartsView.as_view(), name='dashboard-charts'),
    
    # Support
    path('support/contact/', views.SupportContactView.as_view(), name='support-contact'),
    path('support/faq/', views.FAQView.as_view(), name='faq'),
    path('support/ticket/', views.SupportTicketView.as_view(), name='support-ticket'),
] 