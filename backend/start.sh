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

# Process type based on argument
PROCESS_TYPE=$1

case "$PROCESS_TYPE" in
  "web")
    run_migrations
    collect_static
    echo "Starting Gunicorn..."
    exec gunicorn primetrust.wsgi:application \
        --bind 0.0.0.0:$PORT \
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
