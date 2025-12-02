'use client'

import { Clock, DollarSign, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface TransferFeeDisplayProps {
  amount: number
  fee: number
  totalAmount: number
  processingTime: string
  estimatedCompletion: string
  className?: string
}

export default function TransferFeeDisplay({
  amount,
  fee,
  totalAmount,
  processingTime,
  estimatedCompletion,
  className
}: TransferFeeDisplayProps) {
  return (
    <div className={cn(
      "p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg",
      className
    )}>
      <div className="flex items-start gap-2 mb-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
          Transfer Summary
        </h3>
      </div>

      <div className="space-y-2">
        {/* Amount */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-300">Transfer Amount</span>
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {formatCurrency(amount)}
          </span>
        </div>

        {/* Fee */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300">Transfer Fee</span>
          </div>
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {formatCurrency(fee)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-blue-200 dark:border-blue-700 my-2" />

        {/* Total */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-blue-900 dark:text-blue-100">Total Debit</span>
          <span className="font-bold text-blue-900 dark:text-blue-100 text-base">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Processing Time */}
        <div className="flex items-center gap-2 pt-2 text-xs text-blue-700 dark:text-blue-300">
          <Clock className="w-4 h-4" />
          <div>
            <p className="font-medium">Processing Time: {processingTime}</p>
            <p className="text-blue-600 dark:text-blue-400">
              Estimated completion: {estimatedCompletion}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
