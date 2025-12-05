"""
Bitcoin wallet services for price fetching and utilities.
"""
import requests
from decimal import Decimal
from django.core.cache import cache


def get_bitcoin_price():
    """
    Get current Bitcoin price in USD.
    Uses caching to avoid excessive API calls.
    """
    # Try to get from cache first (cache for 1 minute)
    cached_price = cache.get('bitcoin_price_usd')
    if cached_price:
        return Decimal(str(cached_price))
    
    try:
        # Fetch from CoinGecko API (free, no API key required)
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={'ids': 'bitcoin', 'vs_currencies': 'usd'},
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        price = data['bitcoin']['usd']
        
        # Cache for 1 minute
        cache.set('bitcoin_price_usd', price, 60)
        
        return Decimal(str(price))
    except Exception:
        # Try alternative API - CoinDesk
        try:
            response = requests.get(
                'https://api.coindesk.com/v1/bpi/currentprice/USD.json',
                timeout=5
            )
            response.raise_for_status()
            data = response.json()
            price = data['bpi']['USD']['rate_float']
            
            # Cache for 1 minute
            cache.set('bitcoin_price_usd', price, 60)
            
            return Decimal(str(price))
        except Exception:
            # If both APIs fail, try to get last cached price (even if expired)
            last_price = cache.get('bitcoin_price_usd_backup')
            if last_price:
                return Decimal(str(last_price))
            
            # Final fallback - raise exception to handle at higher level
            raise ValueError("Unable to fetch Bitcoin price from any source")


def calculate_btc_to_usd(btc_amount):
    """Convert Bitcoin amount to USD."""
    price = get_bitcoin_price()
    return Decimal(str(btc_amount)) * price


def calculate_usd_to_btc(usd_amount):
    """Convert USD amount to Bitcoin."""
    price = get_bitcoin_price()
    return Decimal(str(usd_amount)) / price
