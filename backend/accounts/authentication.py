"""
Custom authentication classes for cookie-based JWT authentication.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework import exceptions


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from HTTP-only cookies.
    Falls back to Authorization header for backward compatibility.
    """
    
    def authenticate(self, request):
        # 1. Try Authorization header first (standard JWT behavior)
        # This allows the frontend to explicitly override cookies (e.g., using fallback from sessionStorage)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                try:
                    validated_token = self.get_validated_token(raw_token)
                    return self.get_user(validated_token), validated_token
                except Exception:
                    # If header token is invalid, fall through to try cookie
                    pass
        
        # 2. Fallback to HTTP-only cookie
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            # If cookie token is invalid, treat as unauthenticated
            # This allows AllowAny views to work even with expired cookies
            return None
