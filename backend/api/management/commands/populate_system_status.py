from django.core.management.base import BaseCommand
from api.models import SystemStatus
from django.utils import timezone


class Command(BaseCommand):
    help = 'Populate system status with initial data for all components'

    def handle(self, *args, **options):
        components = [
            'api',
            'database', 
            'redis',
            'celery',
            'email',
            'payment',
            'market_data'
        ]

        for component in components:
            status_obj, created = SystemStatus.objects.get_or_create(
                component=component,
                defaults={
                    'status': 'operational',
                    'message': f'{component.title()} is operational',
                    'response_time': 100.0,
                    'uptime_percentage': 99.9,
                    'error_count': 0,
                    'request_count': 1000
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created SystemStatus for {component}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'SystemStatus for {component} already exists')
                )

        self.stdout.write(
            self.style.SUCCESS('System status population completed successfully')
        ) 