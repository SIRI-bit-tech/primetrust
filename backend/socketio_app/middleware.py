"""
Authentication middleware for Socket.IO
"""
from django.conf import settings
from django.contrib.auth import get_user_model


def authenticate_socket(token):
    """
    Authenticate user from JWT token (synchronous version for async context)
    Returns user object if valid, None otherwise
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if not token:
        logger.warning("No token provided")
        return None
    
    try:
        import jwt
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Decode JWT token using PyJWT directly (no Django dependencies)
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=['HS256']
            )
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.DecodeError as e:
            logger.warning(f"Token decode error: {e}")
            return None
        
        user_id = payload.get('user_id')
        if not user_id:
            logger.warning("No user_id in token payload")
            return None
        
        # Convert string to int if needed
        if isinstance(user_id, str):
            try:
                user_id = int(user_id)
            except ValueError:
                logger.error(f"Invalid user_id format in token: '{user_id}' - cannot convert to integer")
                return None
        
        # Return user_id and username from token (avoid DB call in async context)
        # We'll fetch the full user object in the async handler
        return {
            'id': user_id,
            'username': payload.get('username', f'user_{user_id}'),
            'is_staff': payload.get('is_staff', False)
        }
        
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None


def get_user_room(user_id):
    """Get the room name for a specific user"""
    return f"user_{user_id}"


def get_admin_room():
    """Get the room name for admin users"""
    return "admin_room"
