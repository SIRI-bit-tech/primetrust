import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Investment } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

interface InvestmentCardProps {
  investment: Investment
  onSell: (investment: Investment) => void
}

export default function InvestmentCard({ investment, onSell }: InvestmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success bg-success/10'
      case 'sold':
        return 'text-gray-600 bg-gray-100'
      case 'pending':
        return 'text-warning bg-warning/10'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getProfitLossColor = (profitLoss: number) => {
    return profitLoss >= 0 ? 'text-success' : 'text-error'
  }

  const getProfitLossIcon = (profitLoss: number) => {
    return profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  const getBalanceSourceLabel = (source: string) => {
    return source === 'fiat' ? 'Fiat' : 'Bitcoin'
  }

  return (
    <div className="p-6 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{investment.name}</h3>
            {investment.symbol && (
              <span className="text-sm text-gray-500 dark:text-gray-400">({investment.symbol})</span>
            )}
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              getStatusColor(investment.status)
            )}>
              {investment.status}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-dark/10 dark:bg-primary-navy/20 text-primary-dark dark:text-primary-navy">
              {getBalanceSourceLabel(investment.balance_source)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Amount Invested</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(investment.amount_invested)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Current Value</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(investment.current_value)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">P&L</p>
              <div className="flex items-center space-x-1">
                {getProfitLossIcon(investment.profit_loss)}
                <span className={cn("font-medium", getProfitLossColor(investment.profit_loss))}>
                  {formatCurrency(investment.profit_loss)} ({Number(investment.profit_loss_percentage || 0).toFixed(2)}%)
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Type</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{investment.investment_type.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Purchased on {formatDate(investment.created_at)}</p>
            <p>Last updated: {formatDate(investment.last_updated)}</p>
          </div>
        </div>

        {investment.status === 'active' && (
          <div className="ml-6">
            <button
              onClick={() => onSell(investment)}
              className="bg-error text-white px-4 py-2 rounded-md hover:bg-error/90 transition-colors flex items-center space-x-2"
            >
              <Minus className="w-4 h-4" />
              <span>Sell</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
