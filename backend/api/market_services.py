"""
Real-time market data services for stocks and crypto.
"""
import requests
from decimal import Decimal
from django.core.cache import cache
from typing import Dict, List, Optional


def get_stock_quotes(symbols: List[str]) -> Dict[str, dict]:
    """
    Get real-time stock quotes for given symbols.
    Uses yfinance-style scraping approach (no API key required).
    """
    cache_key = f"stock_quotes_{'_'.join(symbols)}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    results = {}
    
    # Fetch quotes one by one to avoid rate limiting
    for symbol in symbols:
        try:
            # Use Yahoo Finance quote summary endpoint
            response = requests.get(
                f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}',
                params={
                    'interval': '1d',
                    'range': '1d'
                },
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                chart = data.get('chart', {}).get('result', [{}])[0]
                meta = chart.get('meta', {})
                
                if meta:
                    current_price = meta.get('regularMarketPrice', 0)
                    previous_close = meta.get('chartPreviousClose', current_price)
                    change = current_price - previous_close
                    change_percent = (change / previous_close * 100) if previous_close else 0
                    
                    results[symbol] = {
                        'price': float(current_price),
                        'change': float(change),
                        'changePercent': float(change_percent),
                        'name': meta.get('longName', meta.get('shortName', symbol)),
                        'volume': meta.get('regularMarketVolume', 0),
                    }
        except Exception as e:
            print(f"Error fetching {symbol}: {str(e)}")
            continue
    
    # Cache for 1 minute
    if results:
        cache.set(cache_key, results, 60)
    
    return results


def get_crypto_quotes(symbols: List[str]) -> Dict[str, dict]:
    """
    Get real-time cryptocurrency quotes.
    Uses CoinGecko API (free, no key required).
    """
    cache_key = f"crypto_quotes_{'_'.join(symbols)}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    results = {}
    
    # Map common symbols to CoinGecko IDs and names
    symbol_to_id = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOGE': 'dogecoin',
        'AVAX': 'avalanche-2',
        'DOT': 'polkadot',
        'MATIC': 'matic-network',
        'LINK': 'chainlink',
        'UNI': 'uniswap',
        'LTC': 'litecoin',
        'ATOM': 'cosmos',
        'XLM': 'stellar',
    }
    
    symbol_to_name = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'BNB': 'Binance Coin',
        'SOL': 'Solana',
        'XRP': 'Ripple',
        'ADA': 'Cardano',
        'DOGE': 'Dogecoin',
        'AVAX': 'Avalanche',
        'DOT': 'Polkadot',
        'MATIC': 'Polygon',
        'LINK': 'Chainlink',
        'UNI': 'Uniswap',
        'LTC': 'Litecoin',
        'ATOM': 'Cosmos',
        'XLM': 'Stellar',
    }
    
    try:
        # Get CoinGecko IDs for symbols
        ids = [symbol_to_id.get(symbol.upper(), symbol.lower()) for symbol in symbols]
        ids_str = ','.join(ids)
        
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={
                'ids': ids_str,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_24hr_vol': 'true'
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        for symbol, coin_id in zip(symbols, ids):
            if coin_id in data:
                coin_data = data[coin_id]
                price = coin_data.get('usd', 0)
                change_percent = coin_data.get('usd_24h_change', 0)
                change = price * (change_percent / 100)
                
                results[symbol.upper()] = {
                    'price': float(price),
                    'change': float(change),
                    'changePercent': float(change_percent),
                    'name': symbol_to_name.get(symbol.upper(), symbol.upper()),
                    'volume': coin_data.get('usd_24h_vol', 0),
                }
        
        # Cache for 1 minute
        cache.set(cache_key, results, 60)
        return results
        
    except Exception:
        return {}


def get_market_data() -> Dict[str, List[dict]]:
    """
    Get combined market data for stocks and crypto.
    """
    # Popular stocks
    stock_symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    stocks_data = get_stock_quotes(stock_symbols)
    
    # Popular cryptocurrencies
    crypto_symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
    crypto_data = get_crypto_quotes(crypto_symbols)
    
    return {
        'stocks': [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'change': data.get('change', 0),
                'changePercent': data.get('changePercent', 0),
            }
            for symbol, data in stocks_data.items()
        ],
        'crypto': [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'change': data.get('change', 0),
                'changePercent': data.get('changePercent', 0),
            }
            for symbol, data in crypto_data.items()
        ]
    }


def get_available_investments(investment_type: str) -> List[dict]:
    """
    Get list of available investments by type with current prices.
    Only returns investments with real prices from APIs.
    """
    cache_key = f"available_investments_{investment_type}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    results = []
    
    if investment_type == 'stocks':
        # Popular stocks
        symbols = [
            'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 
            'V', 'WMT', 'JNJ', 'PG', 'MA', 'HD', 'DIS', 'BAC', 'NFLX', 'ADBE',
            'CRM', 'CSCO', 'PEP', 'KO', 'INTC', 'VZ', 'T', 'CMCSA', 'PFE', 'MRK'
        ]
        quotes = get_stock_quotes(symbols)
        results = [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'type': 'stock'
            }
            for symbol, data in quotes.items()
        ]
    
    elif investment_type == 'etfs':
        # Popular ETFs
        symbols = [
            'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 
            'AGG', 'BND', 'GLD', 'SLV', 'USO', 'TLT', 'EEM', 'XLF'
        ]
        quotes = get_stock_quotes(symbols)
        results = [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'type': 'etf'
            }
            for symbol, data in quotes.items()
        ]
    
    elif investment_type == 'crypto':
        # Popular cryptocurrencies
        symbols = [
            'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 
            'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'LTC', 'ATOM', 'XLM'
        ]
        quotes = get_crypto_quotes(symbols)
        results = [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'type': 'crypto'
            }
            for symbol, data in quotes.items()
        ]
    
    elif investment_type == 'bonds':
        # Bond ETFs (since individual bonds are harder to track)
        symbols = ['AGG', 'BND', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'MUB']
        quotes = get_stock_quotes(symbols)
        results = [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'type': 'bond'
            }
            for symbol, data in quotes.items()
        ]
    
    elif investment_type == 'mutual_funds':
        # Popular mutual fund ETF equivalents
        symbols = ['VFIAX', 'VTSAX', 'VTIAX', 'VBTLX', 'VWELX', 'VTMFX']
        quotes = get_stock_quotes(symbols)
        results = [
            {
                'symbol': symbol,
                'name': data.get('name', symbol),
                'price': data.get('price', 0),
                'type': 'mutual_fund'
            }
            for symbol, data in quotes.items()
        ]
    
    # Cache for 2 minutes
    cache.set(cache_key, results, 120)
    return results
