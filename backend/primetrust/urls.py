"""
URL configuration for primetrust project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from transactions import views as transaction_views

from django.http import JsonResponse

def api_root(request):
    return JsonResponse({"message": "PrimeTrust API is running"})

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('accounts.urls')),
    path('api/banking/', include('banking.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/', include('api.urls')),
    
    # New apps
    path('api/loans/', include('loans.urls')),
    path('api/location/', include('location.urls')),
    path('api/admin/', include('admin_api.urls')),
    path('api/bitcoin-wallet/', include('bitcoin_wallet.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    
    # Direct investment and bill endpoints (shortcut URLs)
    path('api/investments/', transaction_views.InvestmentListView.as_view(), name='investment-shortcut'),
    path('api/bills/', transaction_views.BillListCreateView.as_view(), name='bill-shortcut'),
    path('api/bills/pay/', transaction_views.BillPayShortcutView.as_view(), name='bill-pay-shortcut'),
    
    # JWT token refresh
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
