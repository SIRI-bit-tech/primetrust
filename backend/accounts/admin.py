from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProfile, EmailVerification, PasswordReset


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin configuration for UserProfile model."""
    
    list_display = ['user', 'date_of_birth', 'gender', 'employer', 'annual_income', 'preferred_currency']
    list_filter = ['gender', 'preferred_currency', 'language', 'receive_email_notifications', 'receive_sms_notifications']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'employer', 'job_title']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Personal Information', {
            'fields': ('date_of_birth', 'gender')
        }),
        ('Employment', {
            'fields': ('employer', 'job_title', 'annual_income')
        }),
        ('Preferences', {
            'fields': ('preferred_currency', 'language', 'timezone')
        }),
        ('Notifications', {
            'fields': ('receive_email_notifications', 'receive_sms_notifications', 'receive_marketing_emails')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for User model."""
    
    list_display = [
        'email', 'username', 'full_name', 'account_number', 'balance', 
        'is_verified', 'email_verified', 'is_active', 'created_at'
    ]
    list_filter = [
        'is_verified', 'email_verified', 'phone_verified', 'two_factor_enabled',
        'is_active', 'is_staff', 'is_superuser', 'created_at', 'country'
    ]
    search_fields = ['email', 'username', 'first_name', 'last_name', 'account_number', 'phone_number']
    readonly_fields = [
        'account_number', 'routing_number', 'created_at', 'updated_at', 
        'last_activity', 'failed_login_attempts', 'account_locked_until'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'phone_number')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'zip_code', 'country')
        }),
        ('Banking Information', {
            'fields': ('account_number', 'routing_number', 'balance')
        }),
        ('Verification Status', {
            'fields': ('is_verified', 'email_verified', 'phone_verified')
        }),
        ('Security', {
            'fields': ('two_factor_enabled', 'last_login_ip', 'failed_login_attempts', 'account_locked_until')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_activity'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
    
    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Full Name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile')


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    """Admin configuration for EmailVerification model."""
    
    list_display = ['user', 'token_short', 'created_at', 'expires_at', 'is_used', 'is_expired_display']
    list_filter = ['is_used', 'created_at', 'expires_at']
    search_fields = ['user__email', 'token']
    readonly_fields = ['created_at', 'expires_at']
    ordering = ['-created_at']
    
    def token_short(self, obj):
        return obj.token[:20] + '...' if len(obj.token) > 20 else obj.token
    token_short.short_description = 'Token'
    
    def is_expired_display(self, obj):
        if obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Status'


@admin.register(PasswordReset)
class PasswordResetAdmin(admin.ModelAdmin):
    """Admin configuration for PasswordReset model."""
    
    list_display = ['user', 'token_short', 'created_at', 'expires_at', 'is_used', 'is_expired_display']
    list_filter = ['is_used', 'created_at', 'expires_at']
    search_fields = ['user__email', 'token']
    readonly_fields = ['created_at', 'expires_at']
    ordering = ['-created_at']
    
    def token_short(self, obj):
        return obj.token[:20] + '...' if len(obj.token) > 20 else obj.token
    token_short.short_description = 'Token'
    
    def is_expired_display(self, obj):
        if obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Status'
