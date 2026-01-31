import requests
import json
import time
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache
from blockcypher import get_address_details, get_transaction_details, pushtx
from blockcypher.utils import is_valid_address
import environ
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone


env = environ.Env()
environ.Env.read_env()

class BitcoinService:
    """Service for Bitcoin price and blockchain operations."""
    
    # CoinGecko API for Bitcoin price
    COINGECKO_API_URL = "https://api.coingecko.com/api/v3"
    
    # BlockCypher API for blockchain operations
    BLOCKCYPHER_API_URL = "https://api.blockcypher.com/v1"
    BLOCKCYPHER_TOKEN = env('BLOCKCYPHER_TOKEN', default='')  # Get from https://www.blockcypher.com/
    
    @classmethod
    def get_bitcoin_price(cls):
        """Get real-time Bitcoin price from CoinGecko API."""
        cache_key = 'bitcoin_price'
        cached_price = cache.get(cache_key)
        
        if cached_price:
            return cached_price
        
        try:
            # Get Bitcoin price from CoinGecko
            response = requests.get(
                f"{cls.COINGECKO_API_URL}/simple/price",
                params={
                    'ids': 'bitcoin',
                    'vs_currencies': 'usd',
                    'include_24hr_change': 'true',
                    'include_24hr_vol': 'true'
                },
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            bitcoin_data = data.get('bitcoin', {})
            
            price_data = {
                'price_usd': Decimal(str(bitcoin_data.get('usd', 0))),
                'price_change_24h': Decimal(str(bitcoin_data.get('usd_24h_change', 0))),
                'price_change_percentage_24h': Decimal(str(bitcoin_data.get('usd_24h_change', 0))),
                'last_updated': time.time()
            }
            
            # Cache for 1 minute
            cache.set(cache_key, price_data, 60)
            
            return price_data
            
        except Exception as e:
            print(f"Error fetching Bitcoin price: {e}")
            # Fallback to cached price or default
            return {
                'price_usd': Decimal('65000.00'),
                'price_change_24h': Decimal('0.00'),
                'price_change_percentage_24h': Decimal('0.00'),
                'last_updated': time.time()
            }
    
    @classmethod
    def validate_bitcoin_address(cls, address):
        """Validate Bitcoin address using BlockCypher."""
        try:
            return is_valid_address(address)
        except Exception:
            return False
    
    @classmethod
    def get_address_balance(cls, address):
        """Get Bitcoin address balance from BlockCypher."""
        try:
            address_details = get_address_details(address, api_key=cls.BLOCKCYPHER_TOKEN)
            return {
                'balance_satoshi': address_details.get('final_balance', 0),
                'balance_btc': Decimal(str(address_details.get('final_balance', 0))) / Decimal('100000000'),
                'total_received': Decimal(str(address_details.get('total_received', 0))) / Decimal('100000000'),
                'total_sent': Decimal(str(address_details.get('total_sent', 0))) / Decimal('100000000'),
                'tx_count': address_details.get('n_tx', 0)
            }
        except Exception as e:
            print(f"Error getting address balance: {e}")
            return None
    
    @classmethod
    def estimate_transaction_fee(cls, amount_btc):
        """Estimate transaction fee based on current network conditions."""
        try:
            # Get current fee estimates from BlockCypher
            response = requests.get(
                f"{cls.BLOCKCYPHER_API_URL}/btc/main",
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            # Use medium priority fee
            fee_per_byte = data.get('medium_fee_per_kb', 10000) / 1000  # Convert to per byte
            
            # Estimate transaction size (typical P2PKH transaction is ~225 bytes)
            estimated_size = 225
            estimated_fee_satoshi = int(fee_per_byte * estimated_size)
            estimated_fee_btc = Decimal(str(estimated_fee_satoshi)) / Decimal('100000000')
            
            return estimated_fee_btc
            
        except Exception as e:
            print(f"Error estimating transaction fee: {e}")
            # Fallback fee calculation
            return Decimal('0.001')  # 0.001 BTC as fallback
    
    @classmethod
    def create_bitcoin_transaction(cls, from_address, to_address, amount_btc, private_key=None):
        """
        Create and broadcast a Bitcoin transaction.
        Note: In production, you should use a proper wallet service or hardware security module.
        This is a simplified example.
        """
        try:
            # For production, you would:
            # 1. Use a proper wallet service (like BitGo, Coinbase Commerce, etc.)
            # 2. Implement proper key management
            # 3. Use multi-signature wallets
            # 4. Implement proper security measures
            
            # This is a placeholder for the actual transaction creation
            # In reality, you'd need to:
            # - Get UTXOs for the from_address
            # - Create the transaction
            # - Sign it with the private key
            # - Broadcast it to the network
            
            # For now, we'll simulate the transaction
            transaction_data = {
                'tx_hash': f"simulated_tx_{int(time.time())}",
                'status': 'pending',
                'fee': cls.estimate_transaction_fee(amount_btc),
                'created_at': time.time()
            }
            
            return transaction_data
            
        except Exception as e:
            print(f"Error creating Bitcoin transaction: {e}")
            return None
    
    @classmethod
    def get_transaction_status(cls, tx_hash):
        """Get transaction status from BlockCypher."""
        try:
            tx_details = get_transaction_details(tx_hash, api_key=cls.BLOCKCYPHER_TOKEN)
            return {
                'confirmed': tx_details.get('confirmed', False),
                'confirmations': tx_details.get('confirmations', 0),
                'block_height': tx_details.get('block_height'),
                'status': 'confirmed' if tx_details.get('confirmed') else 'pending'
            }
        except Exception as e:
            print(f"Error getting transaction status: {e}")
            return {
                'confirmed': False,
                'confirmations': 0,
                'status': 'unknown'
            } 


def send_2fa_enabled_notification(user):
    """Send email notification when 2FA is enabled."""
    try:
        subject = 'Two-Factor Authentication Enabled - PrimeTrust'
        context = {
            'first_name': user.first_name,
            'status': 'enabled',
            'timestamp': timezone.now(),
            'subject': subject
        }
        html_message = render_to_string('emails/2fa_notification.html', context)
        plain_message = f"Hello {user.first_name}, Two-factor authentication has been successfully enabled for your PrimeTrust account."
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send 2FA enabled notification: {e}")
        return False


def send_2fa_disabled_notification(user):
    """Send email notification when 2FA is disabled."""
    try:
        subject = 'Two-Factor Authentication Disabled - PrimeTrust'
        context = {
            'first_name': user.first_name,
            'status': 'disabled',
            'timestamp': timezone.now(),
            'subject': subject
        }
        html_message = render_to_string('emails/2fa_notification.html', context)
        plain_message = f"Hello {user.first_name}, Two-factor authentication has been disabled for your PrimeTrust account."
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send 2FA disabled notification: {e}")
        return False


def send_transfer_pin_setup_notification(user):
    """Send email notification when transfer PIN is set up."""
    try:
        subject = 'Transfer PIN Setup Complete - PrimeTrust'
        context = {
            'first_name': user.first_name,
            'timestamp': timezone.now(),
            'subject': subject
        }
        html_message = render_to_string('emails/transfer_pin_notification.html', context)
        plain_message = f"Hello {user.first_name}, Your transfer PIN has been successfully set up for your PrimeTrust account."
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send transfer PIN setup notification: {e}")
        return False


def send_registration_complete_notification(user):
    """Send email notification when registration is complete."""
    try:
        subject = 'Welcome to PrimeTrust - Your Account is Ready!'
        context = {
            'first_name': user.first_name,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
            'subject': subject
        }
        html_message = render_to_string('emails/registration_complete.html', context)
        plain_message = f"Hello {user.first_name}, Welcome to PrimeTrust! Your account setup is now complete."
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send registration complete notification: {e}")
        return False


def send_backup_code_used_notification(user, remaining_codes):
    """Send email notification when a backup code is used."""
    try:
        subject = 'Backup Code Used - PrimeTrust Security Alert'
        message = f"""
        Hello {user.first_name},
        
        A backup code was used to access your PrimeTrust account.
        
        Remaining backup codes: {remaining_codes}
        
        If you did not use this backup code, please contact our support team immediately.
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send backup code used notification: {e}")
        return False
 