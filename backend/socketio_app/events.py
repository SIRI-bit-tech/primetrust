"""
Socket.IO event handlers
"""
import logging
from .middleware import authenticate_socket, get_user_room, get_admin_room

logger = logging.getLogger(__name__)


def register_events(sio):
    """Register all Socket.IO event handlers"""
    
    @sio.event
    async def connect(sid, environ, auth):
        """Handle client connection"""
        try:
            # Get token from auth
            token = auth.get('token') if auth else None
            
            if not token:
                logger.warning(f"Connection rejected for {sid}: No token provided")
                return False
            
            # Authenticate user (returns dict with user info from token)
            user_data = authenticate_socket(token)
            if not user_data:
                logger.warning(f"Connection rejected for {sid}: Invalid token")
                return False
            
            # Store user info in session
            async with sio.session(sid) as session:
                session['user_id'] = user_data['id']
                session['username'] = user_data['username']
                session['is_staff'] = user_data.get('is_staff', False)
            
            # Join user-specific room
            user_room = get_user_room(user_data['id'])
            await sio.enter_room(sid, user_room)
            
            # Join admin room if user is staff
            if user_data.get('is_staff'):
                await sio.enter_room(sid, get_admin_room())
            
            logger.info(f"User {user_data['username']} (ID: {user_data['id']}) connected with sid {sid}")
            
            # Send connection confirmation
            await sio.emit('connected', {
                'message': 'Connected to real-time updates',
                'user_id': user_data['id']
            }, room=sid)
            
            return True
            
        except Exception as e:
            logger.error(f"Error during connection: {str(e)}")
            return False
    
    @sio.event
    async def disconnect(sid):
        """Handle client disconnection"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                username = session.get('username')
            
            if user_id:
                logger.info(f"User {username} (ID: {user_id}) disconnected")
        except Exception as e:
            logger.error(f"Error during disconnection: {str(e)}")
    
    @sio.event
    async def ping(sid):
        """Handle ping from client"""
        await sio.emit('pong', room=sid)


# Event emitters (called from Django views/signals)

async def emit_balance_update(sio, user_id, balance_data):
    """Emit balance update to specific user"""
    room = get_user_room(user_id)
    await sio.emit('balance_updated', balance_data, room=room)
    logger.info(f"Emitted balance update to user {user_id}")


async def emit_transfer_update(sio, user_id, transfer_data):
    """Emit transfer status update to specific user"""
    room = get_user_room(user_id)
    await sio.emit('transfer_updated', transfer_data, room=room)
    logger.info(f"Emitted transfer update to user {user_id}: {transfer_data.get('status')}")


async def emit_card_update(sio, user_id, card_data):
    """Emit virtual card update to specific user"""
    room = get_user_room(user_id)
    await sio.emit('card_updated', card_data, room=room)
    logger.info(f"Emitted card update to user {user_id}")


async def emit_loan_update(sio, user_id, loan_data):
    """Emit loan status update to specific user"""
    room = get_user_room(user_id)
    await sio.emit('loan_updated', loan_data, room=room)
    logger.info(f"Emitted loan update to user {user_id}")


async def emit_bitcoin_transaction_update(sio, user_id, transaction_data):
    """Emit Bitcoin transaction update to specific user"""
    room = get_user_room(user_id)
    await sio.emit('bitcoin_transaction_updated', transaction_data, room=room)
    logger.info(f"Emitted Bitcoin transaction update to user {user_id}")


async def emit_notification(sio, user_id, notification_data):
    """Emit notification to specific user"""
    room = get_user_room(user_id)
    await sio.emit('notification', notification_data, room=room)
    logger.info(f"Emitted notification to user {user_id}")


async def emit_admin_notification(sio, notification_data):
    """Emit notification to all admin users"""
    room = get_admin_room()
    await sio.emit('admin_notification', notification_data, room=room)
    logger.info(f"Emitted admin notification")
