import { DollarSign, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface PortfolioSummaryProps {
  totalInvested: number
  totalCurrentValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
}

export default function PortfolioSummary({
  totalInvested,
  totalCurrentValue,
  totalProfitLoss,
  totalProfitLossPercent
}: PortfolioSummaryProps) {
  const getProfitLossColor = (profitLoss: number) => {
    return profitLoss >= 0 ? 'text-success' : 'text-error'
  }

  const getProfitLossIcon = (profitLoss: number) => {
    return profitLoss >= 0 ? <TrendingUp className="w-8 h-8 text-success" /> : <TrendingDown className="w-8 h-8 text-error" />
  }

  const cards = [
    {
      label: 'Total Invested',
      value: formatCurrency(totalInvested),
      icon: DollarSign,
      iconColor: 'text-primary-dark dark:text-primary-navy'
    },
    {
      label: 'Current Value',
      value: formatCurrency(totalCurrentValue),
      icon: BarChart3,
      iconColor: 'text-primary-dark dark:text-primary-navy'
    },
    {
      label: 'Total P&L',
      value: formatCurrency(totalProfitLoss),
      icon: () => getProfitLossIcon(totalProfitLoss),
      valueColor: getProfitLossColor(totalProfitLoss)
    },
    {
      label: 'P&L %',
      value: `${totalProfitLossPercent.toFixed(2)}%`,
      icon: () => getProfitLossIcon(totalProfitLoss),
      valueColor: getProfitLossColor(totalProfitLoss)
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={cn(
                "text-2xl font-bold",
                card.valueColor || "text-gray-900 dark:text-white"
              )}>
                {card.value}
              </p>
            </div>
            <card.icon className={cn("w-8 h-8", card.iconColor)} />
          </div>
        </div>
      ))}
    </div>
  )
}
