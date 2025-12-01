'use client'

import { useState, useEffect } from 'react'

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Plus, 
  Minus,
  Eye,
  EyeOff,
  RefreshCw,
  PieChart,
  Target,
  Calendar,
  X
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/DashboardLayout'
import { investmentsAPI } from '@/lib/api'
import { Investment, InvestmentPurchase } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const investmentPurchaseSchema = z.object({
  investment_type: z.enum(['stocks', 'bonds', 'mutual_funds', 'etfs', 'crypto']),
  name: z.string().min(1, 'Investment name is required'),
  symbol: z.string().optional(),
  amount: z.number().min(100, 'Minimum investment amount is $100'),
  quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
})

type InvestmentPurchaseForm = z.infer<typeof investmentPurchaseSchema>

const investmentTypes = [
  { value: 'stocks', label: 'Stocks', icon: TrendingUp, description: 'Individual company shares' },
  { value: 'bonds', label: 'Bonds', icon: Target, description: 'Fixed-income securities' },
  { value: 'mutual_funds', label: 'Mutual Funds', icon: PieChart, description: 'Diversified investment pools' },
  { value: 'etfs', label: 'ETFs', icon: BarChart3, description: 'Exchange-traded funds' },
  { value: 'crypto', label: 'Cryptocurrency', icon: DollarSign, description: 'Digital currencies' },
]

// Mock market data for demonstration
const mockMarketData = {
  'AAPL': { price: 150.25, change: 2.15, changePercent: 1.45 },
  'GOOGL': { price: 2750.80, change: -15.20, changePercent: -0.55 },
  'TSLA': { price: 850.50, change: 25.30, changePercent: 3.07 },
  'MSFT': { price: 320.75, change: 8.45, changePercent: 2.71 },
  'AMZN': { price: 185.90, change: -3.10, changePercent: -1.64 },
}

export default function InvestmentsPage() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [sellQuantity, setSellQuantity] = useState('')
  const [selling, setSelling] = useState(false)
  const [showMarketData, setShowMarketData] = useState(false)
  const [marketData, setMarketData] = useState(mockMarketData)
  const [refreshing, setRefreshing] = useState(false)
  
  const isAccountLocked = user?.is_account_locked || false

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<InvestmentPurchaseForm>({
    resolver: zodResolver(investmentPurchaseSchema),
  })

  const watchedType = watch('investment_type', 'stocks')

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      setLoading(true)
      const data = await investmentsAPI.getInvestments()
      setInvestments(data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to fetch investments')
    } finally {
      setLoading(false)
    }
  }

  const refreshMarketData = async () => {
    try {
      setRefreshing(true)
      // In a real app, this would fetch live market data
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMarketData(mockMarketData)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to refresh market data')
    } finally {
      setRefreshing(false)
    }
  }

  const onSubmit = async (data: InvestmentPurchaseForm) => {
    try {
      setPurchasing(true)
      await investmentsAPI.purchaseInvestment(data)
      setShowPurchaseForm(false)
      reset()
      fetchInvestments()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to purchase investment')
    } finally {
      setPurchasing(false)
    }
  }

  const handleSell = async () => {
    if (!selectedInvestment || !sellQuantity) return

    try {
      setSelling(true)
      const quantity = parseFloat(sellQuantity)
      await investmentsAPI.sellInvestment(selectedInvestment.id, quantity)
      setSelectedInvestment(null)
      setSellQuantity('')
      fetchInvestments()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to sell investment')
    } finally {
      setSelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'sold':
        return 'text-gray-600 bg-gray-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getProfitLossColor = (profitLoss: number) => {
    return profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getProfitLossIcon = (profitLoss: number) => {
    return profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0)
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0)
  const totalProfitLoss = totalCurrentValue - totalInvested
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

  if (loading) {
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
      <div className={cn("space-y-6 relative", isAccountLocked && "pointer-events-none opacity-50")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
            <p className="text-gray-600 mt-1">Manage your investment portfolio</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowMarketData(!showMarketData)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              {showMarketData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>Market Data</span>
            </button>
            <button
              onClick={() => setShowPurchaseForm(true)}
              className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-dark/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Buy Investment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary-dark" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentValue)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary-dark" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total P&L</p>
                <p className={cn("text-2xl font-bold", getProfitLossColor(totalProfitLoss))}>
                  {formatCurrency(totalProfitLoss)}
                </p>
              </div>
              {getProfitLossIcon(totalProfitLoss)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">P&L %</p>
                <p className={cn("text-2xl font-bold", getProfitLossColor(totalProfitLoss))}>
                  {totalProfitLossPercent.toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-dark" />
            </div>
          </div>
        </div>

        {/* Market Data */}
        {showMarketData && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Market Data</h2>
              <button
                onClick={refreshMarketData}
                disabled={refreshing}
                className="flex items-center space-x-2 text-primary-dark hover:text-primary-dark/80 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(marketData).map(([symbol, data]) => (
                  <div key={symbol} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{symbol}</h3>
                      <span className={cn(
                        "text-sm font-medium",
                        data.change >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Investment Purchase Form */}
        {showPurchaseForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Purchase Investment</h2>
              <button
                onClick={() => {
                  setShowPurchaseForm(false)
                  reset()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Investment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Investment Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {investmentTypes.map((type) => (
                    <label
                      key={type.value}
                      className={cn(
                        "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none",
                        watchedType === type.value
                          ? "border-primary-dark ring-2 ring-primary-dark"
                          : "border-gray-300"
                      )}
                    >
                      <input
                        type="radio"
                        {...register('investment_type')}
                        value={type.value}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <type.icon className="w-6 h-6 text-primary-dark mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.investment_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.investment_type.message}</p>
                )}
              </div>

              {/* Investment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investment Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="e.g., Apple Inc."
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symbol (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('symbol')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="e.g., AAPL"
                  />
                  {errors.symbol && (
                    <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>
                  )}
                </div>
              </div>

              {/* Amount and Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="Number of shares/units"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseForm(false)
                    reset()
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchasing}
                  className="bg-primary-dark text-white px-6 py-2 rounded-md hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
                >
                  {purchasing ? 'Purchasing...' : 'Purchase Investment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Investment Portfolio */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Portfolio</h2>
          </div>

          {investments.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h3>
              <p className="text-gray-600 mb-4">Start building your investment portfolio today.</p>
              <button
                onClick={() => setShowPurchaseForm(true)}
                className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors"
              >
                Make Your First Investment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {investments.map((investment) => (
                <div key={investment.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{investment.name}</h3>
                        {investment.symbol && (
                          <span className="text-sm text-gray-500">({investment.symbol})</span>
                        )}
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(investment.status)
                        )}>
                          {investment.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Amount Invested</p>
                          <p className="font-medium">{formatCurrency(investment.amount_invested)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Value</p>
                          <p className="font-medium">{formatCurrency(investment.current_value)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">P&L</p>
                          <div className="flex items-center space-x-1">
                            {getProfitLossIcon(investment.profit_loss)}
                            <span className={cn("font-medium", getProfitLossColor(investment.profit_loss))}>
                              {formatCurrency(investment.profit_loss)} ({investment.profit_loss_percentage.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium capitalize">{investment.investment_type.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-gray-500">
                        <p>Purchased on {formatDate(investment.created_at)}</p>
                        <p>Last updated: {formatDate(investment.last_updated)}</p>
                      </div>
                    </div>

                    {investment.status === 'active' && (
                      <div className="ml-6">
                        <button
                          onClick={() => setSelectedInvestment(investment)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <Minus className="w-4 h-4" />
                          <span>Sell</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sell Modal */}
      {selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sell Investment</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Selling: <span className="font-medium">{selectedInvestment.name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Current value: <span className="font-medium">{formatCurrency(selectedInvestment.current_value)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Sell
                </label>
                <input
                  type="number"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                  placeholder="Enter quantity"
                  min="1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to sell entire position
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setSelectedInvestment(null)
                    setSellQuantity('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={selling}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {selling ? 'Processing...' : 'Sell Investment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 