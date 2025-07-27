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
  EyeOff,
  Plus,
  ArrowUpRight,
  Calendar,
  Clock,
  ShoppingCart,
  Coffee,
  Car,
  Copy,
  Check,
  Bitcoin,
  ArrowUpDown,
  ArrowDownUp
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { bankingAPI, transactionsAPI } from '@/lib/api'
import { Account, Transaction, VirtualCard } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedRouting, setCopiedRouting] = useState(false)

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch account information
        const accountData = await bankingAPI.getAccountInfo()
        setAccount(accountData)
        
        // Fetch recent transactions
        const transactionsData = await transactionsAPI.getTransactions()
        const transactionsArray = Array.isArray(transactionsData) ? transactionsData : transactionsData.results || []
        setTransactions(transactionsArray.slice(0, 5))
        
        // Fetch virtual cards
        const cardsData = await bankingAPI.getCards()
        setCards(cardsData)
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <Send className="w-4 h-4" />
      case 'deposit':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'withdrawal':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'shopping':
        return <ShoppingCart className="w-4 h-4" />
      case 'food':
        return <Coffee className="w-4 h-4" />
      case 'transport':
        return <Car className="w-4 h-4" />
      default:
        return <DollarSign className="w-4 h-4" />
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
              Welcome back, {user?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s your financial overview for today
            </p>
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                  <div className="flex items-center mt-2">
                    {showBalance ? (
                      <p className="text-4xl font-bold">
                        {formatCurrency(account?.balance || 0)}
                      </p>
                    ) : (
                      <p className="text-4xl font-bold">••••••</p>
                    )}
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="ml-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
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
                    {account?.account_type || 'Savings'}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link href="/dashboard/transfer">
                    <Send className="w-6 h-6" />
                    <span className="text-sm">Send Money</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link href="/dashboard/send-bitcoin">
                    <Bitcoin className="w-6 h-6" />
                    <span className="text-sm">Send Bitcoin</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link href="/dashboard/receive-bitcoin">
                    <ArrowDownUp className="w-6 h-6" />
                    <span className="text-sm">Receive Bitcoin</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link href="/dashboard/swap-bitcoin">
                    <ArrowUpDown className="w-6 h-6" />
                    <span className="text-sm">Swap Bitcoin</span>
                  </Link>
                </Button>
              </div>
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
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type === 'withdrawal' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {transaction.transaction_type}
                      </Badge>
                    </div>
                  </div>
                ))}
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
    </DashboardLayout>
  )
} 