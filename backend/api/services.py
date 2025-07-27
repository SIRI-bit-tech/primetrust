from django.utils import timezone
from .models import Notification
from transactions.models import Transaction
from banking.models import Transfer
import uuid


class NotificationService:
    """Service for handling notifications."""
    
    @staticmethod
    def create_notification(user, notification_type, title, message, priority='medium', related_object=None, data=None):
        """Create a new notification."""
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            data=data or {}
        )
        
        # Set related object if provided
        if related_object:
            if isinstance(related_object, Transaction):
                notification.related_transaction = related_object
            elif hasattr(related_object, 'id'):  # Generic related object
                notification.data['related_object_id'] = related_object.id
                notification.data['related_object_type'] = related_object.__class__.__name__
        
        notification.save()
        return notification
    
    @staticmethod
    def create_transaction_notification(user, transaction, transaction_type):
        """Create notification for transaction events."""
        if transaction_type == 'completed':
            title = "Transaction Completed"
            message = f"Your {transaction.transaction_type} transaction of {transaction.currency} {transaction.amount} has been completed successfully."
            priority = 'medium'
        elif transaction_type == 'failed':
            title = "Transaction Failed"
            message = f"Your {transaction.transaction_type} transaction of {transaction.currency} {transaction.amount} has failed. Please try again."
            priority = 'high'
        elif transaction_type == 'pending':
            title = "Transaction Pending"
            message = f"Your {transaction.transaction_type} transaction of {transaction.currency} {transaction.amount} is being processed."
            priority = 'low'
        
        return NotificationService.create_notification(
            user=user,
            notification_type='transaction',
            title=title,
            message=message,
            priority=priority,
            related_object=transaction
        )
    
    @staticmethod
    def create_security_notification(user, event_type, details=None):
        """Create security-related notifications."""
        notifications = {
            'login_attempt': {
                'title': 'New Login Attempt',
                'message': 'A new login attempt was detected on your account.',
                'priority': 'medium'
            },
            'password_changed': {
                'title': 'Password Changed',
                'message': 'Your password has been successfully changed.',
                'priority': 'high'
            },
            'suspicious_activity': {
                'title': 'Suspicious Activity Detected',
                'message': 'We detected suspicious activity on your account. Please review your recent transactions.',
                'priority': 'urgent'
            },
            'two_factor_enabled': {
                'title': 'Two-Factor Authentication Enabled',
                'message': 'Two-factor authentication has been enabled on your account.',
                'priority': 'high'
            },
            'two_factor_disabled': {
                'title': 'Two-Factor Authentication Disabled',
                'message': 'Two-factor authentication has been disabled on your account.',
                'priority': 'high'
            }
        }
        
        if event_type in notifications:
            notification_data = notifications[event_type]
            return NotificationService.create_notification(
                user=user,
                notification_type='security',
                title=notification_data['title'],
                message=notification_data['message'],
                priority=notification_data['priority'],
                data=details or {}
            )
    
    @staticmethod
    def create_account_notification(user, event_type, details=None):
        """Create account-related notifications."""
        notifications = {
            'account_created': {
                'title': 'Account Created',
                'message': 'Welcome to PrimeTrust! Your account has been successfully created.',
                'priority': 'medium'
            },
            'balance_low': {
                'title': 'Low Balance Alert',
                'message': 'Your account balance is running low. Consider adding funds.',
                'priority': 'medium'
            },
            'deposit_received': {
                'title': 'Deposit Received',
                'message': f'You have received a deposit of {details.get("amount", "funds")} to your account.',
                'priority': 'medium'
            },
            'withdrawal_processed': {
                'title': 'Withdrawal Processed',
                'message': f'Your withdrawal of {details.get("amount", "funds")} has been processed.',
                'priority': 'medium'
            }
        }
        
        if event_type in notifications:
            notification_data = notifications[event_type]
            return NotificationService.create_notification(
                user=user,
                notification_type='account',
                title=notification_data['title'],
                message=notification_data['message'],
                priority=notification_data['priority'],
                data=details or {}
            )
    
    @staticmethod
    def create_system_notification(user, title, message, priority='medium'):
        """Create system notifications."""
        return NotificationService.create_notification(
            user=user,
            notification_type='system',
            title=title,
            message=message,
            priority=priority
        )
    
    @staticmethod
    def mark_as_read(notification_ids, user):
        """Mark notifications as read."""
        if notification_ids:
            Notification.objects.filter(
                id__in=notification_ids,
                user=user
            ).update(is_read=True, read_at=timezone.now())
        else:
            # Mark all notifications as read
            Notification.objects.filter(
                user=user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
    
    @staticmethod
    def get_unread_count(user):
        """Get count of unread notifications."""
        return Notification.objects.filter(user=user, is_read=False).count()
    
    @staticmethod
    def get_recent_notifications(user, limit=10):
        """Get recent notifications for user."""
        return Notification.objects.filter(user=user).order_by('-created_at')[:limit]


# Real-time notification triggers for production use
def trigger_account_created_notification(user):
    """Trigger notification when user account is created."""
    return NotificationService.create_notification(
        user=user,
        notification_type='account',
        title='Welcome to PrimeTrust!',
        message='Your account has been successfully created. Start exploring our features!',
        priority='medium'
    )

def trigger_transaction_notification(user, transaction, transaction_type):
    """Trigger notification for any transaction (debit/credit)."""
    return NotificationService.create_transaction_notification(user, transaction, transaction_type)

def trigger_loan_notification(user, loan, action_type):
    """Trigger notification for loan actions."""
    if action_type == 'applied':
        title = 'Loan Application Submitted'
        message = f'Your {loan.loan_type} loan application for ${loan.amount} has been submitted and is under review.'
        priority = 'medium'
    elif action_type == 'approved':
        title = 'Loan Approved!'
        message = f'Congratulations! Your {loan.loan_type} loan for ${loan.amount} has been approved.'
        priority = 'high'
    elif action_type == 'payment_made':
        title = 'Loan Payment Received'
        message = f'Your loan payment has been processed. Remaining balance: ${loan.remaining_balance}'
        priority = 'medium'
    
    return NotificationService.create_notification(
        user=user,
        notification_type='loan',
        title=title,
        message=message,
        priority=priority
    )

def trigger_investment_notification(user, investment):
    """Trigger notification for investment creation."""
    try:
        notification = Notification.objects.create(
            user=user,
            title="Investment Created",
            message=f"Your investment of ${investment.amount} has been created successfully.",
            notification_type="investment",
            data={
                'investment_id': investment.id,
                'amount': str(investment.amount),
                'investment_type': investment.investment_type,
                'status': investment.status
            }
        )
        return notification
    except Exception as e:
        print(f"Error creating investment notification: {e}")
        return None


def trigger_bitcoin_transaction_notification(user, transaction):
    """Trigger notification for Bitcoin transaction."""
    try:
        amount_display = f"${transaction.amount_usd}" if transaction.balance_source == 'fiat' else f"{transaction.amount_btc} BTC"
        
        notification = Notification.objects.create(
            user=user,
            title="Bitcoin Transaction",
            message=f"Your Bitcoin transaction of {amount_display} has been initiated successfully.",
            notification_type="bitcoin_transaction",
            data={
                'transaction_id': transaction.id,
                'amount_usd': str(transaction.amount_usd),
                'amount_btc': str(transaction.amount_btc),
                'balance_source': transaction.balance_source,
                'recipient_address': transaction.recipient_wallet_address,
                'status': transaction.status,
                'blockchain_tx_id': transaction.blockchain_tx_id
            }
        )
        return notification
    except Exception as e:
        print(f"Error creating Bitcoin transaction notification: {e}")
        return None

def trigger_bill_notification(user, bill, action_type):
    """Trigger notification for bill actions."""
    if action_type == 'added':
        title = 'New Bill Added'
        message = f'New bill from {bill.biller_name} for ${bill.amount} due on {bill.due_date}'
        priority = 'medium'
    elif action_type == 'paid':
        title = 'Bill Paid Successfully'
        message = f'Your bill to {bill.biller_name} for ${bill.amount} has been paid.'
        priority = 'medium'
    elif action_type == 'overdue':
        title = 'Bill Overdue'
        message = f'Your bill to {bill.biller_name} for ${bill.amount} is overdue. Please pay immediately.'
        priority = 'high'
    
    return NotificationService.create_notification(
        user=user,
        notification_type='bill',
        title=title,
        message=message,
        priority=priority
    )

def trigger_security_notification(user, event_type, details=None):
    """Trigger security notifications."""
    return NotificationService.create_security_notification(user, event_type, details) 