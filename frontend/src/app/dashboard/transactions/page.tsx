'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Send, 
  Download, 
  Search,
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  XCircle,
  LineChart
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { transactionsAPI } from '@/lib/api'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    loadTransactions()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setCurrentUserId(userData.id)
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, statusFilter, typeFilter])

  // Listen for real-time transaction updates
  useEffect(() => {
    const handleTransferUpdate = () => {
      loadTransactions()
    }

    const handleBitcoinTransactionUpdate = () => {
      loadTransactions()
    }

    window.addEventListener('transfer-updated', handleTransferUpdate as EventListener)
    window.addEventListener('bitcoin-transaction-updated', handleBitcoinTransactionUpdate as EventListener)

    return () => {
      window.removeEventListener('transfer-updated', handleTransferUpdate as EventListener)
      window.removeEventListener('bitcoin-transaction-updated', handleBitcoinTransactionUpdate as EventListener)
    }
  }, [])

  const loadTransactions = async () => {
    try {
      // Fetch both transactions and transfers
      const [transactionsData, transfersData] = await Promise.all([
        transactionsAPI.getTransactions().catch((err) => {
          console.error('Error fetching transactions:', err)
          return []
        }),
        transactionsAPI.getTransfers().catch((err) => {
          console.error('Error fetching transfers:', err)
          return []
        })
      ])
      
      // Extract arrays from responses
      const transactionsArray = Array.isArray(transactionsData) 
        ? transactionsData 
        : ((transactionsData as any)?.results || [])
      
      const transfersArray = Array.isArray(transfersData) 
        ? transfersData 
        : ((transfersData as any)?.results || [])
      
      // Combine and sort by date
      const combined = [...transactionsArray, ...transfersArray]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setTransactions(combined)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        const desc = transaction.description?.toLowerCase() || ''
        const senderName = (transaction as any).sender_name?.toLowerCase() || (transaction as any).sender?.full_name?.toLowerCase() || ''
        const recipientName = (transaction as any).recipient_name?.toLowerCase() || (transaction as any).recipient?.full_name?.toLowerCase() || ''
        return desc.includes(searchTerm.toLowerCase()) || 
               senderName.includes(searchTerm.toLowerCase()) || 
               recipientName.includes(searchTerm.toLowerCase())
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      // Map transfer_type to transaction_type for transfers
      filtered = filtered.filter(transaction => {
        const type = transaction.transaction_type || (transaction as any).transfer_type
        return type === typeFilter
      })
    }

    setFilteredTransactions(filtered)
  }

  const getTransactionIcon = (transaction: Transaction | any) => {
    const type = transaction.transaction_type || transaction.transfer_type
    const status = transaction.status
    const isSender = currentUserId && transaction.sender === currentUserId
    const isReceiver = currentUserId && transaction.recipient === currentUserId
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
        return <TrendingUp className="w-5 h-5 text-green-500" />
      }
      if (type === 'withdrawal') {
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

  const getTransactionIconBgColor = (transaction: Transaction | any) => {
    const status = transaction.status
    
    if (status === 'failed' || status === 'cancelled' || status === 'declined') {
      return 'bg-red-100 dark:bg-red-900/20'
    }
    if (status === 'pending' || status === 'processing') {
      return 'bg-yellow-100 dark:bg-yellow-900/20'
    }
    if (status === 'completed' || status === 'approved') {
      const type = transaction.transaction_type || transaction.transfer_type
      const isReceiver = currentUserId && transaction.recipient === currentUserId
      const description = transaction.description || ''
      
      if (type === 'investment') {
        // Check description to determine if purchase or sale
        const isSale = description.toLowerCase().includes('sale')
        return isSale ? 'bg-green-100 dark:bg-green-900/20' : 'bg-purple-100 dark:bg-purple-900/20'
      }
      if (type === 'deposit' || (isReceiver && !transaction.sender)) {
        return 'bg-green-100 dark:bg-green-900/20'
      }
      if (type === 'withdrawal') {
        return 'bg-red-100 dark:bg-red-900/20'
      }
      return 'bg-blue-100 dark:bg-blue-900/20'
    }
    
    return 'bg-gray-100 dark:bg-gray-700'
  }

  const getTransactionColor = (type: string, description: string = '', transaction?: any) => {
    // For investments, check description
    if (type === 'investment') {
      const isSale = description.toLowerCase().includes('sale')
      return isSale ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }
    
    // For transfers, use ID-based logic (same as getTransactionIcon)
    if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
      if (transaction && currentUserId) {
        const isSender = transaction.sender === currentUserId
        const isReceiver = transaction.recipient === currentUserId
        
        // If receiver only (incoming), show green
        if (isReceiver && !isSender) {
          return 'text-green-600 dark:text-green-400'
        }
        // If sender (outgoing), show red
        if (isSender) {
          return 'text-red-600 dark:text-red-400'
        }
      }
      
      // Fallback: check description for direction indicators
      if (description) {
        const desc = description.toLowerCase()
        if (desc.includes(' to ')) {
          return 'text-red-600 dark:text-red-400' // Outgoing
        }
        if (desc.includes(' from ')) {
          return 'text-green-600 dark:text-green-400' // Incoming
        }
      }
      
      // Default to gray when we can't determine direction
      return 'text-gray-600 dark:text-gray-400'
    }
    
    switch (type) {
      case 'deposit':
        return 'text-green-600 dark:text-green-400'
      case 'withdrawal':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTransactionType = (transaction: Transaction | any) => {
    return transaction.transaction_type || (transaction as any).transfer_type || 'transfer'
  }

  const getTransactionDescription = (transaction: Transaction | any) => {
    const type = getTransactionType(transaction)
    const recipientName = (transaction as any).recipient_name || (transaction as any).recipient?.full_name || ''
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
    
    return type
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'failed':
      case 'declined':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Status', 'Sender', 'Recipient'].join(','),
      ...filteredTransactions.map(transaction => [
        formatDate(transaction.created_at),
        getTransactionType(transaction),
        getTransactionDescription(transaction),
        transaction.amount,
        transaction.status,
        (transaction as any).sender_name || (transaction as any).sender?.full_name || 'You',
        (transaction as any).recipient_name || (transaction as any).recipient?.full_name || 'Unknown'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-dark"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
              View and manage all your banking transactions.
            </p>
          </div>
          <button
            onClick={exportTransactions}
            className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center sm:justify-start whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal Transfer</option>
              <option value="ach">ACH Transfer</option>
              <option value="wire_domestic">Wire Transfer</option>
              <option value="wire_international">International Wire</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="investment">Investment</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {filteredTransactions.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTransactions.map((transaction) => {
                      const type = getTransactionType(transaction)
                      const senderName = (transaction as any).sender_name || (transaction as any).sender?.full_name || 'You'
                      const recipientName = (transaction as any).recipient_name || (transaction as any).recipient?.full_name || 'External Account'
                      const fee = (transaction as any).fee || 0
                      const refNumber = (transaction as any).reference_number
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 ${getTransactionIconBgColor(transaction)} rounded-full flex items-center justify-center mr-3`}>
                                {getTransactionIcon(transaction)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {getTransactionDescription(transaction)}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                  {type.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-semibold ${getTransactionColor(type, transaction.description, transaction)}`}>
                              {(() => {
                                // Show minus sign for withdrawals
                                if (type === 'withdrawal') return '-'
                                
                                // Show minus sign for investment purchases
                                if (type === 'investment' && !transaction.description?.toLowerCase().includes('sale')) return '-'
                                
                                // Show minus sign for outgoing transfers (use ID-based logic)
                                if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
                                  if (currentUserId) {
                                    const isSender = (transaction as any).sender === currentUserId
                                    const isReceiver = (transaction as any).recipient === currentUserId
                                    // If sender (outgoing), show minus sign
                                    if (isSender && !isReceiver) return '-'
                                  }
                                  
                                  // Fallback: check description for direction indicators
                                  const desc = transaction.description?.toLowerCase() || ''
                                  if (desc.includes(' to ')) return '-' // Outgoing
                                }
                                
                                return ''
                              })()}
                              {formatCurrency(transaction.amount)}
                            </div>
                            {fee > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Fee: {formatCurrency(fee)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(transaction.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              {type !== 'investment' && (
                                <>
                                  <div>From: {senderName}</div>
                                  <div>To: {recipientName}</div>
                                </>
                              )}
                              {refNumber && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Ref: {refNumber}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((transaction) => {
                  const type = getTransactionType(transaction)
                  const senderName = (transaction as any).sender_name || (transaction as any).sender?.full_name || 'You'
                  const recipientName = (transaction as any).recipient_name || (transaction as any).recipient?.full_name || 'External Account'
                  const fee = (transaction as any).fee || 0
                  const refNumber = (transaction as any).reference_number
                  
                  return (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className={`w-10 h-10 ${getTransactionIconBgColor(transaction)} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}>
                            {getTransactionIcon(transaction)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {getTransactionDescription(transaction)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {type.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${getTransactionColor(type, transaction.description, transaction)} ml-2 flex-shrink-0`}>
                          {(() => {
                            // Show minus sign for withdrawals
                            if (type === 'withdrawal') return '-'
                            
                            // Show minus sign for investment purchases
                            if (type === 'investment' && !transaction.description?.toLowerCase().includes('sale')) return '-'
                            
                            // Show minus sign for outgoing transfers (use ID-based logic)
                            if (type === 'internal' || type === 'ach' || type === 'wire_domestic' || type === 'wire_international') {
                              if (currentUserId) {
                                const isSender = (transaction as any).sender === currentUserId
                                const isReceiver = (transaction as any).recipient === currentUserId
                                // If sender (outgoing), show minus sign
                                if (isSender && !isReceiver) return '-'
                              }
                              
                              // Fallback: check description for direction indicators
                              const desc = transaction.description?.toLowerCase() || ''
                              if (desc.includes(' to ')) return '-' // Outgoing
                            }
                            
                            return ''
                          })()}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <span className="text-gray-900 dark:text-white flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(transaction.created_at)}
                          </span>
                        </div>
                        
                        {type !== 'investment' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 dark:text-gray-400">From:</span>
                              <span className="text-gray-900 dark:text-white truncate ml-2">{senderName}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 dark:text-gray-400">To:</span>
                              <span className="text-gray-900 dark:text-white truncate ml-2">{recipientName}</span>
                            </div>
                          </>
                        )}
                        
                        {fee > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Fee:</span>
                            <span className="text-gray-900 dark:text-white">{formatCurrency(fee)}</span>
                          </div>
                        )}
                        
                        {refNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Ref:</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{refNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Transactions Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {transactions.length === 0 
                  ? "You haven't made any transactions yet."
                  : "No transactions match your current filters."
                }
              </p>
              {transactions.length === 0 && (
                <Link
                  href="/dashboard/transfer"
                  className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 inline-flex items-center"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Make Your First Transfer
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredTransactions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {filteredTransactions.filter(t => {
                    // Only count completed deposits
                    return t.transaction_type === 'deposit' && t.status === 'completed'
                  }).length}
                </div>
                <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">Deposits</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredTransactions.filter(t => {
                    // Only count completed/approved transactions
                    if (t.status !== 'completed' && t.status !== 'approved') return false
                    
                    // Count withdrawals and outgoing transfers (where current user is sender)
                    if (t.transaction_type === 'withdrawal') return true
                    
                    // For transfers, check if current user is the sender
                    const transfer = t as any
                    if (transfer.transfer_type) {
                      // Check if sender ID matches current user (or if currentUserId not loaded yet, assume all are sent)
                      return !currentUserId || transfer.sender === currentUserId
                    }
                    return false
                  }).length}
                </div>
                <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">Sent</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredTransactions.filter(t => {
                    // Only count completed/approved transactions
                    if (t.status !== 'completed' && t.status !== 'approved') return false
                    
                    // Count incoming transfers (where current user is recipient)
                    const transfer = t as any
                    if (transfer.transfer_type && currentUserId && transfer.recipient) {
                      // Check if recipient ID matches current user
                      return transfer.recipient === currentUserId
                    }
                    return false
                  }).length}
                </div>
                <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Received</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 