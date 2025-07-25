'use client'

import { useState, useEffect } from 'react'

import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Send, 
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { bankingAPI, transactionsAPI } from '@/lib/api'
import { Account, Transaction, VirtualCard } from '@/types'
import { formatCurrency, maskCardNumber } from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [accountData, transactionsData, cardsData] = await Promise.all([
        bankingAPI.getBalance(),
        transactionsAPI.getTransactions(),
        bankingAPI.getCards(),
      ])
      
      setAccount(accountData)
      setTransactions(transactionsData.slice(0, 5)) // Show only 5 recent transactions
      setCards(cardsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
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
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Account Balance</p>
                <div className="flex items-center mt-2">
                  {showBalance ? (
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(account?.balance || 0)}
                    </p>
                  ) : (
                    <p className="text-3xl font-bold text-gray-900">••••••</p>
                  )}
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-dark/10 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-dark" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Account: {account?.account_number}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Virtual Cards</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {cards.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {cards.length > 0 ? 'Active cards' : 'No cards yet'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {transactions.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This month
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/dashboard/transfer"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-dark hover:bg-primary-dark/5 transition-colors"
            >
              <Send className="w-8 h-8 text-primary-dark mb-2" />
              <span className="text-sm font-medium text-gray-700">Send Money</span>
            </Link>
            
            <Link
              href="/dashboard/cards"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-dark hover:bg-primary-dark/5 transition-colors"
            >
              <CreditCard className="w-8 h-8 text-primary-dark mb-2" />
              <span className="text-sm font-medium text-gray-700">Manage Cards</span>
            </Link>
            
            <Link
              href="/dashboard/transactions"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-dark hover:bg-primary-dark/5 transition-colors"
            >
              <Download className="w-8 h-8 text-primary-dark mb-2" />
              <span className="text-sm font-medium text-gray-700">View History</span>
            </Link>
            
            <Link
              href="/dashboard/profile"
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-primary-dark hover:bg-primary-dark/5 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-dark rounded-full flex items-center justify-center mb-2">
                <span className="text-white text-sm font-medium">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">Profile</span>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link
              href="/dashboard/transactions"
              className="text-primary-dark hover:text-primary-navy text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.transaction_type === 'transfer' 
                          ? `Transfer to ${transaction.recipient.full_name}`
                          : transaction.description || transaction.transaction_type
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                      {transaction.transaction_type === 'withdrawal' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Your transaction history will appear here
              </p>
            </div>
          )}
        </div>

        {/* Virtual Cards Preview */}
        {cards.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 animate-in slide-in-from-bottom-4 duration-500 delay-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Virtual Cards</h2>
              <Link
                href="/dashboard/cards"
                className="text-primary-dark hover:text-primary-navy text-sm font-medium"
              >
                Manage Cards
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.slice(0, 2).map((card) => (
                <div
                  key={card.id}
                  className="bg-gradient-to-r from-primary-dark to-primary-navy rounded-lg p-4 text-white"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm opacity-80">Virtual Card</span>
                    <span className="text-sm opacity-80">{card.card_type.toUpperCase()}</span>
                  </div>
                  <p className="text-lg font-mono mb-2">
                    {maskCardNumber(card.card_number)}
                  </p>
                  <div className="flex items-center justify-between text-sm opacity-80">
                    <span>CVV: {card.cvv}</span>
                    <span>Exp: {card.expiry_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 