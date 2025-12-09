"""
OCR Service for extracting data from check images using EasyOCR
"""
import re
import logging
from decimal import Decimal
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

# Initialize EasyOCR reader (lazy loading)
_reader = None

def get_reader():
    """Lazy load EasyOCR reader to avoid startup delay"""
    global _reader
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
                    # Sanity check - check amounts are typically under $10,000
                    if 0 < amount <= 10000:
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
