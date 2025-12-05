'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Plus, 
  Eye,
  EyeOff,
  RefreshCw,
  X
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/DashboardLayout'
import { investmentsAPI, bankingAPI } from '@/lib/api'
import { Investment, InvestmentPurchase } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import InvestmentTypeSelector from '@/components/investments/InvestmentTypeSelector'
import BalanceSourceSelector from '@/components/investments/BalanceSourceSelector'
import InvestmentCard from '@/components/investments/InvestmentCard'
import PortfolioSummary from '@/components/investments/PortfolioSummary'
import InvestmentSelector from '@/components/investments/InvestmentSelector'

const investmentPurchaseSchema = z.object({
  investment_type: z.enum(['stocks', 'bonds', 'mutual_funds', 'etfs', 'crypto']),
  name: z.string().min(1, 'Investment name is required'),
  symbol: z.string().optional(),
  balance_source: z.enum(['fiat', 'bitcoin']),
  amount: z.number().min(100, 'Minimum investment amount is $100'),
  quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
})

type InvestmentPurchaseForm = z.infer<typeof investmentPurchaseSchema>

interface MarketQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface MarketDataResponse {
  stocks: MarketQuote[]
  crypto: MarketQuote[]
  last_updated?: string
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
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [fiatBalance, setFiatBalance] = useState(0)
  const [bitcoinBalance, setBitcoinBalance] = useState(0)
  
  const isAccountLocked = user?.is_account_locked || false

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<InvestmentPurchaseForm>({
    resolver: zodResolver(investmentPurchaseSchema),
    defaultValues: {
      balance_source: 'fiat',
      quantity: 1
    }
  })

  const watchedType = watch('investment_type', 'stocks')
  const watchedBalanceSource = watch('balance_source', 'fiat')

  const fetchBalances = async () => {
    try {
      const accountInfo = await bankingAPI.getAccountInfo()
      setFiatBalance(parseFloat(accountInfo.balance))
      
      const btcInfo = await bankingAPI.getBitcoinBalance()
      setBitcoinBalance(parseFloat(btcInfo.bitcoin_balance))
    } catch (err) {
      console.error('Failed to fetch balances:', err)
    }
  }

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

  const fetchMarketData = async () => {
    try {
      setRefreshing(true)
      const data = await investmentsAPI.getMarketData()
      setMarketData(data)
    } catch (err: unknown) {
      // Silently fail - market data is not critical
      console.debug('Market data unavailable:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshMarketData = () => {
    fetchMarketData()
  }

  useEffect(() => {
    fetchInvestments()
    fetchBalances()
    fetchMarketData()
  }, [])

  const onSubmit = async (data: InvestmentPurchaseForm) => {
    try {
      setPurchasing(true)
      setError('')
      await investmentsAPI.purchaseInvestment(data)
      setShowPurchaseForm(false)
      reset()
      fetchInvestments()
      fetchBalances()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } }
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to purchase investment')
    } finally {
      setPurchasing(false)
    }
  }

  const handleSell = async () => {
    if (!selectedInvestment) return

    try {
      setSelling(true)
      setError('')
      const quantity = sellQuantity ? parseFloat(sellQuantity) : undefined
      await investmentsAPI.sellInvestment(selectedInvestment.id, quantity)
      setSelectedInvestment(null)
      setSellQuantity('')
      fetchInvestments()
      fetchBalances()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } }
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to sell investment')
    } finally {
      setSelling(false)
    }
  }

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount_invested || 0), 0)
  const totalCurrentValue = investments.reduce((sum, inv) => sum + Number(inv.current_value || 0), 0)
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Investments</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your investment portfolio</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowMarketData(!showMarketData)}
              className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              {showMarketData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>Market Data</span>
            </button>
            <button
              onClick={() => setShowPurchaseForm(true)}
              className="bg-primary-dark dark:bg-primary-navy text-white px-6 py-3 rounded-lg hover:bg-primary-dark/90 dark:hover:bg-primary-navy/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Buy Investment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg animate-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {/* Portfolio Summary */}
        <PortfolioSummary
          totalInvested={totalInvested}
          totalCurrentValue={totalCurrentValue}
          totalProfitLoss={totalProfitLoss}
          totalProfitLossPercent={totalProfitLossPercent}
        />

        {/* Market Data */}
        {showMarketData && marketData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Market Data</h2>
              <button
                onClick={refreshMarketData}
                disabled={refreshing}
                className="flex items-center space-x-2 text-primary-dark dark:text-primary-navy hover:text-primary-dark/80 dark:hover:text-primary-navy/80 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="p-6">
              {/* Stocks Section */}
              {marketData.stocks && marketData.stocks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Stocks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketData.stocks.map((quote) => (
                      <div key={quote.symbol} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{quote.symbol}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{quote.name}</p>
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            quote.change >= 0 ? "text-success" : "text-error"
                          )}>
                            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(quote.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Crypto Section */}
              {marketData.crypto && marketData.crypto.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Cryptocurrency</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketData.crypto.map((quote) => (
                      <div key={quote.symbol} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{quote.symbol}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{quote.name}</p>
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            quote.change >= 0 ? "text-success" : "text-error"
                          )}>
                            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(quote.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Investment Purchase Form */}
        {showPurchaseForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Purchase Investment</h2>
              <button
                onClick={() => {
                  setShowPurchaseForm(false)
                  reset()
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Investment Type Selection */}
              <InvestmentTypeSelector
                value={watchedType}
                onChange={(value) => setValue('investment_type', value as any)}
                error={errors.investment_type?.message}
                disabled={purchasing}
              />

              {/* Balance Source Selection */}
              <BalanceSourceSelector
                value={watchedBalanceSource}
                onChange={(value) => setValue('balance_source', value)}
                fiatBalance={fiatBalance}
                bitcoinBalance={bitcoinBalance}
                disabled={purchasing}
              />

              {/* Investment Selector */}
              <InvestmentSelector
                investmentType={watchedType}
                onSelect={(investment) => {
                  setValue('name', investment.name)
                  setValue('symbol', investment.symbol)
                  // Auto-calculate quantity based on amount if amount is set
                  const currentAmount = watch('amount')
                  if (currentAmount && investment.price > 0) {
                    setValue('quantity', currentAmount / investment.price)
                  }
                }}
                disabled={purchasing}
              />

              {errors.name && (
                <p className="mt-1 text-sm text-error">{errors.name.message}</p>
              )}

              {/* Amount and Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Investment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-300">$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                      placeholder="Enter amount"
                      disabled={purchasing}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-error">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Quantity (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="Number of shares/units"
                    disabled={purchasing}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-error">{errors.quantity.message}</p>
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
                  disabled={purchasing}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Portfolio</h2>
          </div>

          {investments.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No investments yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Start building your investment portfolio today.</p>
              <button
                onClick={() => setShowPurchaseForm(true)}
                className="bg-primary-dark dark:bg-primary-navy text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 dark:hover:bg-primary-navy/90 transition-colors"
              >
                Make Your First Investment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {investments.map((investment) => (
                <InvestmentCard
                  key={investment.id}
                  investment={investment}
                  onSell={setSelectedInvestment}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sell Modal */}
      {selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sell Investment</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Selling: <span className="font-medium text-gray-900 dark:text-white">{selectedInvestment.name}</span>
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  Current value: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedInvestment.current_value)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Quantity to Sell
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                  placeholder="Enter quantity"
                  min="0"
                  disabled={selling}
                />
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Leave empty to sell entire position ({selectedInvestment.quantity} units)
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setSelectedInvestment(null)
                    setSellQuantity('')
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  disabled={selling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={selling}
                  className="bg-error text-white px-4 py-2 rounded-md hover:bg-error/90 transition-colors disabled:opacity-50"
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
