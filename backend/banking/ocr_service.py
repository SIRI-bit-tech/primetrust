"""
OCR Service for extracting data from check images using EasyOCR
"""
import re
import logging
import threading
from decimal import Decimal
from PIL import Image
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

# Configuration: Maximum check amount for OCR validation
# Can be overridden in settings.py with MAX_CHECK_AMOUNT
# Set to None to disable upper limit validation
MAX_CHECK_AMOUNT = getattr(settings, 'MAX_CHECK_AMOUNT', 100000)  # Default: $100,000

# Initialize EasyOCR reader (lazy loading with thread-safe double-checked locking)
_reader = None
_reader_lock = threading.Lock()

def get_reader():
    """Lazy load EasyOCR reader to avoid startup delay (thread-safe)"""
    global _reader
    
    # First check without lock (fast path)
    if _reader is not None:
        return _reader
    
    # Acquire lock for initialization
    with _reader_lock:
        # Double-check inside lock to prevent race condition
        if _reader is None:
            import easyocr
            logger.info("Initializing EasyOCR reader (English)...")
            _reader = easyocr.Reader(['en'], gpu=False)  # Use CPU, set gpu=True if you have CUDA
            logger.info("EasyOCR reader initialized successfully")
    
    return _reader


class CheckOCRService:
    """Service for extracting check data using OCR"""
    
    @staticmethod
    def extract_check_data(image_file):
        """
        Extract amount and check number from check image
        
        Args:
            image_file: Django UploadedFile object
            
        Returns:
            dict: {
                'amount': Decimal or None,
                'check_number': str or None,
                'confidence': float (0-1),
                'raw_text': str,
                'message': str
            }
        """
        try:
            # Open image and convert to numpy array
            image = Image.open(image_file)
            image_np = np.array(image)
            
            # Perform OCR with EasyOCR
            reader = get_reader()
            results = reader.readtext(image_np)
            
            # Combine all detected text
            text = ' '.join([result[1] for result in results])
            logger.info(f"EasyOCR extracted text: {text}")
            
            # Extract data
            amount = CheckOCRService._extract_amount(text)
            check_number = CheckOCRService._extract_check_number(text)
            
            # Calculate confidence based on what we found
            confidence = 0.0
            if amount:
                confidence += 0.6
            if check_number:
                confidence += 0.4
            
            message = "OCR extraction completed"
            if not amount and not check_number:
                message = "Could not extract data. Please enter manually."
            elif not amount:
                message = "Found check number but not amount. Please verify amount."
            elif not check_number:
                message = "Found amount but not check number. Please verify."
            else:
                message = "Successfully extracted check data. Please verify accuracy."
            
            return {
                'amount': amount,
                'check_number': check_number,
                'confidence': confidence,
                'raw_text': text,
                'message': message
            }
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return {
                'amount': None,
                'check_number': None,
                'confidence': 0.0,
                'raw_text': '',
                'message': f'OCR failed: {str(e)}. Please enter details manually.'
            }
    
    @staticmethod
    def _extract_amount(text):
        """
        Extract dollar amount from OCR text
        
        Looks for patterns like:
        - $1,234.56
        - $1234.56
        - 1,234.56
        - **$1,234.56**
        """
        # Pattern for dollar amounts
        patterns = [
            r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $1,234.56
            r'(?:^|\s)(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s|$)',  # 1,234.56
            r'\*+\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*\*+',  # **$1,234.56**
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            if matches:
                # Take the first match, remove commas, convert to Decimal
                amount_str = matches[0].replace(',', '')
                try:
                    amount = Decimal(amount_str)
                    # Validate amount is positive
                    if amount <= 0:
                        continue
                    # Validate against max check amount if configured
                    if MAX_CHECK_AMOUNT is not None and amount > MAX_CHECK_AMOUNT:
                        logger.warning(
                            f"Extracted check amount ${amount} exceeds MAX_CHECK_AMOUNT "
                            f"${MAX_CHECK_AMOUNT}, skipping this match"
                        )
                        continue
                    return amount
                except (ValueError, ArithmeticError):
                    continue
        
        return None
    
    @staticmethod
    def _extract_check_number(text):
        """
        Extract check number from OCR text
        
        Check numbers are typically:
        - 3-4 digits
        - Located in top right corner
        - May have leading zeros
        """
        # Look for check number patterns
        # Usually appears near words like "Check", "No.", "#"
        patterns = [
            r'(?:Check|CHECK|No\.|#)\s*(\d{3,6})',  # Check 1234
            r'(?:^|\s)(\d{4})(?:\s|$)',  # Standalone 4-digit number
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            if matches:
                # Return first match
                return matches[0]
        
        return None
