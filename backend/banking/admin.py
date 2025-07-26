from django.contrib import admin
from .models import VirtualCard, Transfer, BankAccount, DirectDeposit


@admin.register(VirtualCard)
class VirtualCardAdmin(admin.ModelAdmin):
    list_display = ('user', 'card_number', 'card_type', 'status', 'daily_limit', 'is_default')
    list_filter = ('card_type', 'status', 'is_default', 'created_at')
    search_fields = ('user__email', 'card_number', 'card_type')
    readonly_fields = ('card_number', 'cvv', 'created_at', 'updated_at')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


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
