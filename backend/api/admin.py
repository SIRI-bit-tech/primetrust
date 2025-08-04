from django.contrib import admin
from .models import Notification, MarketData, SystemStatus, SupportTicket, FAQ, SearchLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


@admin.register(MarketData)
class MarketDataAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'price', 'change_percent', 'volume', 'last_updated')
    list_filter = ('symbol', 'data_type', 'last_updated')
    search_fields = ('symbol', 'name')
    readonly_fields = ('last_updated',)
    date_hierarchy = 'last_updated'


@admin.register(SystemStatus)
class SystemStatusAdmin(admin.ModelAdmin):
    list_display = ('component', 'status', 'response_time', 'uptime_percentage', 'last_check')
    list_filter = ('status', 'component', 'last_check')
    search_fields = ('component',)
    readonly_fields = ('last_check', 'created_at', 'uptime_percentage', 'error_count', 'request_count')
    list_editable = ('status',)  # Allow manual status override if needed
    
    def has_add_permission(self, request):
        """Disable manual creation - data is managed automatically."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable deletion - data is managed automatically."""
        return False


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'user', 'subject', 'priority', 'status', 'created_at')
    list_filter = ('priority', 'status', 'category', 'created_at')
    search_fields = ('user__email', 'subject', 'description', 'ticket_number')
    readonly_fields = ('ticket_number', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'assigned_to')
    date_hierarchy = 'created_at'


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'is_published', 'view_count', 'created_at')
    list_filter = ('category', 'is_published', 'created_at')
    search_fields = ('question', 'answer', 'category')
    readonly_fields = ('view_count', 'helpful_count', 'not_helpful_count', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'query', 'search_type', 'results_count', 'created_at')
    list_filter = ('search_type', 'created_at')
    search_fields = ('user__email', 'query')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
