import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown } from 'lucide-react'
import { investmentsAPI } from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

interface InvestmentOption {
  symbol: string
  name: string
  price: number
  type: string
}

interface InvestmentSelectorProps {
  investmentType: string
  onSelect: (investment: InvestmentOption) => void
  disabled?: boolean
}

export default function InvestmentSelector({
  investmentType,
  onSelect,
  disabled = false
}: InvestmentSelectorProps) {
  const [investments, setInvestments] = useState<InvestmentOption[]>([])
  const [filteredInvestments, setFilteredInvestments] = useState<InvestmentOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentOption | null>(null)

  useEffect(() => {
    if (investmentType) {
      // Reset selection when investment type changes
      setSelectedInvestment(null)
      setSearchQuery('')
      fetchInvestments()
      
      // Auto-refresh prices every 60 seconds
      const interval = setInterval(() => {
        fetchInvestments()
      }, 60000)
      
      return () => clearInterval(interval)
    }
  }, [investmentType])

  useEffect(() => {
    if (searchQuery) {
      const filtered = investments.filter(inv =>
        inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredInvestments(filtered)
    } else {
      setFilteredInvestments(investments)
    }
  }, [searchQuery, investments])

  const fetchInvestments = async () => {
    setLoading(true)
    try {
      const data = await investmentsAPI.getAvailableInvestments(investmentType)
      setInvestments(data)
      setFilteredInvestments(data)
      // Auto-show dropdown when investments are loaded
      if (data.length > 0 && !selectedInvestment) {
        setShowDropdown(true)
      }
    } catch (error) {
      console.error('Failed to fetch investments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (investment: InvestmentOption) => {
    setSelectedInvestment(investment)
    setSearchQuery(`${investment.name} (${investment.symbol})`)
    setShowDropdown(false)
    onSelect(investment)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
        Select Investment
      </label>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search by name or symbol..."
          disabled={disabled || loading}
          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
        />
      </div>

      {(showDropdown || (investments.length > 0 && !selectedInvestment)) && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading investments...
              </div>
            ) : filteredInvestments.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? `No investments found for "${searchQuery}"` : 'No investments available'}
              </div>
            ) : (
              filteredInvestments.map((investment) => (
                <button
                  key={investment.symbol}
                  onClick={() => handleSelect(investment)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {investment.symbol}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {investment.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(investment.price)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {selectedInvestment && (
        <div className="mt-2 p-3 bg-primary-dark/5 dark:bg-primary-navy/10 border border-primary-dark/20 dark:border-primary-navy/20 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedInvestment.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Symbol: {selectedInvestment.symbol}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Current Price
              </p>
              <p className="text-lg font-bold text-primary-dark dark:text-primary-navy">
                {formatCurrency(selectedInvestment.price)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
