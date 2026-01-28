"""
Celery tasks for banking operations
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction, Q
from .models import CheckDeposit, Transfer
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_expired_check_holds():
    """
    Process check deposits whose hold period has expired.
    Runs every hour to check for deposits ready to be completed.
    """
    now = timezone.now()
    
    # Find approved deposits whose hold period has expired
    expired_deposits = CheckDeposit.objects.filter(
        status='approved',
        hold_until__lte=now
    )
    
    completed_count = 0
    failed_count = 0
    
    for deposit in expired_deposits:
        try:
            success, message = deposit.complete()
            if success:
                completed_count += 1
                logger.info(f"Auto-completed check deposit {deposit.id} for user {deposit.user.email}")
            else:
                failed_count += 1
                logger.error(f"Failed to auto-complete deposit {deposit.id}: {message}")
        except Exception as e:
            failed_count += 1
            logger.error(f"Error auto-completing deposit {deposit.id}: {str(e)}")
    
    return {
        'completed': completed_count,
        'failed': failed_count,
        'total_processed': completed_count + failed_count
    }


@shared_task
def detect_duplicate_checks():
    """
    Detect potential duplicate check deposits.
    Checks for deposits with same check number from same user within 30 days.
    """
    from datetime import timedelta
    
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # Get all pending deposits
    pending_deposits = CheckDeposit.objects.filter(
        status='pending',
        check_number__isnull=False
    ).exclude(check_number='')
    
    duplicates_found = []
    
    for deposit in pending_deposits:
        # Look for other deposits with same check number from same user
        potential_duplicates = CheckDeposit.objects.filter(
            user=deposit.user,
            check_number=deposit.check_number,
            created_at__gte=thirty_days_ago
        ).exclude(id=deposit.id).exclude(status='rejected')
        
        if potential_duplicates.exists():
            duplicates_found.append({
                'deposit_id': deposit.id,
                'user_email': deposit.user.email,
                'check_number': deposit.check_number,
                'amount': str(deposit.amount),
                'duplicate_count': potential_duplicates.count()
            })
            
            # Add admin note (preserve existing notes)
            existing_notes = deposit.admin_notes or ""
            duplicate_note = f"⚠️ POTENTIAL DUPLICATE: Found {potential_duplicates.count()} other deposit(s) with same check number from this user in last 30 days."
            
            if existing_notes:
                deposit.admin_notes = f"{existing_notes}\n\n{duplicate_note}"
            else:
                deposit.admin_notes = duplicate_note
            
            deposit.save(update_fields=['admin_notes'])
            
            logger.warning(f"Duplicate check detected: Deposit {deposit.id}, Check #{deposit.check_number}")
    
    return {
        'duplicates_found': len(duplicates_found),
        'details': duplicates_found
    }


@shared_task
def validate_check_image_quality(deposit_id):
    """
    Validate check image quality using basic checks.
    Can be extended with ML-based quality detection.
    """
    try:
        deposit = CheckDeposit.objects.get(id=deposit_id)
        
        from PIL import Image
        import io
        
        issues = []
        
        # Check front image
        if deposit.front_image:
            try:
                front_img = Image.open(deposit.front_image)
                width, height = front_img.size
                
                # Check minimum resolution (should be at least 800x400)
                if width < 800 or height < 400:
                    issues.append(f"Front image resolution too low: {width}x{height} (minimum 800x400)")
                
                # Check if image is too dark or too bright
                grayscale = front_img.convert('L')
                pixels = list(grayscale.getdata())
                avg_brightness = sum(pixels) / len(pixels)
                
                if avg_brightness < 50:
                    issues.append("Front image is too dark")
                elif avg_brightness > 200:
                    issues.append("Front image is too bright (possible glare)")
                    
            except Exception as e:
                issues.append(f"Error processing front image: {str(e)}")
        
        # Check back image
        if deposit.back_image:
            try:
                back_img = Image.open(deposit.back_image)
                width, height = back_img.size
                
                if width < 800 or height < 400:
                    issues.append(f"Back image resolution too low: {width}x{height} (minimum 800x400)")
                    
            except Exception as e:
                issues.append(f"Error processing back image: {str(e)}")
        
        # Update deposit with quality check results
        if issues:
            quality_note = "⚠️ IMAGE QUALITY ISSUES:\n" + "\n".join(f"- {issue}" for issue in issues)
            if deposit.admin_notes:
                deposit.admin_notes += f"\n\n{quality_note}"
            else:
                deposit.admin_notes = quality_note
            deposit.save(update_fields=['admin_notes'])
            
            logger.warning(f"Image quality issues for deposit {deposit_id}: {issues}")
        else:
            logger.info(f"Image quality check passed for deposit {deposit_id}")
        
        return {
            'deposit_id': deposit_id,
            'issues': issues,
            'passed': len(issues) == 0
        }
        
    except CheckDeposit.DoesNotExist:
        logger.error(f"Deposit {deposit_id} not found for quality check")
        return {'error': 'Deposit not found'}
    except Exception as e:
        logger.error(f"Error validating image quality for deposit {deposit_id}: {str(e)}")
        return {'error': str(e)}


@shared_task
def send_check_deposit_email_notification(deposit_id, notification_type):
    """
    Send email notification for check deposit status changes.
    
    Args:
        deposit_id: ID of the check deposit
        notification_type: 'submitted', 'approved', 'rejected', 'completed'
    """
    try:
        deposit = CheckDeposit.objects.get(id=deposit_id)
        user = deposit.user
        
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject_map = {
            'submitted': 'Check Deposit Submitted',
            'approved': 'Check Deposit Approved',
            'rejected': 'Check Deposit Rejected',
            'completed': 'Check Deposit Completed - Funds Available'
        }
        
        message_map = {
            'submitted': f'Your check deposit of ${deposit.amount} has been submitted and is under review.',
            'approved': f'Your check deposit of ${deposit.amount} has been approved. Funds will be available on {deposit.hold_until.strftime("%B %d, %Y") if deposit.hold_until else "soon"}.',
            'rejected': f'Your check deposit of ${deposit.amount} has been rejected. Please contact support for more details.',
            'completed': f'Your check deposit of ${deposit.amount} is now complete. Funds have been added to your account.'
        }
        
        subject = subject_map.get(notification_type, 'Check Deposit Update')
        message = message_map.get(notification_type, 'Your check deposit status has been updated.')
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        # Log admin notes internally for audit purposes (not sent to user)
        if notification_type == 'rejected' and deposit.admin_notes:
            logger.info(
                f"Email sent to {user.email} for deposit {deposit_id}: {notification_type}. "
                f"Admin notes (internal only): {deposit.admin_notes}"
            )
        else:
            logger.info(f"Email sent to {user.email} for deposit {deposit_id}: {notification_type}")
        return {'success': True, 'email': user.email}
        
    except CheckDeposit.DoesNotExist:
        logger.error(f"Deposit {deposit_id} not found for email notification")
        return {'error': 'Deposit not found'}
    except Exception as e:
        logger.error(f"Error sending email for deposit {deposit_id}: {str(e)}")
        return {'error': str(e)}
@shared_task
def auto_approve_pending_transfers():
    """
    Auto-approve transfers that have been pending for more than 2 minutes.
    """
    from datetime import timedelta
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    # Get a system admin for the approval process
    admin_user = User.objects.filter(is_staff=True).first()
    
    if not admin_user:
        logger.error("No admin user found for auto-approval")
        return "Failed: No admin user found"
        
    two_minutes_ago = timezone.now() - timedelta(minutes=2)
    
    # Process both internal and external transfers that are pending
    pending_transfers = Transfer.objects.filter(
        status='pending',
        requires_admin_approval=True,
        admin_approved=False,
        created_at__lte=two_minutes_ago
    )
    
    count = 0
    for transfer in pending_transfers:
        try:
            with transaction.atomic():
                # Re-fetch with row lock and re-check conditions
                locked_transfer = Transfer.objects.select_for_update().get(pk=transfer.pk)
                
                if (locked_transfer.status == 'pending' and 
                    locked_transfer.requires_admin_approval and 
                    not locked_transfer.admin_approved):
                    
                    success, message = locked_transfer.admin_approve_transfer(
                        admin_user=admin_user, 
                        notes="Auto-approved by system after 2 minutes."
                    )
                    
                    if success:
                        count += 1
                        logger.info(f"Auto-approved transfer {locked_transfer.id} (Ref: {locked_transfer.reference_number})")
                    else:
                        logger.error(f"Failed to auto-approve transfer {locked_transfer.id}: {message}")
        except Exception as e:
            logger.error(f"Exception during auto-approval of transfer {transfer.id}: {str(e)}")
            
    return f"Auto-approved {count} transfers"
