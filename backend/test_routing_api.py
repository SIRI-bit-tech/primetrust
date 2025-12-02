"""Test script for routing number validation with schwifty."""

import sys
import os
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primetrust.settings')
django.setup()

from banking.transfer_services import BankLookupService

# Test routing numbers
test_cases = [
    ('021000021', 'JPMorgan Chase'),
    ('026009593', 'Bank of America'),
    ('121000248', 'Wells Fargo'),
    ('241270851', 'Premier Bank'),
    ('111000025', 'Bank of New York Mellon'),
    ('123456789', 'Invalid - Bad Checksum'),
    ('12345678', 'Invalid - Too Short'),
    ('0210000210', 'Invalid - Too Long'),
    ('02100002a', 'Invalid - Contains Letter'),
    ('', 'Invalid - Empty'),
]

print("=" * 80)
print("Testing Routing Number Validation with schwifty")
print("=" * 80)
print("\nThis validates routing number format and checksum.")
print("Users will manually enter their bank name after validation.\n")

for routing_number, description in test_cases:
    print(f"\nTest: {description}")
    print(f"Routing Number: '{routing_number}'")
    print("-" * 80)
    
    # Validate
    result = BankLookupService.validate_routing_number(routing_number)
    
    if result['is_valid']:
        print(f"✓ VALID - {result['message']}")
        print(f"  → User can now enter their bank name manually")
    else:
        print(f"✗ INVALID - {result['message']}")

print("\n" + "=" * 80)
print("Test complete!")
print("=" * 80)
