from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'card-applications', views.CardApplicationViewSet, basename='card-application')
router.register(r'admin/card-applications', views.AdminCardApplicationViewSet, basename='admin-card-application')
router.register(r'external-accounts', views.ExternalBankAccountViewSet, basename='external-account')
router.register(r'saved-beneficiaries', views.SavedBeneficiaryViewSet, basename='saved-beneficiary')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Virtual Card URLs
    path('virtual-cards/', views.VirtualCardListView.as_view(), name='virtual-card-list'),
    path('virtual-cards/<int:card_id>/cancel/', views.VirtualCardCancelView.as_view(), name='virtual-card-cancel'),
    path('virtual-cards/<int:card_id>/freeze/', views.VirtualCardFreezeView.as_view(), name='virtual-card-freeze'),
    path('virtual-cards/<int:card_id>/unfreeze/', views.VirtualCardUnfreezeView.as_view(), name='virtual-card-unfreeze'),
    path('virtual-cards/<int:card_id>/delete/', views.VirtualCardDeleteView.as_view(), name='virtual-card-delete'),
    
    # Transfers
    path('transfers/', views.TransferListView.as_view(), name='transfer-list'),
    path('transfers/<int:pk>/', views.TransferDetailView.as_view(), name='transfer-detail'),
    
    # New Transfer Types
    path('transfers/ach/', views.create_ach_transfer, name='create-ach-transfer'),
    path('transfers/wire/', views.create_wire_transfer, name='create-wire-transfer'),
    path('transfers/international/', views.create_international_wire_transfer, name='create-international-wire-transfer'),
    
    # Bank Validation
    path('validate-routing/', views.validate_routing_number, name='validate-routing-number'),
    
    # Bank Accounts
    path('bank-accounts/', views.BankAccountListView.as_view(), name='bank-account-list'),
    path('bank-accounts/<int:pk>/', views.BankAccountDetailView.as_view(), name='bank-account-detail'),
    
    # Direct Deposits
    path('direct-deposits/', views.DirectDepositListView.as_view(), name='direct-deposit-list'),
    path('direct-deposits/<int:pk>/', views.DirectDepositDetailView.as_view(), name='direct-deposit-detail'),
] 