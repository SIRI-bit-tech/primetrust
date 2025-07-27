from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    
    # Email verification
    path('verify-email/', views.EmailVerificationView.as_view(), name='verify-email'),
    path('resend-verification/', views.resend_verification_email, name='resend-verification'),
    
    # Password management
    path('password-reset-request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/', views.PasswordResetView.as_view(), name='password-reset'),
    path('password-change/', views.PasswordChangeView.as_view(), name='password-change'),
    
    # User profile
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('update/', views.UserUpdateView.as_view(), name='update'),
    path('balance/', views.BalanceView.as_view(), name='balance'),
    path('account-info/', views.AccountInfoView.as_view(), name='account-info'),
    
    # Security
    path('two-factor-setup/', views.TwoFactorSetupView.as_view(), name='two-factor-setup'),
    path('account-status/', views.AccountStatusView.as_view(), name='account-status'),
    
    # Bitcoin
    path('bitcoin/balance/', views.BitcoinBalanceView.as_view(), name='bitcoin-balance'),
    path('bitcoin/price/', views.BitcoinPriceView.as_view(), name='bitcoin-price'),
    path('bitcoin/send/', views.BitcoinSendView.as_view(), name='bitcoin-send'),
    path('bitcoin/transactions/', views.BitcoinTransactionListView.as_view(), name='bitcoin-transactions'),
    path('bitcoin/transactions/<int:transaction_id>/', views.BitcoinTransactionDetailView.as_view(), name='bitcoin-transaction-detail'),
] 