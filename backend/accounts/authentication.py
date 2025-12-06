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
        # First try to get token from cookie
        raw_token = request.COOKIES.get('access_token')
        
        # If not in cookie, try Authorization header (backward compatibility)
        if not raw_token:
            header = self.get_header(request)
            if header is None:
                return None
            
            raw_token = self.get_raw_token(header)
        
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
