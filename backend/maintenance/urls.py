from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceModeViewSet

router = DefaultRouter()
router.register(r'maintenance', MaintenanceModeViewSet, basename='maintenance')

urlpatterns = [
    path('', include(router.urls)),
]
