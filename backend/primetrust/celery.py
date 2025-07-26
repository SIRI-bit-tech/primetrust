import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primetrust.settings')

app = Celery('primetrust')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Celery configuration
app.conf.update(
    # Task routing
    task_routes={
        'accounts.tasks.*': {'queue': 'accounts'},
        'banking.tasks.*': {'queue': 'banking'},
        'transactions.tasks.*': {'queue': 'transactions'},
        'api.tasks.*': {'queue': 'api'},
    },
    
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    
    # Result backend
    result_expires=3600,  # 1 hour
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        'reset-daily-card-limits': {
            'task': 'banking.tasks.reset_daily_card_limits',
            'schedule': 86400.0,  # Daily
        },
        'reset-monthly-card-limits': {
            'task': 'banking.tasks.reset_monthly_card_limits',
            'schedule': 2592000.0,  # Monthly
        },
        'process-pending-transfers': {
            'task': 'banking.tasks.process_pending_transfers',
            'schedule': 300.0,  # Every 5 minutes
        },
        'send-payment-reminders': {
            'task': 'transactions.tasks.send_payment_reminders',
            'schedule': 3600.0,  # Hourly
        },
        'update-market-data': {
            'task': 'api.tasks.update_market_data',
            'schedule': 300.0,  # Every 5 minutes
        },
        'cleanup-expired-tokens': {
            'task': 'accounts.tasks.cleanup_expired_tokens',
            'schedule': 3600.0,  # Hourly
        },
        'generate-monthly-reports': {
            'task': 'transactions.tasks.generate_monthly_reports',
            'schedule': 2592000.0,  # Monthly
        },
    },
)

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}') 