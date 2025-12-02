"""Services for handling different types of transfers."""

from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from .models import Transfer, ExternalBankAccount, SavedBeneficiary
import os


class BankLookupService:
    """Service for validating routing numbers using schwifty library."""
    
    @classmethod
    def validate_routing_number(cls, routing_number):
        """
        Validate routing number using ABA checksum algorithm.
        
        Args:
            routing_number (str): 9-digit routing number
            
        Returns:
            dict: Validation result with 'is_valid' and 'message' keys
        """
        if not routing_number:
            return {
                'is_valid': False,
                'message': 'Routing number is required'
            }
        
        # Remove any spaces or dashes
        routing_number = routing_number.replace(' ', '').replace('-', '')
        
        # Check length
        if len(routing_number) != 9:
            return {
                'is_valid': False,
                'message': 'Routing number must be exactly 9 digits'
            }
        
        # Check if all characters are digits
        if not routing_number.isdigit():
            return {
                'is_valid': False,
                'message': 'Routing number must contain only digits'
            }
        
        try:
            # ABA routing number checksum validation
            digits = [int(d) for d in routing_number]
            checksum = (
                3 * (digits[0] + digits[3] + digits[6]) +
                7 * (digits[1] + digits[4] + digits[7]) +
                (digits[2] + digits[5] + digits[8])
            )
            
            if checksum % 10 == 0:
                return {
                    'is_valid': True,
                    'message': 'Valid routing number format'
                }
            else:
                return {
                    'is_valid': False,
                    'message': 'Invalid routing number checksum'
                }
        except (ValueError, IndexError) as e:
            return {
                'is_valid': False,
                'message': f'Error validating routing number: {str(e)}'
            }


class TransferFeeService:
    """Service for calculating transfer fees."""
    
    FEE_STRUCTURE = {
        'internal': {'base': Decimal('0.00'), 'percentage': Decimal('0.00')},
        'ach': {'base': Decimal('0.50'), 'percentage': Decimal('0.00')},
        'wire_domestic': {'base': Decimal('25.00'), 'percentage': Decimal('0.00')},
        'wire_international': {'base': Decimal('45.00'), 'percentage': Decimal('0.50')},
    }
    
    @classmethod
    def calculate_fee(cls, transfer_type, amount):
        """Calculate transfer fee based on type and amount."""
        fee_config = cls.FEE_STRUCTURE.get(transfer_type, cls.FEE_STRUCTURE['internal'])
        
        base_fee = fee_config['base']
        percentage_fee = (amount * fee_config['percentage']) / Decimal('100')
        
        total_fee = base_fee + percentage_fee
        return total_fee
    
    @classmethod
    def get_processing_time(cls, transfer_type):
        """Get estimated processing time for transfer type."""
        processing_times = {
            'internal': 'Instant',
            'ach': '1-3 business days',
            'wire_domestic': 'Same day',
            'wire_international': '1-5 business days',
        }
        return processing_times.get(transfer_type, 'Unknown')


class ACHTransferService:
    """Service for processing ACH transfers."""
    
    @classmethod
    def create_transfer(cls, user, data):
        """Create an ACH transfer."""
        amount = Decimal(str(data['amount']))
        fee = TransferFeeService.calculate_fee('ach', amount)
        total_amount = amount + fee
        
        # Check user balance
        if user.balance < total_amount:
            raise ValueError('Insufficient funds')
        
        # Create transfer record
        transfer = Transfer.objects.create(
            sender=user,
            recipient_email=data.get('recipient_name', ''),
            amount=amount,
            currency='USD',
            transfer_type='ach',
            status='pending',
            description=data.get('description', ''),
            fee=fee,
            requires_admin_approval=True
        )
        
        # Save beneficiary if requested
        if data.get('save_recipient') and data.get('recipient_nickname'):
            SavedBeneficiary.objects.create(
                user=user,
                nickname=data['recipient_nickname'],
                transfer_type='ach',
                recipient_name=data['recipient_name'],
                account_number=data['account_number'],
                routing_number=data['routing_number'],
                account_type=data.get('account_type', 'checking'),
                bank_name=data.get('bank_name', '')
            )
        
        return transfer


class WireTransferService:
    """Service for processing wire transfers."""
    
    @classmethod
    def create_transfer(cls, user, data, is_international=False):
        """Create a wire transfer (domestic or international)."""
        transfer_type = 'wire_international' if is_international else 'wire_domestic'
        amount = Decimal(str(data['amount']))
        fee = TransferFeeService.calculate_fee(transfer_type, amount)
        total_amount = amount + fee
        
        # Check user balance
        if user.balance < total_amount:
            raise ValueError('Insufficient funds')
        
        # Create transfer record
        transfer = Transfer.objects.create(
            sender=user,
            recipient_email=data.get('recipient_name', ''),
            amount=amount,
            currency=data.get('currency', 'USD'),
            transfer_type=transfer_type,
            status='pending',
            description=data.get('description', ''),
            fee=fee,
            requires_admin_approval=True
        )
        
        # Save beneficiary if requested
        if data.get('save_recipient') and data.get('recipient_nickname'):
            beneficiary_data = {
                'user': user,
                'nickname': data['recipient_nickname'],
                'transfer_type': transfer_type,
                'recipient_name': data['recipient_name'],
                'bank_name': data.get('bank_name', ''),
                'bank_address': data.get('bank_address', '')
            }
            
            if is_international:
                beneficiary_data.update({
                    'swift_code': data.get('swift_code', ''),
                    'iban': data.get('iban', '')
                })
            else:
                beneficiary_data.update({
                    'account_number': data.get('account_number', ''),
                    'routing_number': data.get('routing_number', '')
                })
            
            SavedBeneficiary.objects.create(**beneficiary_data)
        
        return transfer
