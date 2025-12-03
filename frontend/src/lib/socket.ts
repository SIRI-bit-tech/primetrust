/**
 * Socket.IO client configuration
 */
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8001'

let socket: Socket | null = null

export const initializeSocket = (token: string): Socket => {
  if (socket && socket.connected) {
    return socket
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  })

  socket.on('connect', () => {
    // Connected
  })

  socket.on('disconnect', () => {
    // Disconnected
  })

  socket.on('connect_error', (error) => {
    // Connection error
  })

  return socket
}

export const getSocket = (): Socket | null => {
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default {
  initializeSocket,
  getSocket,
  disconnectSocket
}
