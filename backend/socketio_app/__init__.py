"""
Socket.IO application for real-time updates
"""
from .server import sio, get_socketio_app

__all__ = ['sio', 'get_socketio_app']
