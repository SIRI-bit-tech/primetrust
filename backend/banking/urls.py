from django.urls import path
from . import views

app_name = 'banking'

urlpatterns = [
    # Virtual Cards
    path('cards/', views.VirtualCardListView.as_view(), name='card-list'),
    path('cards/create/', views.VirtualCardCreateView.as_view(), name='card-create'),
    path('cards/<int:pk>/', views.VirtualCardDetailView.as_view(), name='card-detail'),
    path('cards/<int:pk>/update/', views.VirtualCardUpdateView.as_view(), name='card-update'),
    path('cards/<int:pk>/cancel/', views.VirtualCardCancelView.as_view(), name='card-cancel'),
    path('cards/<int:pk>/freeze/', views.VirtualCardFreezeView.as_view(), name='card-freeze'),
    path('cards/<int:pk>/unfreeze/', views.VirtualCardUnfreezeView.as_view(), name='card-unfreeze'),
    
    # Transfers
    path('transfers/', views.TransferListView.as_view(), name='transfer-list'),
    path('transfers/create/', views.TransferCreateView.as_view(), name='transfer-create'),
    path('transfers/<int:pk>/', views.TransferDetailView.as_view(), name='transfer-detail'),
    path('transfers/<int:pk>/cancel/', views.TransferCancelView.as_view(), name='transfer-cancel'),
    path('transfers/<int:pk>/process/', views.TransferProcessView.as_view(), name='transfer-process'),
    
    # Bank Accounts
    path('accounts/', views.BankAccountListView.as_view(), name='account-list'),
    path('accounts/create/', views.BankAccountCreateView.as_view(), name='account-create'),
    path('accounts/<int:pk>/', views.BankAccountDetailView.as_view(), name='account-detail'),
    path('accounts/<int:pk>/update/', views.BankAccountUpdateView.as_view(), name='account-update'),
    path('accounts/<int:pk>/delete/', views.BankAccountDeleteView.as_view(), name='account-delete'),
    path('accounts/<int:pk>/verify/', views.BankAccountVerifyView.as_view(), name='account-verify'),
    
    # Direct Deposits
    path('direct-deposits/', views.DirectDepositListView.as_view(), name='direct-deposit-list'),
    path('direct-deposits/create/', views.DirectDepositCreateView.as_view(), name='direct-deposit-create'),
    path('direct-deposits/<int:pk>/', views.DirectDepositDetailView.as_view(), name='direct-deposit-detail'),
    path('direct-deposits/<int:pk>/update/', views.DirectDepositUpdateView.as_view(), name='direct-deposit-update'),
    path('direct-deposits/<int:pk>/delete/', views.DirectDepositDeleteView.as_view(), name='direct-deposit-delete'),
    
    # Banking utilities
    path('limits/', views.TransferLimitsView.as_view(), name='transfer-limits'),
    path('fees/', views.TransferFeesView.as_view(), name='transfer-fees'),
] 