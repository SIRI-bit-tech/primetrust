#!/usr/bin/env python3
"""
API Endpoint Testing Script
Run this script to test all API endpoints and check their status.
"""

import requests
import json
import sys
from urllib.parse import urljoin

# Configuration
BASE_URL = 'http://localhost:8000'
API_BASE = f'{BASE_URL}/api'

# Test data
test_user = {
    'email': 'test@example.com',
    'password': 'testpass123',
    'first_name': 'Test',
    'last_name': 'User'
}

def test_endpoint(method, endpoint, data=None, auth_token=None, expected_status=200):
    """Test a single API endpoint."""
    url = urljoin(API_BASE, endpoint)
    headers = {'Content-Type': 'application/json'}
    
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            return False, f"Unsupported method: {method}"
        
        if response.status_code == expected_status:
            return True, f"✅ {method} {endpoint} - {response.status_code}"
        else:
            return False, f"❌ {method} {endpoint} - Expected {expected_status}, got {response.status_code}"
            
    except requests.exceptions.ConnectionError:
        return False, f"❌ {method} {endpoint} - Connection failed (server not running?)"
    except Exception as e:
        return False, f"❌ {method} {endpoint} - Error: {str(e)}"

def test_authentication():
    """Test authentication endpoints."""
    print("\n🔐 Testing Authentication Endpoints...")
    
    # Test registration
    success, message = test_endpoint('POST', 'auth/register/', test_user, expected_status=201)
    print(message)
    
    # Test login
    login_data = {
        'email': test_user['email'],
        'password': test_user['password']
    }
    success, message = test_endpoint('POST', 'auth/login/', login_data)
    print(message)
    
    if success:
        # Try to get auth token for other tests
        response = requests.post(f'{API_BASE}/auth/login/', json=login_data)
        if response.status_code == 200:
            return response.json().get('access')
    
    return None

def test_banking_endpoints(auth_token):
    """Test banking endpoints."""
    print("\n🏦 Testing Banking Endpoints...")
    
    endpoints = [
        ('GET', 'banking/cards/'),
        ('POST', 'banking/cards/'),
        ('GET', 'banking/transfers/'),
    ]
    
    for method, endpoint in endpoints:
        success, message = test_endpoint(method, endpoint, auth_token=auth_token)
        print(message)

def test_transaction_endpoints(auth_token):
    """Test transaction endpoints."""
    print("\n💳 Testing Transaction Endpoints...")
    
    endpoints = [
        ('GET', 'transactions/'),
        ('GET', 'transactions/bills/'),
        ('GET', 'transactions/investments/'),
    ]
    
    for method, endpoint in endpoints:
        success, message = test_endpoint(method, endpoint, auth_token=auth_token)
        print(message)

def test_api_endpoints(auth_token):
    """Test general API endpoints."""
    print("\n🔧 Testing General API Endpoints...")
    
    endpoints = [
        ('GET', 'market-data/'),
        ('GET', 'system-status/'),
        ('GET', 'health-check/'),
        ('GET', 'version/'),
    ]
    
    for method, endpoint in endpoints:
        success, message = test_endpoint(method, endpoint, auth_token=auth_token)
        print(message)

def test_missing_endpoints():
    """Test endpoints that frontend expects but might not exist."""
    print("\n⚠️  Testing Missing Endpoints (Frontend expects these)...")
    
    missing_endpoints = [
        ('GET', 'loans/'),
        ('GET', 'location/states/'),
        ('GET', 'admin/users/'),
        ('GET', 'users/profile/'),
    ]
    
    for method, endpoint in missing_endpoints:
        success, message = test_endpoint(method, endpoint, expected_status=404)
        if not success and "404" in message:
            print(f"❌ {method} {endpoint} - Missing (Frontend expects this)")
        else:
            print(f"✅ {method} {endpoint} - Found")

def main():
    """Main testing function."""
    print("🚀 Starting API Endpoint Testing...")
    print(f"Testing against: {API_BASE}")
    
    # Test if server is running
    try:
        response = requests.get(f'{BASE_URL}/admin/')
        print("✅ Django server is running")
    except requests.exceptions.ConnectionError:
        print("❌ Django server is not running. Please start it with: python manage.py runserver")
        sys.exit(1)
    
    # Test authentication
    auth_token = test_authentication()
    
    # Test endpoints that require authentication
    if auth_token:
        test_banking_endpoints(auth_token)
        test_transaction_endpoints(auth_token)
        test_api_endpoints(auth_token)
    else:
        print("⚠️  Skipping authenticated endpoints due to auth failure")
    
    # Test missing endpoints
    test_missing_endpoints()
    
    print("\n📊 Testing Complete!")
    print("\nNext steps:")
    print("1. Fix any failed endpoints")
    print("2. Implement missing endpoints")
    print("3. Update frontend API calls to match backend")
    print("4. Test full user flows")

if __name__ == '__main__':
    main() 