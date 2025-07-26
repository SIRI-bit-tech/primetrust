from django.urls import path
from . import views

app_name = 'location'

urlpatterns = [
    path('states/', views.StateListView.as_view(), name='state-list'),
    path('cities/', views.CityListView.as_view(), name='city-list'),
] 