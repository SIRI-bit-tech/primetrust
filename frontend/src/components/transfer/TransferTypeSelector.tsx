'use client'

import { Building2, Send, Globe, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransferType } from '@/types'

interface TransferTypeOption {
  type: TransferType
  label: string
  description: string
  icon: React.ElementType
  processingTime: string
  fee: string
}

interface TransferTypeSelectorProps {
  selectedType: TransferType
  onTypeChange: (type: TransferType) => void
  className?: string
}

const transferTypes: TransferTypeOption[] = [
  {
    type: 'internal',
    label: 'Internal Transfer',
    description: 'To other PrimeTrust users',
    icon: Send,
    processingTime: 'Instant',
    fee: 'Free'
  },
  {
    type: 'ach',
    label: 'ACH Transfer',
    description: 'To US bank accounts',
    icon: Building2,
    processingTime: '1-3 business days',
    fee: '$0.50'
  },
  {
    type: 'wire_domestic',
    label: 'Wire Transfer',
    description: 'Same-day domestic',
    icon: Zap,
    processingTime: 'Same day',
    fee: '$25'
  },
  {
    type: 'wire_international',
    label: 'International Wire',
    description: 'Cross-border payments',
    icon: Globe,
    processingTime: '1-5 business days',
    fee: '$45'
  }
]

export default function TransferTypeSelector({
  selectedType,
  onTypeChange,
  className
}: TransferTypeSelectorProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {transferTypes.map((option) => {
        const Icon = option.icon
        const isSelected = selectedType === option.type
        
        return (
          <button
            key={option.type}
            type="button"
            onClick={() => onTypeChange(option.type)}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all duration-200 text-left",
              "hover:shadow-md hover:scale-105",
              isSelected
                ? "border-primary-dark bg-primary-dark/5 dark:bg-primary-dark/10"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isSelected
                  ? "bg-primary-dark text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold text-sm mb-1",
                  isSelected
                    ? "text-primary-dark dark:text-primary-dark"
                    : "text-gray-900 dark:text-white"
                )}>
                  {option.label}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {option.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {option.processingTime}
                  </span>
                  <span className={cn(
                    "font-medium",
                    isSelected
                      ? "text-primary-dark dark:text-primary-dark"
                      : "text-gray-700 dark:text-gray-300"
                  )}>
                    {option.fee}
                  </span>
                </div>
              </div>
            </div>
            
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary-dark rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
