from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from datetime import date, timedelta
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit, CardApplication


@admin.register(CardApplication)
class CardApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'card_type', 'status', 'created_at', 'processed_by', 'estimated_completion_date']
    list_filter = ['status', 'card_type', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'reason']
    readonly_fields = ['created_at', 'updated_at', 'processed_at']
    actions = ['approve_applications', 'reject_applications', 'mark_processing', 'complete_applications']
    
    fieldsets = (
        ('Application Information', {
            'fields': ('user', 'card_type', 'reason', 'preferred_daily_limit', 'preferred_monthly_limit')
        }),
        ('Status & Processing', {
            'fields': ('status', 'admin_notes', 'estimated_completion_date', 'processed_by', 'processed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def approve_applications(self, request, queryset):
        """Approve selected applications and move to processing."""
        updated = queryset.update(
            status='processing',
            processed_by=request.user,
            processed_at=timezone.now(),
            estimated_completion_date=date.today() + timedelta(days=3)
        )
        self.message_user(request, f'{updated} applications approved and moved to processing.')
    approve_applications.short_description = "Approve applications and move to processing"
    
    def reject_applications(self, request, queryset):
        """Reject selected applications."""
        updated = queryset.update(
            status='rejected',
            processed_by=request.user,
            processed_at=timezone.now()
        )
        self.message_user(request, f'{updated} applications rejected.')
    reject_applications.short_description = "Reject applications"
    
    def mark_processing(self, request, queryset):
        """Mark applications as processing."""
        updated = queryset.update(
            status='processing',
            processed_by=request.user,
            processed_at=timezone.now()
        )
        self.message_user(request, f'{updated} applications marked as processing.')
    mark_processing.short_description = "Mark as processing"
    
    def complete_applications(self, request, queryset):
        """Complete applications and generate cards."""
        completed_count = 0
        for application in queryset.filter(status='processing'):
            try:
                # Create the virtual card
                card = VirtualCard.objects.create(
                    user=application.user,
                    application=application,
                    card_type=application.card_type,
                    daily_limit=application.preferred_daily_limit or 1000.00,
                    monthly_limit=application.preferred_monthly_limit or 10000.00
                )
                
                # Mark application as completed
                application.complete(request.user, f"Card {card.card_number} generated successfully")
                completed_count += 1
                
            except Exception as e:
                self.message_user(request, f'Error creating card for application {application.id}: {str(e)}', level='ERROR')
        
        self.message_user(request, f'{completed_count} applications completed and cards generated.')
    complete_applications.short_description = "Complete applications and generate cards"
    
    def get_queryset(self, request):
        """Show only applications that haven't been completed."""
        return super().get_queryset(request).exclude(status='completed')


@admin.register(VirtualCard)
class VirtualCardAdmin(admin.ModelAdmin):
    list_display = ['card_number_display', 'user', 'card_type', 'status', 'is_expired_display', 'created_at']
    list_filter = ['status', 'card_type', 'created_at']
    search_fields = ['user__email', 'card_number']
    readonly_fields = ['card_number', 'cvv', 'expiry_month', 'expiry_year', 'created_at', 'updated_at']
    actions = ['activate_cards', 'suspend_cards', 'cancel_cards']
    
    fieldsets = (
        ('Card Information', {
            'fields': ('user', 'application', 'card_type', 'card_number', 'cvv', 'expiry_month', 'expiry_year')
        }),
        ('Status & Limits', {
            'fields': ('status', 'daily_limit', 'monthly_limit', 'current_daily_spent', 'current_monthly_spent', 'is_default')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def card_number_display(self, obj):
        """Display masked card number."""
        return obj.mask_card_number()
    card_number_display.short_description = 'Card Number'
    
    def is_expired_display(self, obj):
        """Display if card is expired."""
        if obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Expiry Status'
    
    def activate_cards(self, request, queryset):
        """Activate selected cards."""
        updated = queryset.update(status='active')
        self.message_user(request, f'{updated} cards activated.')
    activate_cards.short_description = "Activate cards"
    
    def suspend_cards(self, request, queryset):
        """Suspend selected cards."""
        updated = queryset.update(status='suspended')
        self.message_user(request, f'{updated} cards suspended.')
    suspend_cards.short_description = "Suspend cards"
    
    def cancel_cards(self, request, queryset):
        """Cancel selected cards."""
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} cards cancelled.')
    cancel_cards.short_description = "Cancel cards"
    
    def has_add_permission(self, request):
        """Only allow adding cards through application completion."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of cards."""
        return False


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient_email', 'amount', 'currency', 'status', 'transfer_type')
    list_filter = ('status', 'transfer_type', 'currency', 'created_at')
    search_fields = ('sender__email', 'recipient_email', 'reference_number', 'description')
    readonly_fields = ('reference_number', 'fee', 'created_at', 'completed_at', 'updated_at')
    raw_id_fields = ('sender', 'recipient')
    date_hierarchy = 'created_at'


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'account_name', 'account_type', 'bank_name', 'is_verified', 'is_default')
    list_filter = ('account_type', 'is_verified', 'is_default', 'created_at')
    search_fields = ('user__email', 'account_name', 'bank_name')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


@admin.register(DirectDeposit)
class DirectDepositAdmin(admin.ModelAdmin):
    list_display = ('user', 'employer_name', 'deposit_amount', 'frequency', 'status', 'start_date')
    list_filter = ('frequency', 'status', 'created_at')
    search_fields = ('user__email', 'employer_name', 'account_number')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
