# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8000

# Set work directory
WORKDIR /app

# Install system dependencies
# libgl1-mesa-glx and libglib2.0-0 are required for easyocr/opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Make the start script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# The command used depends on the service type in Render
# For Web Service: ./start.sh web
# For Celery Worker: ./start.sh worker
# For Celery Beat: ./start.sh beat
CMD ["/app/start.sh", "web"]
