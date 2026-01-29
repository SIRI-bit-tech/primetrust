#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to run migrations
run_migrations() {
  echo "Running migrations..."
  python manage.py migrate --noinput
}

# Function to collect static files
collect_static() {
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
}

# Function to create superuser
create_superuser() {
  if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Checking/creating superuser..."
    python manage.py shell <<EOF
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', email.split('@')[0])
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        username=username, 
        email=email, 
        password=password,
        first_name=os.environ.get('DJANGO_SUPERUSER_FIRST_NAME', 'Admin'),
        last_name=os.environ.get('DJANGO_SUPERUSER_LAST_NAME', 'User')
    )
    print(f"Superuser {email} created successfully.")
else:
    print(f"Superuser {email} already exists.")
EOF
    echo "Skipping superuser creation (missing DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_PASSWORD)"
  fi
}

# Function to keep server alive (Self-Ping)
# NOTE: This is a workaround for Free Tier idling.
keep_alive() {
  # Only run if RENDER_EXTERNAL_URL is set (indicates we are on Render)
  if [ -n "$RENDER_EXTERNAL_URL" ]; then
    echo "Initializing keep-alive ping for $RENDER_EXTERNAL_URL..."
    # Run in subshell in background
    (
      while true; do
        sleep 840 # Sleep 14 minutes (just under the 15-min limit)
        echo "Sending keep-alive ping..."
        # Use Python to ping the URL (avoids needing curl/wget installed)
        python -c "import urllib.request; print(urllib.request.urlopen('$RENDER_EXTERNAL_URL').getcode())" || echo "Ping failed"
      done
    ) &
  fi
}

# Process type based on argument
PROCESS_TYPE=$1

case "$PROCESS_TYPE" in
  "web")
    run_migrations
    create_superuser
    collect_static
    keep_alive
    echo "Starting Gunicorn..."
    exec gunicorn primetrust.wsgi:application \
        --bind 0.0.0.0:"${PORT:-8000}" \
        --workers 4 \
        --threads 2 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
    ;;
  "worker")
    echo "Starting Celery worker..."
    exec celery -A primetrust worker --loglevel=info --pool=solo
    ;;
  "beat")
    echo "Starting Celery beat..."
    exec celery -A primetrust beat --loglevel=info
    ;;
  *)
    echo "Usage: $0 {web|worker|beat}"
    exit 1
    ;;
esac
