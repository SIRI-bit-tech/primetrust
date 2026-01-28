from rest_framework import serializers
from .models import MaintenanceMode


class MaintenanceModeSerializer(serializers.ModelSerializer):
    is_within_maintenance = serializers.SerializerMethodField()
    
    class Meta:
        model = MaintenanceMode
        fields = ['is_active', 'start_date', 'end_date', 'message', 'estimated_duration', 'is_within_maintenance']
    
    def get_is_within_maintenance(self, obj):
        return obj.is_within_maintenance_period()
