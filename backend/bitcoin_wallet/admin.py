from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import BitcoinWallet, IncomingBitcoinTransaction, OutgoingBitcoinTransaction, CurrencySwap


@admin.register(BitcoinWallet)
class BitcoinWalletAdmin(admin.ModelAdmin):
    list_display = ['user', 'wallet_address', 'qr_code_preview', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__username', 'user__email', 'wallet_address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Wallet Details', {
            'fields': ('wallet_address', 'qr_code', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def qr_code_preview(self, obj):
        """Display QR code preview in admin"""
        if obj.qr_code:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.qr_code.url
            )
        return "No QR Code"
    qr_code_preview.short_description = "QR Code Preview"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(IncomingBitcoinTransaction)
class IncomingBitcoinTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'transaction_hash_short', 'amount_btc', 'amount_usd', 
        'status', 'confirmation_count', 'created_at', 'is_manually_approved'
    ]
    list_filter = ['status', 'is_manually_approved', 'created_at', 'completed_at']
    search_fields = ['user__username', 'transaction_hash', 'sender_address']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    actions = ['mark_as_confirmed', 'mark_as_completed', 'mark_as_failed']
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('user', 'transaction_hash', 'amount_btc', 'amount_usd', 'sender_address')
        }),
        ('Status Information', {
            'fields': ('status', 'confirmation_count', 'required_confirmations', 'block_height')
        }),
        ('Admin Controls', {
            'fields': ('is_manually_approved', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def transaction_hash_short(self, obj):
        """Display shortened transaction hash"""
        if len(obj.transaction_hash) > 20:
            return f"{obj.transaction_hash[:10]}...{obj.transaction_hash[-10:]}"
        return obj.transaction_hash
    transaction_hash_short.short_description = "Transaction Hash"

    def mark_as_confirmed(self, request, queryset):
        """Mark selected transactions as confirmed"""
        updated = queryset.update(status='confirmed')
        self.message_user(request, f'{updated} transactions marked as confirmed.')
    mark_as_confirmed.short_description = "Mark as confirmed"

    def mark_as_completed(self, request, queryset):
        """Mark selected transactions as completed"""
        completed_count = 0
        for transaction in queryset:
            if transaction.mark_as_completed():
                completed_count += 1
        
        self.message_user(request, f'{completed_count} transactions marked as completed.')
    mark_as_completed.short_description = "Mark as completed"

    def mark_as_failed(self, request, queryset):
        """Mark selected transactions as failed"""
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} transactions marked as failed.')
    mark_as_failed.short_description = "Mark as failed"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

    def save_model(self, request, obj, form, change):
        """Override save to handle manual approval"""
        if change and 'is_manually_approved' in form.changed_data:
            if obj.is_manually_approved and obj.status == 'pending':
                obj.status = 'confirmed'
                obj.confirmation_count = obj.required_confirmations
        
        super().save_model(request, obj, form, change)


@admin.register(OutgoingBitcoinTransaction)
class OutgoingBitcoinTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'recipient_address_short', 'amount_btc', 'amount_usd',
        'balance_source', 'status', 'transaction_hash_short', 'created_at'
    ]
    list_filter = ['status', 'balance_source', 'created_at', 'completed_at']
    search_fields = ['user__username', 'recipient_wallet_address', 'transaction_hash']
    readonly_fields = ['transaction_hash', 'created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('user', 'balance_source', 'recipient_wallet_address', 'amount_btc', 'amount_usd')
        }),
        ('Bitcoin Details', {
            'fields': ('bitcoin_price_at_time', 'transaction_fee', 'transaction_hash')
        }),
        ('Status Information', {
            'fields': ('status', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

    def recipient_address_short(self, obj):
        """Display shortened recipient address"""
        if len(obj.recipient_wallet_address) > 20:
            return f"{obj.recipient_wallet_address[:10]}...{obj.recipient_wallet_address[-10:]}"
        return obj.recipient_wallet_address
    recipient_address_short.short_description = "Recipient Address"

    def transaction_hash_short(self, obj):
        """Display shortened transaction hash"""
        if obj.transaction_hash and len(obj.transaction_hash) > 20:
            return f"{obj.transaction_hash[:10]}...{obj.transaction_hash[-10:]}"
        return obj.transaction_hash or "N/A"
    transaction_hash_short.short_description = "Transaction Hash"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(CurrencySwap)
class CurrencySwapAdmin(admin.ModelAdmin):
    list_display = ['user', 'swap_type', 'amount_from', 'amount_to', 'exchange_rate', 'status', 'created_at']
    list_filter = ['swap_type', 'status', 'created_at']
    search_fields = ['user__username', 'transaction_id']
    readonly_fields = ['transaction_id', 'created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Swap Details', {
            'fields': ('swap_type', 'amount_from', 'amount_to', 'exchange_rate')
        }),
        ('Status Information', {
            'fields': ('status', 'transaction_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['process_swaps']
    
    def process_swaps(self, request, queryset):
        updated = 0
        for swap in queryset:
            if swap.process_swap():
                updated += 1
        self.message_user(request, f'{updated} swaps processed successfully.')
    process_swaps.short_description = "Process selected swaps"