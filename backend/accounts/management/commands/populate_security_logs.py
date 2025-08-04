from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import SecurityAuditLog
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate sample security audit logs for testing'

    def handle(self, *args, **options):
        # Get or create a test user
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User',
                'password': 'testpass123'
            }
        )

        # Sample security events
        events = [
            {
                'event_type': 'login_success',
                'description': 'User successfully logged in from IP 192.168.1.100',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': '2fa_setup',
                'description': 'User completed 2FA setup with Google Authenticator',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': 'pin_setup',
                'description': 'User set up 4-digit transfer PIN',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': 'pin_verify_success',
                'description': 'User successfully verified transfer PIN for transaction',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': 'login_failed',
                'description': 'Failed login attempt with incorrect password',
                'ip_address': '203.0.113.45',
                'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
            },
            {
                'event_type': '2fa_enabled',
                'description': 'User enabled two-factor authentication',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': 'backup_code_used',
                'description': 'User used backup code for 2FA recovery',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            {
                'event_type': 'email_verified',
                'description': 'User verified email address',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        ]

        # Create security audit logs with different timestamps
        for i, event in enumerate(events):
            # Create logs with different timestamps (recent to older)
            created_at = timezone.now() - timedelta(hours=i*2)
            
            SecurityAuditLog.objects.create(
                user=user,
                event_type=event['event_type'],
                description=event['description'],
                ip_address=event['ip_address'],
                user_agent=event['user_agent'],
                created_at=created_at
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(events)} security audit logs')
        ) 