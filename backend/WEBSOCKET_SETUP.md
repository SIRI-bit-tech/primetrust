# WebSocket Real-Time Updates Setup

This document explains how to set up and run the Socket.IO server for real-time updates.

## Installation

1. Install Python dependencies:
```bash
cd backend
pip install python-socketio==5.10.0 aiohttp==3.9.1 python-engineio==4.8.0 aioredis==2.0.1
```

2. Install frontend dependencies:
```bash
cd frontend
npm install socket.io-client sonner
```

## Running the Servers

You need to run **THREE** servers simultaneously:

### 1. Django Backend (Port 8000)
```bash
cd backend
python manage.py runserver
```

### 2. Socket.IO Server (Port 8001)
```bash
cd backend
python manage.py run_socketio --host 0.0.0.0 --port 8001
```

### 3. Next.js Frontend (Port 3000)
```bash
cd frontend
npm run dev
```

## Environment Variables

### Backend (.env)
No additional environment variables needed for basic setup.

### Frontend (.env.local)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:8001
```

## How It Works

### Real-Time Events

The system emits the following events:

1. **balance_updated** - When user balance changes
   - Admin updates balance
   - Transfer approved/rejected
   
2. **transfer_updated** - When transfer status changes
   - Admin approves transfer
   - Admin rejects transfer
   - Transfer completes

3. **card_updated** - When card application status changes
   - Application approved
   - Application rejected
   - Card created

4. **loan_updated** - When loan status changes
   - Loan approved
   - Loan rejected

5. **bitcoin_transaction_updated** - When Bitcoin transaction status changes
   - Transaction completed
   - Transaction failed

6. **notification** - General notifications
   - Success messages
   - Error messages
   - Info messages

### Frontend Integration

The frontend automatically:
- Connects to Socket.IO server on login
- Listens for real-time events
- Updates UI without page refresh
- Shows toast notifications
- Refreshes data when needed

### Testing Real-Time Updates

1. Open the user dashboard in one browser
2. Open the admin panel in another browser
3. As admin, approve a transfer or update balance
4. Watch the user dashboard update instantly without refresh!

## Troubleshooting

### Socket.IO server won't start
- Make sure port 8001 is not in use
- Check that all dependencies are installed
- Verify Django settings include 'socketio_app' in INSTALLED_APPS

### Frontend not connecting
- Check NEXT_PUBLIC_SOCKET_URL in .env.local
- Verify Socket.IO server is running on port 8001
- Check browser console for connection errors

### Events not received
- Check that user is authenticated
- Verify JWT token is valid
- Check Socket.IO server logs for errors

## Production Deployment

For production:

1. Use a process manager (PM2, systemd) to run Socket.IO server
2. Set up proper CORS origins in socket server
3. Use Redis for scaling across multiple servers
4. Enable SSL/TLS for secure WebSocket connections
5. Set NEXT_PUBLIC_SOCKET_URL to production Socket.IO URL

## Architecture

```
Frontend (Next.js)
    ↓ WebSocket
Socket.IO Server (Port 8001)
    ↑ Events
Django Backend (Port 8000)
    ↓ Database Updates
PostgreSQL/SQLite
```

When admin performs an action:
1. Admin makes API call to Django
2. Django updates database
3. Django emits Socket.IO event
4. Socket.IO server broadcasts to user
5. User's browser receives event
6. UI updates instantly
