#!/usr/bin/env python
"""
Test script to verify Bitcoin app setup
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primetrust.settings')
django.setup()

from django.contrib.auth.models import User
from bitcoin_wallet.models import BitcoinWallet, IncomingBitcoinTransaction

def test_bitcoin_setup():
    """Test the Bitcoin app setup"""
    print("Testing Bitcoin app setup...")
    
    # Check if we can import the models
    print("✓ Bitcoin models imported successfully")
    
    # Check if we can create a BitcoinWallet instance
    try:
        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={
                'email': 'test@example.com',
                'first_name': 'Test',
                'last_name': 'User'
            }
        )
        
        # Create a Bitcoin wallet
        wallet, created = BitcoinWallet.objects.get_or_create(
            user=user,
            defaults={
                'wallet_address': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                'is_active': True
            }
        )
        
        print(f"✓ Bitcoin wallet created/retrieved for user: {user.username}")
        print(f"  Wallet address: {wallet.wallet_address}")
        print(f"  Is active: {wallet.is_active}")
        
        # Test creating an incoming transaction
        transaction = IncomingBitcoinTransaction.objects.create(
            user=user,
            transaction_hash='test_hash_123456789',
            amount_btc='0.001',
            amount_usd='50.00',
            sender_address='bc1qtest123456789',
            status='pending'
        )
        
        print(f"✓ Incoming transaction created")
        print(f"  Transaction hash: {transaction.transaction_hash}")
        print(f"  Amount: {transaction.amount_btc} BTC (${transaction.amount_usd})")
        print(f"  Status: {transaction.status}")
        
        # Clean up test data
        transaction.delete()
        if created:
            wallet.delete()
            user.delete()
        
        print("✓ Test completed successfully!")
        
    except Exception as e:
        print(f"✗ Error during testing: {e}")
        return False
    
    return True

if __name__ == '__main__':
    test_bitcoin_setup() 