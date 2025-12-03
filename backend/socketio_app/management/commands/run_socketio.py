"""
Management command to run Socket.IO server
"""
from django.core.management.base import BaseCommand
from aiohttp import web
from socketio_app.server import get_socketio_app
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run Socket.IO server for real-time updates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--host',
            type=str,
            default='0.0.0.0',
            help='Host to bind the server to'
        )
        parser.add_argument(
            '--port',
            type=int,
            default=8001,
            help='Port to bind the server to'
        )

    def handle(self, *args, **options):
        host = options['host']
        port = options['port']
        
        self.stdout.write(self.style.SUCCESS(
            f'Starting Socket.IO server on {host}:{port}'
        ))
        
        app = get_socketio_app()
        web.run_app(app, host=host, port=port)
