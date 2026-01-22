"""
Utility functions for Ably real-time updates
"""
import os
import logging
import asyncio

logger = logging.getLogger(__name__)

# Initialize Ably client
# We use lazy initialization/import to avoid errors if package is missing
try:
    from ably import AblyRest
    ably_client = None
    ABLY_API_KEY = os.getenv('ABLY_API_KEY')
    
    if ABLY_API_KEY:
        ably_client = AblyRest(key=ABLY_API_KEY)
    else:
        logger.warning("ABLY_API_KEY not found. Real-time updates disabled.")
except ImportError:
    logger.error("Ably package not installed. Run 'pip install ably'")
    ably_client = None

def publish_to_ably_sync(channel_name, event_name, data):
    """Helper to publish to Ably synchronously"""
    if not ably_client:
        return
        
    try:
        channel = ably_client.channels.get(channel_name)
        # In the Python SDK, publish is synchronous by default unless using the asyncio variant
        channel.publish(event_name, data)
        logger.info(f"Published {event_name} to channel {channel_name}")
    except Exception as e:
        logger.error(f"Error publishing to Ably: {str(e)}")

def notify_balance_update(user_id, balance):
    """Notify user of balance update"""
    publish_to_ably_sync(f'user:{user_id}', 'balance_updated', {
        'balance': float(balance),
        'timestamp': None
    })

def notify_transfer_update(user_id, transfer_id, status, transfer_type):
    """Notify user of transfer status update"""
    publish_to_ably_sync(f'user:{user_id}', 'transfer_updated', {
        'transfer_id': transfer_id,
        'status': status,
        'transfer_type': transfer_type
    })

def notify_card_update(user_id, card_id, status, action):
    """Notify user of card application update"""
    publish_to_ably_sync(f'user:{user_id}', 'card_updated', {
        'application_id': card_id,
        'status': status,
        'action': action
    })

def notify_card_created(user_id, card_id, application_id):
    """Notify user that their card has been created"""
    publish_to_ably_sync(f'user:{user_id}', 'card_created', {
        'card_id': card_id,
        'application_id': application_id
    })

def notify_loan_update(user_id, loan_id, status):
    """Notify user of loan status update"""
    publish_to_ably_sync(f'user:{user_id}', 'loan_updated', {
        'loan_id': loan_id,
        'status': status
    })

def notify_bitcoin_transaction(user_id, transaction_id, status, transaction_type):
    """Notify user of Bitcoin transaction update"""
    publish_to_ably_sync(f'user:{user_id}', 'bitcoin_transaction_updated', {
        'transaction_id': transaction_id,
        'status': status,
        'type': transaction_type
    })

def send_notification(user_id, title, message, notification_type='info'):
    """Send general notification to user"""
    publish_to_ably_sync(f'user:{user_id}', 'notification', {
        'title': title,
        'message': message,
        'type': notification_type
    })

def send_admin_notification(title, message, notification_type='info'):
    """Send notification to all admin users"""
    publish_to_ably_sync('admin', 'admin_notification', {
        'title': title,
        'message': message,
        'type': notification_type
    })

def notify_check_deposit_update(user_id, deposit_id, status, amount):
    """Notify user of check deposit status update"""
    publish_to_ably_sync(f'user:{user_id}', 'check_deposit_updated', {
        'deposit_id': deposit_id,
        'status': status,
        'amount': float(amount)
    })
