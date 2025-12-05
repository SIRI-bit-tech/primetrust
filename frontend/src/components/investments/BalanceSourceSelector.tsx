import { DollarSign, Bitcoin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BalanceSourceSelectorProps {
  value: 'fiat' | 'bitcoin'
  onChange: (value: 'fiat' | 'bitcoin') => void
  fiatBalance: number
  bitcoinBalance: number
  disabled?: boolean
}

export default function BalanceSourceSelector({
  value,
  onChange,
  fiatBalance,
  bitcoinBalance,
  disabled = false
}: BalanceSourceSelectorProps) {
  const sources = [
    {
      value: 'fiat' as const,
      label: 'Fiat Balance',
      icon: DollarSign,
      balance: fiatBalance,
      format: (bal: number) => `$${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      value: 'bitcoin' as const,
      label: 'Bitcoin Balance',
      icon: Bitcoin,
      balance: bitcoinBalance,
      format: (bal: number) => `${bal.toFixed(8)} BTC`
    }
  ]

  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">
        Payment Source
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => (
          <label
            key={source.value}
            className={cn(
              "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all",
              value === source.value
                ? "border-primary-dark ring-2 ring-primary-dark bg-primary-dark/5"
                : "border-gray-300 hover:border-gray-400",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              value={source.value}
              checked={value === source.value}
              onChange={(e) => onChange(e.target.value as 'fiat' | 'bitcoin')}
              disabled={disabled}
              className="sr-only"
            />
            <div className="flex items-center w-full">
              <source.icon className={cn(
                "w-6 h-6 mr-3",
                value === source.value ? "text-primary-dark" : "text-gray-500"
              )} />
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  value === source.value ? "text-primary-dark" : "text-gray-900"
                )}>
                  {source.label}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  value === source.value ? "text-primary-dark/70" : "text-gray-500"
                )}>
                  Available: {source.format(source.balance)}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
