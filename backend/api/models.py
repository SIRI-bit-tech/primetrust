from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Notification(models.Model):
    """Model for user notifications."""
    
    NOTIFICATION_TYPES = [
        ('transaction', 'Transaction'),
        ('security', 'Security'),
        ('account', 'Account'),
        ('investment', 'Investment'),
        ('loan', 'Loan'),
        ('bill', 'Bill'),
        ('card_application', 'Card Application'),
        ('system', 'System'),
    ]
    
    NOTIFICATION_PRIORITIES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=10, choices=NOTIFICATION_PRIORITIES, default='medium')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    
    # Related objects
    related_transaction = models.ForeignKey('transactions.Transaction', on_delete=models.SET_NULL, null=True, blank=True)
    related_investment = models.ForeignKey('transactions.Investment', on_delete=models.SET_NULL, null=True, blank=True)
    related_bill = models.ForeignKey('transactions.Bill', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_sent(self):
        """Mark notification as sent."""
        if not self.is_sent:
            self.is_sent = True
            self.sent_at = timezone.now()
            self.save(update_fields=['is_sent', 'sent_at'])


class MarketData(models.Model):
    """Model for storing market data."""
    
    DATA_TYPES = [
        ('stock', 'Stock'),
        ('crypto', 'Cryptocurrency'),
        ('forex', 'Forex'),
        ('commodity', 'Commodity'),
    ]
    
    symbol = models.CharField(max_length=20)
    data_type = models.CharField(max_length=20, choices=DATA_TYPES)
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=20, decimal_places=8)
    change = models.DecimalField(max_digits=20, decimal_places=8)
    change_percent = models.DecimalField(max_digits=10, decimal_places=4)
    volume = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    market_cap = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    high_24h = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    low_24h = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    
    # Additional data
    currency = models.CharField(max_length=10, default='USD')
    exchange = models.CharField(max_length=50, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'market_data'
        ordering = ['symbol']
        indexes = [
            models.Index(fields=['symbol', 'data_type']),
            models.Index(fields=['last_updated']),
        ]
        unique_together = ['symbol', 'data_type']
    
    def __str__(self):
        return f"{self.symbol} - {self.price} {self.currency}"


class SystemStatus(models.Model):
    """Model for tracking system status and health."""
    
    STATUS_CHOICES = [
        ('operational', 'Operational'),
        ('degraded', 'Degraded Performance'),
        ('partial_outage', 'Partial Outage'),
        ('major_outage', 'Major Outage'),
        ('maintenance', 'Under Maintenance'),
    ]
    
    COMPONENT_CHOICES = [
        ('api', 'API'),
        ('database', 'Database'),
        ('redis', 'Redis'),
        ('celery', 'Celery'),
        ('email', 'Email Service'),
        ('payment', 'Payment Processing'),
        ('market_data', 'Market Data'),
    ]
    
    component = models.CharField(max_length=20, choices=COMPONENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message = models.TextField(blank=True)
    response_time = models.FloatField(null=True, blank=True)  # in milliseconds
    uptime_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Metrics
    error_count = models.PositiveIntegerField(default=0)
    request_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    last_check = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_status'
        ordering = ['component']
        indexes = [
            models.Index(fields=['component', 'status']),
            models.Index(fields=['last_check']),
        ]
    
    def __str__(self):
        return f"{self.component} - {self.status}"


class SupportTicket(models.Model):
    """Model for support tickets."""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('waiting_for_user', 'Waiting for User'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    CATEGORY_CHOICES = [
        ('account', 'Account Issues'),
        ('transaction', 'Transaction Problems'),
        ('technical', 'Technical Support'),
        ('billing', 'Billing Questions'),
        ('security', 'Security Concerns'),
        ('general', 'General Inquiry'),
    ]
    
    ticket_number = models.CharField(max_length=20, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    subject = models.CharField(max_length=200)
    description = models.TextField()
    
    # Assignment
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'support_tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['priority', 'status']),
            models.Index(fields=['ticket_number']),
        ]
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        # Generate ticket number if not exists
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        
        super().save(*args, **kwargs)
    
    def generate_ticket_number(self):
        """Generate a unique ticket number."""
        while True:
            ticket_number = f"TKT{str(uuid.uuid4().int)[:12]}"
            if not SupportTicket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
    
    def resolve_ticket(self):
        """Mark ticket as resolved."""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.save(update_fields=['status', 'resolved_at'])
    
    def close_ticket(self):
        """Close the ticket."""
        self.status = 'closed'
        self.closed_at = timezone.now()
        self.save(update_fields=['status', 'closed_at'])


class TicketResponse(models.Model):
    """Model for ticket responses."""
    
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='responses')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_responses')
    message = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal notes not visible to user
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ticket_responses'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Response to {self.ticket.ticket_number} by {self.author.email}"


class FAQ(models.Model):
    """Model for frequently asked questions."""
    
    CATEGORY_CHOICES = [
        ('account', 'Account Management'),
        ('transactions', 'Transactions'),
        ('investments', 'Investments'),
        ('security', 'Security'),
        ('billing', 'Billing'),
        ('technical', 'Technical'),
        ('general', 'General'),
    ]
    
    question = models.CharField(max_length=500)
    answer = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    # Analytics
    view_count = models.PositiveIntegerField(default=0)
    helpful_count = models.PositiveIntegerField(default=0)
    not_helpful_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'faqs'
        ordering = ['category', 'order', 'question']
        indexes = [
            models.Index(fields=['category', 'is_published']),
        ]
    
    def __str__(self):
        return self.question
    
    def increment_view_count(self):
        """Increment view count."""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def mark_helpful(self):
        """Mark FAQ as helpful."""
        self.helpful_count += 1
        self.save(update_fields=['helpful_count'])
    
    def mark_not_helpful(self):
        """Mark FAQ as not helpful."""
        self.not_helpful_count += 1
        self.save(update_fields=['not_helpful_count'])


class SearchLog(models.Model):
    """Model for tracking search queries."""
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='search_logs', null=True, blank=True)
    query = models.CharField(max_length=500)
    search_type = models.CharField(max_length=20, choices=[
        ('transaction', 'Transaction'),
        ('user', 'User'),
        ('general', 'General'),
    ])
    results_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'search_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'search_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Search: {self.query} by {self.user.email if self.user else 'Anonymous'}"
