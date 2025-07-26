from rest_framework import generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import State, City
from .serializers import StateSerializer, CitySerializer


class StateListView(generics.ListAPIView):
    """List all US states."""
    
    permission_classes = [permissions.AllowAny]
    serializer_class = StateSerializer
    queryset = State.objects.all()


class CityListView(generics.ListAPIView):
    """List cities by state."""
    
    permission_classes = [permissions.AllowAny]
    serializer_class = CitySerializer
    
    def get_queryset(self):
        state_abbr = self.request.query_params.get('state')
        if state_abbr:
            return City.objects.filter(state__abbreviation=state_abbr.upper())
        return City.objects.none() 