from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status


class AccountLockMiddleware(MiddlewareMixin):
    """
    Middleware to check if authenticated user's account is locked.
    Returns 403 with lock details if account is locked.
    """
    
    def process_request(self, request):
        # Skip check for certain paths
        skip_paths = [
            '/api/auth/login/',
            '/api/auth/register/',
            '/api/auth/refresh/',
            '/api/auth/password-reset-request/',
            '/api/auth/password-reset/',
            '/api/auth/verify-email/',
            '/api/auth/two-factor-login-verify/',
            '/api/auth/request-unlock/',
            '/api/auth/profile/',  # Allow profile access to get lock status
            '/api/auth/account-status/',  # Allow account status check
            '/admin/',  # Skip admin endpoints
            '/static/',
            '/media/',
        ]
        
        # Skip if path should be ignored
        if any(request.path.startswith(path) for path in skip_paths):
            return None
            
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
            
        # Skip if user is admin (admins can't be locked by this system)
        if request.user.is_staff or request.user.is_superuser:
            return None
            
        # Check if account is locked - block most API calls but allow viewing lock status
        if hasattr(request.user, 'is_account_locked') and request.user.is_account_locked():
            return JsonResponse({
                'error': 'Account is locked',
                'account_locked': True,
                'locked_until': request.user.account_locked_until,
                'lock_reason': request.user.account_lock_reason,
                'unlock_request_pending': request.user.unlock_request_pending,
                'message': f'Your account has been locked. Reason: {request.user.account_lock_reason}. Please request an unlock or wait until {request.user.account_locked_until}.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        return None