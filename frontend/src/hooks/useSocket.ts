/**
 * React hook for Socket.IO real-time updates
 */
import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import { initializeSocket, getSocket, disconnectSocket } from '@/lib/socket'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
}

export const useSocket = (token: string | null): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      disconnectSocket()
      setSocket(null)
      setIsConnected(false)
      return
    }

    // Initialize socket connection
    const socketInstance = initializeSocket(token)
    setSocket(socketInstance)

    // Listen for connection events
    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)

    // Set initial connection state
    setIsConnected(socketInstance.connected)

    // Cleanup on unmount
    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
    }
  }, [token])

  return { socket, isConnected }
}

// Hook for listening to specific events
export const useSocketEvent = <T = any>(
  eventName: string,
  callback: (data: T) => void,
  dependencies: any[] = []
) => {
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on(eventName, callback)

    return () => {
      socket.off(eventName, callback)
    }
  }, [eventName, ...dependencies])
}

export default useSocket
