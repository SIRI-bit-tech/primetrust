from rest_framework import serializers
from .models import Notification, MarketData, SystemStatus, SupportTicket, FAQ, SearchLog


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'message',
            'is_read', 'is_sent', 'data', 'created_at', 'read_at', 'sent_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'sent_at']


class MarketDataSerializer(serializers.ModelSerializer):
    """Serializer for MarketData model."""
    
    class Meta:
        model = MarketData
        fields = [
            'id', 'symbol', 'data_type', 'name', 'price', 'change',
            'change_percent', 'volume', 'market_cap', 'high_24h',
            'low_24h', 'currency', 'exchange', 'sector', 'last_updated'
        ]
        read_only_fields = ['id', 'last_updated']


class SystemStatusSerializer(serializers.ModelSerializer):
    """Serializer for SystemStatus model."""
    
    class Meta:
        model = SystemStatus
        fields = [
            'id', 'component', 'status', 'message', 'response_time',
            'uptime_percentage', 'error_count', 'request_count',
            'last_check', 'created_at'
        ]
        read_only_fields = ['id', 'last_check', 'created_at']


class SupportTicketSerializer(serializers.ModelSerializer):
    """Serializer for SupportTicket model."""
    
    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'category', 'priority', 'status',
            'subject', 'description', 'assigned_to', 'created_at',
            'updated_at', 'resolved_at', 'closed_at'
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at', 'updated_at', 'resolved_at', 'closed_at']


class FAQSerializer(serializers.ModelSerializer):
    """Serializer for FAQ model."""
    
    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'answer', 'category', 'is_published',
            'order', 'view_count', 'helpful_count', 'not_helpful_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'view_count', 'helpful_count', 'not_helpful_count', 'created_at', 'updated_at']


class SearchLogSerializer(serializers.ModelSerializer):
    """Serializer for SearchLog model."""
    
    class Meta:
        model = SearchLog
        fields = [
            'id', 'query', 'search_type', 'results_count',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at'] 