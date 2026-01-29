'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Send,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  Calendar,
  Clock,
  Copy,
  Check,
  Bitcoin,
  ArrowUpDown,
  ArrowDownUp,
  XCircle,
  LineChart,
  FileCheck
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import ReceiveBitcoinModal from '@/components/ReceiveBitcoinModal'
import SwapBitcoinModal from '@/components/SwapBitcoinModal'
import { ToastContainer } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { bankingAPI, transactionsAPI, bitcoinAPI, virtualCardAPI } from '@/lib/api'
import { Account, Transaction, VirtualCard } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TransferReceipt from '@/components/receipt/TransferReceipt'
import { ReceiptData } from '@/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedRouting, setCopiedRouting] = useState(false)
  const [isReceiveBitcoinModalOpen, setIsReceiveBitcoinModalOpen] = useState(false)
  const [isSwapBitcoinModalOpen, setIsSwapBitcoinModalOpen] = useState(false)
  const [bitcoinBalance, setBitcoinBalance] = useState<number>(0)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [toasts, setToasts] = useState<{ id: number; title: string; description: string; variant?: 'default' | 'destructive' }[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  // Check if account is locked
  const isAccountLocked = user?.is_account_locked || false

  const copyToClipboard = async (text: string, type: 'account' | 'routing') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'account') {
        setCopiedAccount(true)
        setTimeout(() => setCopiedAccount(false), 2000)
      } else {
        setCopiedRouting(true)
        setTimeout(() => setCopiedRouting(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch current user ID if not already loaded
      if (!currentUserId && user?.id) {
        setCurrentUserId(user.id)
      }

      // Fetch account information
      const accountData = await bankingAPI.getAccountInfo()
      setAccount(accountData)

      // Fetch recent transactions and transfers
      const [transactionsData, transfersData] = await Promise.all([
        transactionsAPI.getTransactions().catch(() => []),
        transactionsAPI.getTransfers().catch(() => [])
      ])

      const transactionsArray = Array.isArray(transactionsData) ? transactionsData : (transactionsData as any)?.results || []
      const transfersArray = Array.isArray(transfersData) ? transfersData : (transfersData as any)?.results || []

      // Combine and sort by date, then take the 5 most recent
      const combined = [...transactionsArray, ...transfersArray]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setTransactions(combined.slice(0, 5))

      // Fetch virtual cards
      const cardsData = await virtualCardAPI.getCards()
      setCards(cardsData)

      // Fetch Bitcoin balance and exchange rate
      try {
        const [bitcoinBalanceData, exchangeRateData] = await Promise.all([
          bankingAPI.getBitcoinBalance(),
          bitcoinAPI.getExchangeRate()
        ])

        // Safely parse Bitcoin balance with fallback to 0
        const balance = parseFloat(bitcoinBalanceData.bitcoin_balance || '0')
        setBitcoinBalance(isNaN(balance) ? 0 : balance)
        setExchangeRate(exchangeRateData.exchange_rate)
      } catch (error) {
        console.error('Error fetching Bitcoin data:', error)
        // Set default values on error
        setBitcoinBalance(0)
        setExchangeRate(null)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const updateBalances = useCallback(async () => {
    try {
      // Fetch Bitcoin balance and exchange rate
      const [bitcoinBalanceData, exchangeRateData] = await Promise.all([
        bankingAPI.getBitcoinBalance(),
        bitcoinAPI.getExchangeRate()
      ])

      // Safely parse Bitcoin balance with fallback to 0
      const balance = parseFloat(bitcoinBalanceData.bitcoin_balance || '0')
      setBitcoinBalance(isNaN(balance) ? 0 : balance)
      setExchangeRate(exchangeRateData.exchange_rate)

      // Also update account info to get latest USD balance
      const accountData = await bankingAPI.getAccountInfo()
      setAccount(accountData)
    } catch (error) {
      console.error('Error updating balances:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for real-time balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event: CustomEvent) => {
      const { balance } = event.detail
      if (account) {
        setAccount({ ...account, balance: balance.toString() })
      }
    }

    const handleTransferUpdate = () => {
      // Refresh transactions when transfer status changes
      fetchData()
    }

    const handleCardUpdate = () => {
      // Refresh cards when card status changes
      fetchData()
    }

    const handleLoanUpdate = () => {
      // Refresh data when loan status changes
      fetchData()
    }

    const handleBitcoinTransactionUpdate = () => {
      // Refresh Bitcoin balance when transaction completes
      fetchData()
    }

    const handleCheckDepositUpdate = () => {
      // Refresh data when check deposit status changes
      fetchData()
    }

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener)
    window.addEventListener('transfer-updated', handleTransferUpdate as EventListener)
    window.addEventListener('card-updated', handleCardUpdate as EventListener)
    window.addEventListener('loan-updated', handleLoanUpdate as EventListener)
    window.addEventListener('bitcoin-transaction-updated', handleBitcoinTransactionUpdate as EventListener)
    window.addEventListener('check-deposit-updated', handleCheckDepositUpdate as EventListener)

    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener)
      window.removeEventListener('transfer-updated', handleTransferUpdate as EventListener)
      window.removeEventListener('card-updated', handleCardUpdate as EventListener)
      window.removeEventListener('loan-updated', handleLoanUpdate as EventListener)
      window.removeEventListener('bitcoin-transaction-updated', handleBitcoinTransactionUpdate as EventListener)
      window.removeEventListener('check-deposit-updated', handleCheckDepositUpdate as EventListener)
    }
  }, [account, fetchData])

  const getTransactionIcon = (transaction: any) => {
    const type = transaction.transaction_type || transaction.transfer_type
    const status = transaction.status
    const isSender = currentUserId && (transaction as any).sender === currentUserId
    const isReceiver = currentUserId && (transaction as any).recipient === currentUserId
    const description = transaction.description || ''

    // Status-based icons (override type-based icons)
    if (status === 'failed' || status === 'cancelled' || status === 'declined') {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    if (status === 'pending' || status === 'processing') {
      return <Clock className="w-5 h-5 text-yellow-500" />
    }
    if (status === 'completed' || status === 'approved') {
      // Type-based icons for completed transactions
      if (type === 'investment') {
        // Check description to determine if purchase or sale
        const isSale = description.toLowerCase().includes('sale')
        return <LineChart className={`w-5 h-5 ${isSale ? 'text-green-600' : 'text-purple-600'}`} />
      }
      if (type === 'deposit') {
        // Check if it's a check deposit
        if (description.toLowerCase().includes('check deposit')) {
          return <FileCheck className="w-5 h-5 text-green-500" />
        }
        return <TrendingUp className="w-5 h-5 text-green-500" />
      }
      if (type === 'loan') {
        if (description.toLowerCase().includes('repayment')) {
          return <TrendingDown className="w-5 h-5 text-red-500" />
        }
        return <TrendingUp className="w-5 h-5 text-green-500" />
      }
      if (type === 'withdrawal' || type === 'payment' || type === 'fee') {
        return <TrendingDown className="w-5 h-5 text-red-500" />
      }
      // For transfers, use TrendingUp/TrendingDown based on direction
      if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
        if (isReceiver && !isSender) {
          return <TrendingDown className="w-5 h-5 text-green-500" />
        }
        return <TrendingUp className="w-5 h-5 text-red-500" />
      }
    }

    // Default
    return <DollarSign className="w-5 h-5 text-gray-500" />
  }

  const getTransactionIconBgColor = (transaction: any) => {
    const status = transaction.status

    if (status === 'failed' || status === 'cancelled' || status === 'declined') {
      return 'bg-red-100 dark:bg-red-900/20'
    }
    if (status === 'pending' || status === 'processing') {
      return 'bg-yellow-100 dark:bg-yellow-900/20'
    }
    if (status === 'completed' || status === 'approved') {
      const type = transaction.transaction_type || transaction.transfer_type
      const recipientId = (transaction as any).recipient?.id || (transaction as any).recipient
      const isReceiver = currentUserId && recipientId === currentUserId
      const description = transaction.description || ''

      if (type === 'investment') {
        // Check description to determine if purchase or sale
        const isSale = description.toLowerCase().includes('sale')
        return isSale ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20' // Purchase is red (money out)
      }
      if (type === 'deposit' || type === 'loan' || (isReceiver && !(transaction as any).sender)) {
        if (type === 'loan' && description.toLowerCase().includes('repayment')) {
          return 'bg-red-100 dark:bg-red-900/20'
        }
        return 'bg-green-100 dark:bg-green-900/20'
      }
      if (type === 'withdrawal' || type === 'payment' || type === 'fee') {
        return 'bg-red-100 dark:bg-red-900/20'
      }
      return 'bg-blue-100 dark:bg-blue-900/20'
    }

    return 'bg-gray-100 dark:bg-gray-700'
  }

  const getTransactionColor = (transaction: any) => {
    const type = transaction.transaction_type || transaction.transfer_type
    const senderId = (transaction as any).sender?.id || (transaction as any).sender
    const recipientId = (transaction as any).recipient?.id || (transaction as any).recipient

    const isSender = currentUserId && senderId === currentUserId
    const isReceiver = currentUserId && recipientId === currentUserId
    const description = transaction.description || ''

    // For transfers, color based on direction
    if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
      if (isReceiver && !isSender) {
        return 'text-green-600 dark:text-green-400'
      }
      return 'text-red-600 dark:text-red-400'
    }

    // For investments, check description
    if (type === 'investment') {
      const isSale = description.toLowerCase().includes('sale')
      return isSale ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }

    switch (type) {
      case 'deposit':
      case 'loan': // Disbursement (Green)
        if (description.toLowerCase().includes('repayment')) return 'text-red-600 dark:text-red-400'
        return 'text-green-600 dark:text-green-400'
      case 'withdrawal':
      case 'payment':
      case 'fee':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTransactionDescription = (transaction: any) => {
    const type = transaction.transaction_type || transaction.transfer_type
    const recipientName = transaction.recipient_name || transaction.recipient?.full_name || ''
    const description = transaction.description || ''

    // If we have a recipient name, use it
    if (recipientName) {
      if (type === 'internal') return `Internal Transfer to ${recipientName}`
      if (type === 'ach') return `ACH Transfer to ${recipientName}`
      if (type === 'wire_domestic') return `Wire Transfer to ${recipientName}`
      if (type === 'wire_international') return `International Wire to ${recipientName}`
    }

    // Fallback to description or type
    if (description) return description

    // Last resort - just show the type
    if (type === 'internal') return 'Internal Transfer'
    if (type === 'ach') return 'ACH Transfer'
    if (type === 'wire_domestic') return 'Wire Transfer'
    if (type === 'wire_international') return 'International Wire Transfer'

    return type || 'Transaction'
  }

  const getTransactionType = (transaction: any) => {
    return transaction.transaction_type || transaction.transfer_type || 'transfer'
  }

  const handleTransactionClick = (transaction: any) => {
    const type = getTransactionType(transaction)
    const isBitcoin = type === 'bitcoin' || (transaction as any).currency_from === 'BTC' || (transaction as any).currency_to === 'BTC'
    const status = transaction.status === 'completed' || transaction.status === 'approved' ? 'completed' :
      (transaction.status === 'failed' || transaction.status === 'cancelled' || transaction.status === 'declined') ? 'failed' : 'pending'

    const senderName = (transaction as any).sender_name || (transaction as any).sender?.full_name || (type === 'deposit' ? (transaction.description || 'External') : 'You')
    const recipientName = (transaction as any).recipient_name || (transaction as any).recipient?.full_name || (type === 'deposit' ? 'You' : 'External')

    const receipt: ReceiptData = {
      id: transaction.id,
      type: isBitcoin ? 'bitcoin' : 'transfer',
      status: status,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      btcAmount: (transaction as any).btc_amount || (transaction as any).amount_from_btc || (transaction as any).amount_to_btc,
      usdAmount: (transaction as any).usd_amount || (transaction as any).amount_from_usd || (transaction as any).amount_to_usd,
      sender: senderName,
      recipient: recipientName,
      transferType: getTransactionDescription(transaction),
      date: new Date(transaction.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }),
      referenceId: transaction.reference_number || transaction.transaction_id || `#${transaction.id}`,
      transactionHash: (transaction as any).transaction_hash,
      networkFee: (transaction as any).fee
    }

    setSelectedReceipt(receipt)
    setShowReceipt(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'failed':
      case 'declined':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {getGreeting()}, {user?.first_name || 'User'}!
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Badge>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                  <div className="flex items-center mt-1">
                    {isAccountLocked ? (
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-red-200">🔒 Account Locked</p>
                      </div>
                    ) : showBalance ? (
                      <p className="text-3xl font-bold">
                        {formatCurrency(parseFloat(account?.balance || '0'))}
                      </p>
                    ) : (
                      <p className="text-3xl font-bold">••••••</p>
                    )}
                    {!isAccountLocked && (
                      <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="ml-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Bitcoin Balance Section */}
              <div className="border-t border-white/20 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-blue-100 text-sm font-medium">Bitcoin Balance</p>
                    <div className="flex items-center mt-1">
                      {isAccountLocked ? (
                        <p className="text-lg font-bold text-red-200">🔒 Hidden</p>
                      ) : showBalance ? (
                        <div>
                          <p className="text-xl font-bold">
                            {bitcoinBalance.toFixed(8)} BTC
                          </p>
                          {exchangeRate && (
                            <p className="text-sm text-blue-200">
                              ≈ {formatCurrency(bitcoinBalance * exchangeRate)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xl font-bold">••••••</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Bitcoin className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Real-time Exchange Rate */}
                {exchangeRate && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Bitcoin className="w-3 h-3 text-yellow-300" />
                      <span className="text-xs text-blue-200">
                        1 BTC = ${exchangeRate.toLocaleString()} USD
                      </span>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium">
                      {account?.account_number || 'Not available'}
                    </p>
                    {account?.account_number && (
                      <button
                        onClick={() => copyToClipboard(account.account_number, 'account')}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedAccount ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Routing Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium">
                      {account?.routing_number || 'Not available'}
                    </p>
                    {account?.routing_number && (
                      <button
                        onClick={() => copyToClipboard(account.routing_number, 'routing')}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Copy Routing Number"
                      >
                        {copiedRouting ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="text-sm font-medium">
                    Savings
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quick Actions</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/cards">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Card
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAccountLocked ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-semibold">Transactions Disabled</p>
                  <p className="text-sm text-gray-500 mt-1">Account is locked</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    className="h-20 flex-col gap-2 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                    asChild
                  >
                    <Link href="/dashboard/transfer">
                      <Send className="w-6 h-6" />
                      <span className="text-sm">Send Money</span>
                    </Link>
                  </Button>

                  <Button
                    className="h-20 flex-col gap-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                    asChild
                  >
                    <Link href="/dashboard/send-bitcoin">
                      <Bitcoin className="w-6 h-6" />
                      <span className="text-sm">Send Bitcoin</span>
                    </Link>
                  </Button>

                  <Button
                    className="h-20 flex-col gap-2 bg-green-500 hover:bg-green-600 text-white border-green-500"
                    onClick={() => setIsReceiveBitcoinModalOpen(true)}
                  >
                    <ArrowDownUp className="w-6 h-6" />
                    <span className="text-sm">Receive Bitcoin</span>
                  </Button>

                  <Button
                    className="h-20 flex-col gap-2 bg-purple-500 hover:bg-purple-600 text-white border-purple-500"
                    onClick={() => setIsSwapBitcoinModalOpen(true)}
                  >
                    <ArrowUpDown className="w-6 h-6" />
                    <span className="text-sm">Swap Bitcoin</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{cards.length}</p>
                <p className="text-sm text-muted-foreground">
                  {cards.length > 0 ? 'Active cards' : 'No cards yet'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Transactions</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/transactions">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => {
                  const type = getTransactionType(transaction)
                  const isSender = currentUserId && (transaction as any).sender === currentUserId
                  const isReceiver = currentUserId && (transaction as any).recipient === currentUserId

                  // Determine if this is a debit (money out) or credit (money in)
                  let isDebit = false
                  const description = transaction.description || ''

                  if (type === 'withdrawal' || type === 'payment' || type === 'fee') {
                    isDebit = true
                  } else if (type === 'investment') {
                    // Check description to determine if purchase (debit) or sale (credit)
                    isDebit = !description.toLowerCase().includes('sale')
                  } else if (type === 'deposit') {
                    isDebit = false
                  } else if (type === 'loan') {
                    // Loan disbursement is credit, repayment is debit
                    isDebit = description.toLowerCase().includes('repayment')
                  } else if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
                    // For transfers, it's a debit if user is the sender
                    // Handle case where sender is an object or ID
                    const senderId = (transaction as any).sender?.id || (transaction as any).sender
                    if (senderId && currentUserId) {
                      isDebit = senderId === currentUserId
                    } else {
                      // Fallback for Transaction objects which are usually debits if logged as 'transfer'
                      isDebit = true
                    }

                    // If we are the receiver (and explicitly not sender), it's a credit
                    const recipientId = (transaction as any).recipient?.id || (transaction as any).recipient
                    if (recipientId && currentUserId && recipientId === currentUserId && senderId !== currentUserId) {
                      isDebit = false
                    }
                  }

                  return (
                    <div
                      key={`${type}-${transaction.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${getTransactionIconBgColor(transaction)} rounded-full flex items-center justify-center`}>
                          {getTransactionIcon(transaction)}
                        </div>
                        <div>
                          <p className="font-medium">{getTransactionDescription(transaction)}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(transaction.created_at).toLocaleDateString()}
                            <span className="text-xs">•</span>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction)}`}>
                          {isDebit ? '-' : (type === 'deposit' || type === 'loan' || (!isDebit && type !== 'transfer') ? '+' : '')}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant="secondary" className="text-xs capitalize mt-1">
                          {type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">Your recent transactions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receive Bitcoin Modal */}
      <ReceiveBitcoinModal
        isOpen={isReceiveBitcoinModalOpen}
        onClose={() => setIsReceiveBitcoinModalOpen(false)}
      />

      <SwapBitcoinModal
        isOpen={isSwapBitcoinModalOpen}
        onClose={() => setIsSwapBitcoinModalOpen(false)}
        userBalance={{
          usd: parseFloat(account?.balance || '0'),
          bitcoin: bitcoinBalance
        }}
        onSwapComplete={() => {
          // Wait for swap to complete (30 seconds) plus buffer time
          setTimeout(() => {
            updateBalances()
          }, 35000)
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {showReceipt && selectedReceipt && (
        <TransferReceipt
          {...selectedReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </DashboardLayout>
  )
}