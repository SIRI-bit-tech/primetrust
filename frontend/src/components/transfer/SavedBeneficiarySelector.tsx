'use client'

import { useState } from 'react'
import { Users, ChevronDown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SavedBeneficiary } from '@/types'

interface SavedBeneficiarySelectorProps {
  beneficiaries: SavedBeneficiary[]
  onSelect: (beneficiary: SavedBeneficiary) => void
  selectedId?: number
  className?: string
}

export default function SavedBeneficiarySelector({
  beneficiaries,
  onSelect,
  selectedId,
  className
}: SavedBeneficiarySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (beneficiaries.length === 0) {
    return null
  }

  const selectedBeneficiary = beneficiaries.find(b => b.id === selectedId)

  return (
    <div className={cn("relative", className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Saved Recipients</span>
        </div>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 border rounded-lg text-left",
          "flex items-center justify-between",
          "bg-white dark:bg-gray-800",
          "border-gray-300 dark:border-gray-600",
          "hover:border-gray-400 dark:hover:border-gray-500",
          "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
          "transition-colors"
        )}
      >
        <span className={cn(
          "text-sm",
          selectedBeneficiary
            ? "text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400"
        )}>
          {selectedBeneficiary
            ? `${selectedBeneficiary.nickname} - ${selectedBeneficiary.recipient_name}`
            : 'Select a saved recipient'
          }
        </span>
        <ChevronDown className={cn(
          "w-5 h-5 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={cn(
            "absolute z-20 w-full mt-2",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-lg shadow-lg",
            "max-h-64 overflow-y-auto"
          )}>
            {beneficiaries.map((beneficiary) => (
              <button
                key={beneficiary.id}
                type="button"
                onClick={() => {
                  onSelect(beneficiary)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-4 py-3 text-left",
                  "hover:bg-gray-50 dark:hover:bg-gray-700",
                  "transition-colors",
                  "border-b border-gray-100 dark:border-gray-700 last:border-0",
                  selectedId === beneficiary.id && "bg-primary-dark/5 dark:bg-primary-dark/10"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {beneficiary.nickname}
                      </p>
                      {beneficiary.last_used && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {beneficiary.recipient_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {beneficiary.bank_name}
                      {beneficiary.account_number && ` • ${
                        beneficiary.account_number.length >= 4 
                          ? `****${beneficiary.account_number.slice(-4)}` 
                          : '****'
                      }`}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    "bg-gray-100 dark:bg-gray-700",
                    "text-gray-600 dark:text-gray-400",
                    "whitespace-nowrap"
                  )}>
                    {beneficiary.transfer_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
