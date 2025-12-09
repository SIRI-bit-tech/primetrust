'use client'

/**
 * Socket.IO Context Provider for real-time updates
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Socket } from 'socket.io-client'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
})

export const useSocketContext = () => useContext(SocketContext)

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket(!!user) // Pass boolean instead of token

  useEffect(() => {
    if (!socket) return

    // Connection handler (no toast notification)
    const handleConnected = () => {
      // Silent connection
    }

    // Listen for balance updates
    const handleBalanceUpdate = (data: { balance: number }) => {
      // Trigger a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('balance-updated', { detail: data }))
    }

    // Listen for transfer updates
    const handleTransferUpdate = (data: { transfer_id: number; status: string; transfer_type: string }) => {
      window.dispatchEvent(new CustomEvent('transfer-updated', { detail: data }))
      
      // Show toast notification
      const statusMessages: Record<string, string> = {
        completed: 'Transfer completed successfully',
        failed: 'Transfer failed',
        pending: 'Transfer is pending',
        processing: 'Transfer is being processed'
      }
      
      const message = statusMessages[data.status] || 'Transfer status updated'
      if (data.status === 'completed') {
        toast.success(message)
      } else if (data.status === 'failed') {
        toast.error(message)
      } else {
        toast.info(message)
      }
    }

    // Listen for card updates
    const handleCardUpdate = (data: { card_id: number; status: string; action: string }) => {
      window.dispatchEvent(new CustomEvent('card-updated', { detail: data }))
    }

    // Listen for loan updates
    const handleLoanUpdate = (data: { loan_id: number; status: string }) => {
      window.dispatchEvent(new CustomEvent('loan-updated', { detail: data }))
      
      // Show toast notification
      const statusMessages: Record<string, string> = {
        approved: 'Loan application approved!',
        rejected: 'Loan application rejected',
        active: 'Loan is now active',
        completed: 'Loan completed'
      }
      
      const message = statusMessages[data.status] || 'Loan status updated'
      if (data.status === 'approved' || data.status === 'completed') {
        toast.success(message)
      } else if (data.status === 'rejected') {
        toast.error(message)
      } else {
        toast.info(message)
      }
    }

    // Listen for Bitcoin transaction updates
    const handleBitcoinTransactionUpdate = (data: { transaction_id: number; status: string; type: string }) => {
      window.dispatchEvent(new CustomEvent('bitcoin-transaction-updated', { detail: data }))
    }

    // Listen for general notifications
    const handleNotification = (data: { title: string; message: string; type: string }) => {
      // Check if this is an account lock/unlock notification
      if (data.title === 'Account Locked' || data.title === 'Account Unlocked') {
        // Trigger a user data refresh to update lock status
        // This will cause the GlobalAccountLockModal to show/hide
        window.dispatchEvent(new CustomEvent('refresh-user-data'))
      }
      
      switch (data.type) {
        case 'success':
          toast.success(data.title, { description: data.message })
          break
        case 'error':
          toast.error(data.title, { description: data.message })
          break
        case 'warning':
          toast.warning(data.title, { description: data.message })
          break
        default:
          toast.info(data.title, { description: data.message })
      }
    }

    // Register event listeners
    socket.on('connected', handleConnected)
    socket.on('balance_updated', handleBalanceUpdate)
    socket.on('transfer_updated', handleTransferUpdate)
    socket.on('card_updated', handleCardUpdate)
    socket.on('loan_updated', handleLoanUpdate)
    socket.on('bitcoin_transaction_updated', handleBitcoinTransactionUpdate)
    socket.on('notification', handleNotification)

    // Cleanup
    return () => {
      socket.off('connected', handleConnected)
      socket.off('balance_updated', handleBalanceUpdate)
      socket.off('transfer_updated', handleTransferUpdate)
      socket.off('card_updated', handleCardUpdate)
      socket.off('loan_updated', handleLoanUpdate)
      socket.off('bitcoin_transaction_updated', handleBitcoinTransactionUpdate)
      socket.off('notification', handleNotification)
    }
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
