from django.db import models
from django.utils import timezone


class MaintenanceMode(models.Model):
    """Model to manage bank maintenance mode."""
    
    is_active = models.BooleanField(default=False, help_text="Enable/disable maintenance mode")
    start_date = models.DateTimeField(null=True, blank=True, help_text="When maintenance starts")
    end_date = models.DateTimeField(null=True, blank=True, help_text="When maintenance ends (7-14 days)")
    message = models.TextField(
        default="The bank is currently under maintenance. All transactions will be on hold during this period.",
        help_text="Message shown to users"
    )
    estimated_duration = models.CharField(
        max_length=50,
        default="7-14 days",
        help_text="Estimated duration (e.g., 7-14 days)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_created'
    )
    
    class Meta:
        db_table = 'maintenance_mode'
        verbose_name_plural = "Maintenance Mode"
    
    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"Maintenance Mode - {status}"
    
    def is_within_maintenance_period(self):
        """Check if current time is within maintenance period."""
        if not self.is_active:
            return False
        
        now = timezone.now()
        if self.start_date and self.end_date:
            return self.start_date <= now <= self.end_date
        return self.is_active
    
    def save(self, *args, **kwargs):
        # Ensure only one maintenance record exists
        if not self.pk and MaintenanceMode.objects.exists():
            # Update existing instead of creating new
            existing = MaintenanceMode.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_maintenance(cls):
        """Get or create the single maintenance record."""
        obj, created = cls.objects.get_or_create(pk=1, defaults={})
        return obj
