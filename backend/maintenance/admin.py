from django.contrib import admin
from .models import MaintenanceMode


@admin.register(MaintenanceMode)
class MaintenanceModeAdmin(admin.ModelAdmin):
    list_display = ('get_status', 'is_active', 'start_date', 'end_date', 'estimated_duration', 'updated_at')
    fieldsets = (
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Maintenance Period', {
            'fields': ('start_date', 'end_date', 'estimated_duration'),
            'description': 'Set the maintenance start and end dates'
        }),
        ('Message', {
            'fields': ('message',),
            'description': 'This message will be shown to users on the dashboard'
        }),
        ('Meta Information', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    
    def get_status(self, obj):
        if obj.is_active:
            return "🔴 ACTIVE"
        return "🟢 INACTIVE"
    get_status.short_description = 'Maintenance Status'
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
