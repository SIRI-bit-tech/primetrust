import qrcode
import base64
from io import BytesIO
import pyotp


def generate_qr_code(uri, size=200):
    """
    Generate QR code from URI and return as base64 encoded string.
    
    Args:
        uri (str): The URI to encode in QR code
        size (int): Size of the QR code in pixels
    
    Returns:
        str: Base64 encoded PNG image
    """
    try:
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Resize image
        img = img.resize((size, size))
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    except Exception as e:
        print(f"Error generating QR code: {e}")
        return None


def verify_totp_code(secret, code, window=1):
    """
    Verify TOTP code.
    
    Args:
        secret (str): TOTP secret key
        code (str): 6-digit code to verify
        window (int): Time window tolerance
    
    Returns:
        bool: True if code is valid, False otherwise
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=window)
    except Exception as e:
        print(f"Error verifying TOTP code: {e}")
        return False


def generate_backup_codes(count=10):
    """
    Generate backup codes for 2FA recovery.
    
    Args:
        count (int): Number of backup codes to generate
    
    Returns:
        list: List of backup codes
    """
    import secrets
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric codes
        code = ''.join(secrets.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(8))
        codes.append(code)
    return codes


def validate_pin(pin):
    """
    Validate transfer PIN according to security rules.
    
    Args:
        pin (str): 4-digit PIN to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not pin.isdigit():
        return False, "PIN must contain only digits"
    
    if len(pin) != 4:
        return False, "PIN must be exactly 4 digits"
    
    # Check for consecutive numbers (e.g., 1234, 5678)
    for i in range(len(pin) - 1):
        if int(pin[i]) + 1 == int(pin[i + 1]):
            return False, "PIN cannot contain consecutive numbers"
    
    # Check for repeated digits (e.g., 1111, 2222)
    if len(set(pin)) == 1:
        return False, "PIN cannot contain all identical digits"
    
    # Check for common patterns
    common_pins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999']
    if pin in common_pins:
        return False, "PIN cannot be a common pattern"
    
    return True, "PIN is valid"


def log_security_event(user, event_type, description, request=None, metadata=None):
    """
    Log security events for audit purposes.
    
    Args:
        user: User instance
        event_type (str): Type of security event
        description (str): Description of the event
        request: HTTP request object (optional)
        metadata (dict): Additional event data (optional)
    """
    try:
        from .models import SecurityAuditLog
        
        ip_address = None
        user_agent = None
        
        if request:
            # Get client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        SecurityAuditLog.objects.create(
            user=user,
            event_type=event_type,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {}
        )
        
    except Exception as e:
        print(f"Error logging security event: {e}")


def get_client_ip(request):
    """
    Get client IP address from request.
    
    Args:
        request: HTTP request object
    
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip 