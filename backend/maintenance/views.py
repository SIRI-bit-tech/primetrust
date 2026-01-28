from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from .models import MaintenanceMode
from .serializers import MaintenanceModeSerializer


class MaintenanceModeViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceMode.objects.all()
    serializer_class = MaintenanceModeSerializer
    
    def get_permissions(self):
        if self.action == 'status':
            # Allow any user to check maintenance status
            return [AllowAny()]
        # Only admins can modify maintenance settings
        return [IsAdminUser()]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get current maintenance status - accessible to all users."""
        maintenance = MaintenanceMode.get_maintenance()
        serializer = self.get_serializer(maintenance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle maintenance mode on/off - admin only."""
        maintenance = MaintenanceMode.get_maintenance()
        maintenance.is_active = not maintenance.is_active
        maintenance.created_by = request.user
        maintenance.save()
        serializer = self.get_serializer(maintenance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def update_maintenance(self, request):
        """Update maintenance settings - admin only."""
        maintenance = MaintenanceMode.get_maintenance()
        
        serializer = self.get_serializer(maintenance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
