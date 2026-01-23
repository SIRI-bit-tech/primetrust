from django.contrib import admin
from .models import Transaction, Bill, Investment


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'amount', 'status', 'merchant_name', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('user__email', 'merchant_name', 'description', 'reference_number')
    readonly_fields = ('reference_number', 'created_at', 'completed_at', 'updated_at')
    raw_id_fields = ('user', 'transfer', 'virtual_card')
    date_hierarchy = 'created_at'


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('user', 'biller_name', 'biller_category', 'amount', 'due_date', 'status')
    list_filter = ('biller_category', 'status', 'created_at')
    search_fields = ('user__email', 'biller_name', 'description')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'symbol', 'investment_type', 'balance_source', 'amount_invested', 'current_value', 'profit_loss', 'status', 'created_at')
    list_filter = ('investment_type', 'balance_source', 'status', 'created_at')
    search_fields = ('user__email', 'name', 'symbol')
    readonly_fields = ('created_at', 'last_updated', 'sold_at', 'current_price_per_unit', 'current_value', 'profit_loss', 'profit_loss_percentage')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'symbol', 'investment_type', 'status')
        }),
        ('Purchase Details', {
            'fields': ('balance_source', 'quantity', 'price_per_unit', 'amount_invested')
        }),
        ('Current Value', {
            'fields': ('current_price_per_unit', 'current_value', 'profit_loss', 'profit_loss_percentage')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_updated', 'sold_at')
        }),
    )
