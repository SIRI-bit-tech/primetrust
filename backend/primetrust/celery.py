"""
Celery configuration for PrimeTrust
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primetrust.settings')

app = Celery('primetrust')

# Load config from Django settings with CELERY namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# Periodic task schedule
app.conf.beat_schedule = {
    'process-expired-check-holds': {
        'task': 'banking.tasks.process_expired_check_holds',
        'schedule': crontab(minute='*/30'),  # Run every 30 minutes
    },
    'detect-duplicate-checks': {
        'task': 'banking.tasks.detect_duplicate_checks',
        'schedule': crontab(hour='*/6'),  # Run every 6 hours
    },
}

app.conf.timezone = 'UTC'

# Windows-specific configuration
import sys
if sys.platform == 'win32':
    # Use solo pool on Windows (single process)
    app.conf.worker_pool = 'solo'
    # Disable prefork on Windows
    app.conf.worker_concurrency = 1


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
