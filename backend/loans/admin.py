from django.contrib import admin
from .models import Loan, LoanApplication


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('user', 'loan_type', 'amount', 'status', 'next_payment_date', 'remaining_balance')
    list_filter = ('loan_type', 'status', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'loan_type')
    readonly_fields = ('monthly_payment', 'total_paid', 'remaining_balance', 'created_at', 'updated_at')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at'


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = ('user', 'loan_type', 'requested_amount', 'status', 'created_at')
    list_filter = ('loan_type', 'status', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'loan_type')
    readonly_fields = ('created_at', 'submitted_at', 'reviewed_at', 'updated_at')
    raw_id_fields = ('user',)
    date_hierarchy = 'created_at' 