"""
Socket.IO server setup
"""
import socketio
import logging
import asyncio
import json
import redis.asyncio as aioredis
from .events import register_events
from .middleware import get_user_room

logger = logging.getLogger(__name__)

# Create Socket.IO server with async mode
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',  # Configure this properly in production
    logger=True,
    engineio_logger=True
)

# Register event handlers
register_events(sio)

# Redis subscriber for pub/sub
redis_subscriber = None


async def redis_listener():
    """
    Listen to Redis pub/sub and emit Socket.IO events
    """
    global redis_subscriber
    
    try:
        redis_subscriber = await aioredis.from_url('redis://localhost:6379', decode_responses=True)
        pubsub = redis_subscriber.pubsub()
        await pubsub.subscribe('socketio_events')
        
        logger.info("Redis listener started, subscribed to socketio_events")
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    event_name = data.get('event')
                    event_data = data.get('data')
                    user_id = data.get('user_id')
                    room = data.get('room')
                    
                    # Determine target room
                    if user_id:
                        target_room = get_user_room(user_id)
                    elif room:
                        target_room = room
                    else:
                        target_room = None
                    
                    # Emit the event
                    if target_room:
                        await sio.emit(event_name, event_data, room=target_room)
                        logger.info(f"Emitted {event_name} to room {target_room}")
                    else:
                        await sio.emit(event_name, event_data)
                        logger.info(f"Emitted {event_name} to all clients")
                        
                except Exception as e:
                    logger.error(f"Error processing Redis message: {str(e)}")
                    
    except Exception as e:
        logger.error(f"Redis listener error: {str(e)}")
    finally:
        if redis_subscriber:
            await redis_subscriber.close()


def get_socketio_app():
    """
    Get the Socket.IO ASGI application
    This will be run as a separate process
    """
    from aiohttp import web
    
    app = web.Application()
    sio.attach(app)
    
    # Health check endpoint
    async def health_check(request):
        return web.Response(text='Socket.IO server is running')
    
    app.router.add_get('/health', health_check)
    
    # Start Redis listener on app startup
    async def start_background_tasks(app):
        app['redis_listener'] = asyncio.create_task(redis_listener())
    
    async def cleanup_background_tasks(app):
        app['redis_listener'].cancel()
        await app['redis_listener']
    
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    return app

