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
    list_display = ('user', 'bill_type', 'amount', 'due_date', 'status', 'description')
    list_filter = ('bill_type', 'status', 'created_at')
    search_fields = ('user__email', 'description')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'investment_type', 'amount', 'return_rate', 'status', 'created_at')
    list_filter = ('investment_type', 'status', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'
