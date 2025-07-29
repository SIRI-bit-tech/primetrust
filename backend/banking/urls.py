from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'card-applications', views.CardApplicationViewSet, basename='card-application')
router.register(r'admin/card-applications', views.AdminCardApplicationViewSet, basename='admin-card-application')

urlpatterns = [
    # Card Applications
    path('', include(router.urls)),
    
    # Virtual Cards (read-only for users)
    path('cards/', views.VirtualCardListView.as_view(), name='virtual-card-list'),
    path('cards/<int:pk>/', views.VirtualCardDetailView.as_view(), name='virtual-card-detail'),
    path('cards/<int:pk>/update/', views.VirtualCardUpdateView.as_view(), name='virtual-card-update'),
    path('cards/<int:card_id>/cancel/', views.VirtualCardCancelView.as_view(), name='virtual-card-cancel'),
    path('cards/<int:card_id>/freeze/', views.VirtualCardFreezeView.as_view(), name='virtual-card-freeze'),
    path('cards/<int:card_id>/unfreeze/', views.VirtualCardUnfreezeView.as_view(), name='virtual-card-unfreeze'),
    
    # Transfers
    path('transfers/', views.TransferListView.as_view(), name='transfer-list'),
    path('transfers/<int:pk>/', views.TransferDetailView.as_view(), name='transfer-detail'),
    
    # Bank Accounts
    path('bank-accounts/', views.BankAccountListView.as_view(), name='bank-account-list'),
    path('bank-accounts/<int:pk>/', views.BankAccountDetailView.as_view(), name='bank-account-detail'),
    
    # Direct Deposits
    path('direct-deposits/', views.DirectDepositListView.as_view(), name='direct-deposit-list'),
    path('direct-deposits/<int:pk>/', views.DirectDepositDetailView.as_view(), name='direct-deposit-detail'),
] 