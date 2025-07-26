from django.urls import path
from . import views

app_name = 'loans'

urlpatterns = [
    # Loan endpoints
    path('', views.LoanListView.as_view(), name='loan-list'),
    path('create/', views.LoanCreateView.as_view(), name='loan-create'),
    path('<int:pk>/', views.LoanDetailView.as_view(), name='loan-detail'),
    path('<int:pk>/pay/', views.LoanPayView.as_view(), name='loan-pay'),
    
    # Loan application endpoints
    path('apply/', views.LoanApplicationListView.as_view(), name='application-list'),
    path('apply/<int:pk>/', views.LoanApplicationDetailView.as_view(), name='application-detail'),
    path('apply/<int:pk>/submit/', views.LoanApplicationSubmitView.as_view(), name='application-submit'),
    
    # Analytics
    path('analytics/', views.LoanAnalyticsView.as_view(), name='loan-analytics'),
] 