from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BitcoinWalletViewSet, IncomingBitcoinTransactionViewSet, OutgoingBitcoinTransactionViewSet,
    CurrencySwapViewSet, AdminBitcoinWalletViewSet, AdminIncomingBitcoinTransactionViewSet, 
    AdminCurrencySwapViewSet
)

# User routers
user_router = DefaultRouter()
user_router.register(r'wallets', BitcoinWalletViewSet, basename='bitcoin-wallet')
user_router.register(r'transactions', IncomingBitcoinTransactionViewSet, basename='bitcoin-transaction')
user_router.register(r'send', OutgoingBitcoinTransactionViewSet, basename='bitcoin-send')
user_router.register(r'swaps', CurrencySwapViewSet, basename='currency-swap')

# Admin routers
admin_router = DefaultRouter()
admin_router.register(r'wallets', AdminBitcoinWalletViewSet, basename='admin-bitcoin-wallet')
admin_router.register(r'transactions', AdminIncomingBitcoinTransactionViewSet, basename='admin-bitcoin-transaction')
admin_router.register(r'swaps', AdminCurrencySwapViewSet, basename='admin-currency-swap')

urlpatterns = [
    # User endpoints
    path('', include(user_router.urls)),
    
    # Admin endpoints
    path('admin/', include(admin_router.urls)),
]