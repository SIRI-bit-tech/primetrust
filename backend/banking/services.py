from django.utils import timezone
from api.models import Notification
from .models import CardApplication
import logging

logger = logging.getLogger(__name__)


class CardApplicationNotificationService:
    """Service for sending notifications related to card applications."""
    
    @staticmethod
    def send_application_approved_notification(application: CardApplication):
        """Send notification when application is approved and moved to processing."""
        estimated_date = application.estimated_completion_date
        estimated_days = application.get_estimated_completion_days()
        
        title = "Card Application Approved"
        message = f"Your {application.get_card_type_display()} card application has been approved and is now being processed. "
        
        if estimated_date:
            message += f"Your card will be ready by {estimated_date.strftime('%B %d, %Y')}."
        elif estimated_days is not None:
            message += f"Your card will be ready in approximately {estimated_days} days."
        else:
            message += "Your card will be ready soon."
        
        Notification.objects.create(
            user=application.user,
            notification_type='card_application',
            priority='medium',
            title=title,
            message=message,
            data={
                'application_id': application.id,
                'card_type': application.card_type,
                'status': 'processing',
                'estimated_completion_date': estimated_date.isoformat() if estimated_date else None,
                'estimated_completion_days': estimated_days
            }
        )
    
    @staticmethod
    def send_application_processing_notification(application: CardApplication):
        """Send notification when application is marked as processing."""
        estimated_date = application.estimated_completion_date
        estimated_days = application.get_estimated_completion_days()
        
        title = "Card Application Processing"
        message = f"Your {application.get_card_type_display()} card is now being processed. "
        
        if estimated_date:
            message += f"Expected completion date: {estimated_date.strftime('%B %d, %Y')}."
        elif estimated_days is not None:
            message += f"Expected completion in {estimated_days} days."
        else:
            message += "We'll notify you when it's ready."
        
        Notification.objects.create(
            user=application.user,
            notification_type='card_application',
            priority='medium',
            title=title,
            message=message,
            data={
                'application_id': application.id,
                'card_type': application.card_type,
                'status': 'processing',
                'estimated_completion_date': estimated_date.isoformat() if estimated_date else None,
                'estimated_completion_days': estimated_days
            }
        )
    
    @staticmethod
    def send_application_rejected_notification(application: CardApplication):
        """Send notification when application is rejected."""
        title = "Card Application Rejected"
        message = f"Your {application.get_card_type_display()} card application has been rejected."
        
        if application.admin_notes:
            message += f" Reason: {application.admin_notes}"
        else:
            message += " Please contact support for more information."
        
        Notification.objects.create(
            user=application.user,
            notification_type='card_application',
            priority='high',
            title=title,
            message=message,
            data={
                'application_id': application.id,
                'card_type': application.card_type,
                'status': 'rejected',
                'admin_notes': application.admin_notes
            }
        )
    
    @staticmethod
    def send_application_completed_notification(application: CardApplication, card_number: str = None):
        """Send notification when application is completed and card is generated."""
        try:
            title = "Your Virtual Card is Ready!"
            message = f"Your {application.get_card_type_display()} card has been successfully created and is now ready to use."
            
            if card_number:
                masked_number = f"**** **** **** {card_number[-4:]}"
                message += f" Card ending in {card_number[-4:]}."
            
            message += " You can view your card details in the Virtual Cards section."
            
            # Get the created card properly to avoid RelatedManager error
            created_card = application.created_card.first() if hasattr(application, 'created_card') else None
            card_id = created_card.id if created_card else None
            
            notification = Notification.objects.create(
                user=application.user,
                notification_type='card_application',
                priority='high',
                title=title,
                message=message,
                data={
                    'application_id': application.id,
                    'card_type': application.card_type,
                    'status': 'completed',
                    'card_number': card_number,
                    'card_id': card_id
                }
            )
            
            logger.info(f"Created completion notification {notification.id} for user {application.user.email}")
            print(f"✅ Created completion notification {notification.id} for user {application.user.email}")
            
        except Exception as e:
            logger.error(f"Error creating completion notification: {str(e)}")
            print(f"❌ Error creating completion notification: {str(e)}")
    
    @staticmethod
    def send_application_submitted_notification(application: CardApplication):
        """Send notification when application is first submitted."""
        title = "Card Application Submitted"
        message = f"Your {application.get_card_type_display()} card application has been submitted successfully. "
        message += "We'll review your application and notify you of the status within 1-2 business days."
        
        Notification.objects.create(
            user=application.user,
            notification_type='card_application',
            priority='medium',
            title=title,
            message=message,
            data={
                'application_id': application.id,
                'card_type': application.card_type,
                'status': 'pending'
            }
        )