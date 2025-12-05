import { TrendingUp, Target, PieChart, BarChart3, DollarSign, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvestmentType {
  value: 'stocks' | 'bonds' | 'mutual_funds' | 'etfs' | 'crypto'
  label: string
  icon: LucideIcon
  description: string
}

const investmentTypes: InvestmentType[] = [
  { value: 'stocks', label: 'Stocks', icon: TrendingUp, description: 'Individual company shares' },
  { value: 'bonds', label: 'Bonds', icon: Target, description: 'Fixed-income securities' },
  { value: 'mutual_funds', label: 'Mutual Funds', icon: PieChart, description: 'Diversified investment pools' },
  { value: 'etfs', label: 'ETFs', icon: BarChart3, description: 'Exchange-traded funds' },
  { value: 'crypto', label: 'Cryptocurrency', icon: DollarSign, description: 'Digital currencies' },
]

interface InvestmentTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function InvestmentTypeSelector({
  value,
  onChange,
  error,
  disabled = false
}: InvestmentTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">
        Investment Type
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investmentTypes.map((type) => (
          <label
            key={type.value}
            className={cn(
              "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all",
              value === type.value
                ? "border-primary-dark ring-2 ring-primary-dark bg-primary-dark/5"
                : "border-gray-300 hover:border-gray-400",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              value={type.value}
              checked={value === type.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="sr-only"
            />
            <div className="flex items-center">
              <type.icon className={cn(
                "w-6 h-6 mr-3",
                value === type.value ? "text-primary-dark" : "text-gray-500"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  value === type.value ? "text-primary-dark" : "text-gray-900"
                )}>
                  {type.label}
                </p>
                <p className="text-xs text-gray-500">{type.description}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  )
}
