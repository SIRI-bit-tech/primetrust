'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Send, 
  Download, 
  Filter, 
  Search,
  ArrowLeft,
  Calendar,
  DollarSign
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

  useEffect(() => {
    loadTransactions()
  }, [])

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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'internal':
      case 'ach':
      case 'wire_domestic':
      case 'wire_international':
        return <Send className="w-5 h-5" />
      case 'deposit':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'withdrawal':
        return <TrendingDown className="w-5 h-5 text-red-500" />
      default:
        return <DollarSign className="w-5 h-5" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600'
      case 'withdrawal':
        return 'text-red-600'
      default:
        return 'text-gray-600'
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
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-600 mt-2">
              View and manage all your banking transactions.
            </p>
          </div>
          <button
            onClick={exportTransactions}
            className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-dark focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal Transfer</option>
              <option value="ach">ACH Transfer</option>
              <option value="wire_domestic">Wire Transfer</option>
              <option value="wire_international">International Wire</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => {
                    const type = getTransactionType(transaction)
                    const senderName = (transaction as any).sender_name || (transaction as any).sender?.full_name || 'You'
                    // Get recipient name
                    const recipientName = (transaction as any).recipient_name || (transaction as any).recipient?.full_name || 'External Account'
                    const fee = (transaction as any).fee || 0
                    const refNumber = (transaction as any).reference_number
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                              {getTransactionIcon(type)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {getTransactionDescription(transaction)}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {type.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-semibold ${getTransactionColor(type)}`}>
                            {type === 'withdrawal' ? '-' : ''}
                            {formatCurrency(transaction.amount)}
                          </div>
                          {fee > 0 && (
                            <div className="text-xs text-gray-500">
                              Fee: {formatCurrency(fee)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(transaction.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>From: {senderName}</div>
                            <div>To: {recipientName}</div>
                            {refNumber && (
                              <div className="text-xs text-gray-400 mt-1">
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
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Found</h3>
              <p className="text-gray-600 mb-6">
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {filteredTransactions.filter(t => t.transaction_type === 'deposit').length}
                </div>
                <div className="text-sm text-green-600">Deposits</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {filteredTransactions.filter(t => t.transaction_type === 'withdrawal').length}
                </div>
                <div className="text-sm text-red-600">Withdrawals</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredTransactions.filter(t => t.transaction_type === 'transfer').length}
                </div>
                <div className="text-sm text-blue-600">Transfers</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 