"""
Helper functions for investment notifications.
"""
import logging

logger = logging.getLogger(__name__)


def send_investment_notifications(user, investment, action):
    """
    Send investment notifications via multiple channels.
    
    Args:
        user: User instance
        investment: Investment instance
        action: Action type ('purchased', 'sold', etc.)
    """
    # Trigger database notification
    try:
        from api.services import trigger_investment_notification
        trigger_investment_notification(user, investment, action)
    except Exception as e:
        logger.error(f"Failed to trigger investment notification for user {user.id}: {str(e)}")
    
    # Send real-time WebSocket notification
    try:
        from socketio_app.utils import send_notification, notify_balance_update
        
        # Prepare notification message based on action
        if action == 'purchased':
            title = 'Investment Purchased'
            message = f'Successfully purchased {investment.name} ({investment.symbol}) for ${investment.amount_invested}'
        elif action == 'sold':
            title = 'Investment Sold'
            message = f'Successfully sold {investment.name} ({investment.symbol})'
        else:
            title = 'Investment Update'
            message = f'Investment {investment.name} ({investment.symbol}) has been updated'
        
        send_notification(
            user.id,
            title,
            message,
            'success'
        )
        notify_balance_update(user.id, user.balance)
    except Exception as e:
        logger.error(f"Failed to send WebSocket notification for user {user.id}: {str(e)}")
