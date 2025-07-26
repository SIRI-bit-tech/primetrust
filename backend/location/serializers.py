from rest_framework import serializers
from .models import State, City


class StateSerializer(serializers.ModelSerializer):
    """Serializer for State model."""
    
    class Meta:
        model = State
        fields = ['id', 'name', 'abbreviation']


class CitySerializer(serializers.ModelSerializer):
    """Serializer for City model."""
    
    state = StateSerializer(read_only=True)
    
    class Meta:
        model = City
        fields = ['id', 'name', 'state'] 