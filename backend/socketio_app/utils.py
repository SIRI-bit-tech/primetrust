"""
Utility functions for Socket.IO events
"""
import redis
import json
import logging

logger = logging.getLogger(__name__)

# Redis client for pub/sub
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)


def notify_balance_update(user_id, balance):
    """Notify user of balance update"""
    try:
        message = {
            'event': 'balance_updated',
            'user_id': user_id,
            'data': {
                'balance': float(balance),
                'timestamp': None
            }
        }
        redis_client.publish('socketio_events', json.dumps(message))
        logger.info(f"Published balance update for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing balance update: {str(e)}")


def notify_transfer_update(user_id, transfer_id, status, transfer_type):
    """Notify user of transfer status update"""
    try:
        message = {
            'event': 'transfer_updated',
            'user_id': user_id,
            'data': {
                'transfer_id': transfer_id,
                'status': status,
                'transfer_type': transfer_type
            }
        }
        redis_client.publish('socketio_events', json.dumps(message))
        logger.info(f"Published transfer update for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing transfer update: {str(e)}")


def notify_card_update(user_id, card_id, status, action):
    """Notify user of card update"""
    try:
        message = {
            'event': 'card_updated',
            'user_id': user_id,
            'data': {
                'card_id': card_id,
                'status': status,
                'action': action
            }
        }
        redis_client.publish('socketio_events', json.dumps(message))
        logger.info(f"Published card update for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing card update: {str(e)}")


def notify_loan_update(user_id, loan_id, status):
    """Notify user of loan status update"""
    try:
        message = {
            'event': 'loan_updated',
            'user_id': user_id,
            'data': {
                'loan_id': loan_id,
                'status': status
            }
        }
        redis_client.publish('socketio_events', json.dumps(message))
        logger.info(f"Published loan update for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing loan update: {str(e)}")


def notify_bitcoin_transaction(user_id, transaction_id, status, transaction_type):
    """Notify user of Bitcoin transaction update"""
    try:
        message = {
            'event': 'bitcoin_transaction_updated',
            'user_id': user_id,
            'data': {
                'transaction_id': transaction_id,
                'status': status,
                'type': transaction_type
            }
        }
        redis_client.publish('socketio_events', json.dumps(message))
        logger.info(f"Published bitcoin transaction update for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing bitcoin transaction update: {str(e)}")


def send_notification(user_id, title, message, notification_type='info'):
    """Send general notification to user"""
    try:
        msg = {
            'event': 'notification',
            'user_id': user_id,
            'data': {
                'title': title,
                'message': message,
                'type': notification_type
            }
        }
        redis_client.publish('socketio_events', json.dumps(msg))
        logger.info(f"Published notification for user {user_id}")
    except Exception as e:
        logger.error(f"Error publishing notification: {str(e)}")


def send_admin_notification(title, message, notification_type='info'):
    """Send notification to all admin users"""
    try:
        msg = {
            'event': 'admin_notification',
            'room': 'admin_room',
            'data': {
                'title': title,
                'message': message,
                'type': notification_type
            }
        }
        redis_client.publish('socketio_events', json.dumps(msg))
        logger.info(f"Published admin notification")
    except Exception as e:
        logger.error(f"Error publishing admin notification: {str(e)}")
