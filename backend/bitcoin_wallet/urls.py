from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BitcoinWalletViewSet, IncomingBitcoinTransactionViewSet,
    AdminBitcoinWalletViewSet, AdminIncomingBitcoinTransactionViewSet
)

# User routers
user_router = DefaultRouter()
user_router.register(r'wallets', BitcoinWalletViewSet, basename='bitcoin-wallet')
user_router.register(r'transactions', IncomingBitcoinTransactionViewSet, basename='bitcoin-transaction')

# Admin routers
admin_router = DefaultRouter()
admin_router.register(r'wallets', AdminBitcoinWalletViewSet, basename='admin-bitcoin-wallet')
admin_router.register(r'transactions', AdminIncomingBitcoinTransactionViewSet, basename='admin-bitcoin-transaction')

urlpatterns = [
    # User endpoints
    path('', include(user_router.urls)),
    
    # Admin endpoints
    path('admin/', include(admin_router.urls)),
]