'use client'

/**
 * Ably Realtime Context Provider
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import Ably from 'ably'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface SocketContextType {
  isConnected: boolean
  ablyClient: Ably.Realtime | null
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  ablyClient: null
})

export const useSocketContext = () => useContext(SocketContext)

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user) {
      if (ablyClient) {
        ablyClient.close()
        setAblyClient(null)
        setIsConnected(false)
      }
      return
    }

    // Initialize Ably connection
    const client = new Ably.Realtime({
      authUrl: `/api/ably/auth?clientId=${user.id}`,
      autoConnect: true
    })

    setAblyClient(client)

    client.connection.on('connected', () => {
      setIsConnected(true)
      console.log('Connected to Ably')
    })

    client.connection.on('disconnected', () => {
      setIsConnected(false)
      console.log('Disconnected from Ably')
    })

    // Subscribe to user channel
    const channelName = `user:${user.id}`
    const channel = client.channels.get(channelName)

    // Handler helpers
    const handleBalanceUpdate = (message: Ably.InboundMessage) => {
      const data = message.data
      window.dispatchEvent(new CustomEvent('balance-updated', { detail: data }))
    }

    const handleTransferUpdate = (message: Ably.InboundMessage) => {
      const data = message.data
      window.dispatchEvent(new CustomEvent('transfer-updated', { detail: data }))

      const statusMessages: Record<string, string> = {
        completed: 'Transfer completed successfully',
        failed: 'Transfer failed',
        pending: 'Transfer is pending',
        processing: 'Transfer is being processed'
      }

      const msg = statusMessages[data.status] || 'Transfer status updated'
      if (data.status === 'completed') toast.success(msg)
      else if (data.status === 'failed') toast.error(msg)
      else toast.info(msg)
    }

    const handleCardUpdate = (message: Ably.InboundMessage) => {
      const data = message.data
      window.dispatchEvent(new CustomEvent('card-updated', { detail: data }))
    }

    const handleLoanUpdate = (message: Ably.InboundMessage) => {
      const data = message.data
      window.dispatchEvent(new CustomEvent('loan-updated', { detail: data }))

      const statusMessages: Record<string, string> = {
        approved: 'Loan application approved!',
        rejected: 'Loan application rejected',
        active: 'Loan is now active',
        completed: 'Loan completed'
      }

      const msg = statusMessages[data.status] || 'Loan status updated'
      if (data.status === 'approved' || data.status === 'completed') toast.success(msg)
      else if (data.status === 'rejected') toast.error(msg)
      else toast.info(msg)
    }

    const handleBitcoinTransactionUpdate = (message: Ably.InboundMessage) => {
      const data = message.data
      window.dispatchEvent(new CustomEvent('bitcoin-transaction-updated', { detail: data }))
    }

    const handleNotification = (message: Ably.InboundMessage) => {
      const data = message.data

      if (data.title === 'Account Locked' || data.title === 'Account Unlocked') {
        window.dispatchEvent(new CustomEvent('refresh-user-data'))
      }

      switch (data.type) {
        case 'success': toast.success(data.title, { description: data.message }); break;
        case 'error': toast.error(data.title, { description: data.message }); break;
        case 'warning': toast.warning(data.title, { description: data.message }); break;
        default: toast.info(data.title, { description: data.message });
      }
    }

    // Subscribe to events
    channel.subscribe('balance_updated', handleBalanceUpdate)
    channel.subscribe('transfer_updated', handleTransferUpdate)
    channel.subscribe('card_updated', handleCardUpdate)
    channel.subscribe('loan_updated', handleLoanUpdate)
    channel.subscribe('bitcoin_transaction_updated', handleBitcoinTransactionUpdate)
    channel.subscribe('notification', handleNotification)

    return () => {
      channel.unsubscribe()
      client.close()
    }
  }, [user]) // Re-connect when user changes

  return (
    <SocketContext.Provider value={{ ablyClient, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
