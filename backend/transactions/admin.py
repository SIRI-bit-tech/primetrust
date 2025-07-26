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
    list_display = ('user', 'biller_name', 'biller_category', 'amount', 'due_date', 'status', 'is_recurring')
    list_filter = ('biller_category', 'status', 'is_recurring', 'created_at')
    search_fields = ('user__email', 'biller_name', 'account_number')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'transaction')
    date_hierarchy = 'created_at'


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'investment_type', 'action', 'symbol', 'total_amount', 'status', 'created_at')
    list_filter = ('investment_type', 'action', 'status', 'created_at')
    search_fields = ('user__email', 'symbol', 'company_name')
    readonly_fields = ('created_at', 'completed_at', 'updated_at')
    raw_id_fields = ('user', 'transaction')
    date_hierarchy = 'created_at'
