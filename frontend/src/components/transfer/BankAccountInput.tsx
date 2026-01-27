'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BankLookupResponse } from '@/types'

interface BankAccountInputProps {
  routingNumber: string
  accountNumber: string
  bankName: string
  onRoutingNumberChange: (value: string) => void
  onAccountNumberChange: (value: string) => void
  onBankNameChange: (value: string) => void
  onBankInfoLoaded?: (bankInfo: BankLookupResponse) => void
  accountType?: 'checking' | 'savings'
  onAccountTypeChange?: (type: 'checking' | 'savings') => void
  showAccountType?: boolean
  errors?: {
    routingNumber?: string
    accountNumber?: string
    bankName?: string
  }
}

export default function BankAccountInput({
  routingNumber,
  accountNumber,
  bankName,
  onRoutingNumberChange,
  onAccountNumberChange,
  onBankNameChange,
  onBankInfoLoaded,
  accountType = 'checking',
  onAccountTypeChange,
  showAccountType = true,
  errors
}: BankAccountInputProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isRoutingValid, setIsRoutingValid] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const lastValidatedRef = useRef<string>('')
  const onBankInfoLoadedRef = useRef(onBankInfoLoaded)

  // Keep the callback ref up to date
  useEffect(() => {
    onBankInfoLoadedRef.current = onBankInfoLoaded
  }, [onBankInfoLoaded])

  useEffect(() => {
    const validateRoutingNumber = async () => {
      if ((routingNumber.length === 8 || routingNumber.length === 9) && routingNumber !== lastValidatedRef.current) {
        setIsValidating(true)
        setValidationError('')
        setIsRoutingValid(false)

        try {
          // Import bankingAPI dynamically to avoid circular dependencies
          const { bankingAPI } = await import('@/lib/api')
          const response = await bankingAPI.validateRoutingNumber(routingNumber)

          if (response.is_valid) {
            setIsRoutingValid(true)
            lastValidatedRef.current = routingNumber
            onBankInfoLoadedRef.current?.(response)
          } else {
            setValidationError(response.message || 'Invalid routing number')
            setIsRoutingValid(false)
            lastValidatedRef.current = ''
          }
        } catch (error: any) {
          setValidationError(error?.response?.data?.message || 'Invalid routing number')
          setIsRoutingValid(false)
          lastValidatedRef.current = ''
        } finally {
          setIsValidating(false)
        }
      } else if (routingNumber.length < 8) {
        setIsRoutingValid(false)
        setValidationError('')
        lastValidatedRef.current = ''
      }
    }

    const timeoutId = setTimeout(validateRoutingNumber, 500)
    return () => clearTimeout(timeoutId)
  }, [routingNumber])

  return (
    <div className="space-y-4">
      {/* Routing Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Routing Number (US/Canada)
        </label>
        <div className="relative">
          <input
            type="text"
            value={routingNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 9)
              onRoutingNumberChange(value)
            }}
            maxLength={9}
            placeholder="8 digits (Canada) or 9 digits (US)"
            className={cn(
              "w-full px-4 py-3 pr-10 border rounded-lg",
              "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
              "bg-white dark:bg-gray-800",
              "text-gray-900 dark:text-white",
              "placeholder-gray-400 dark:placeholder-gray-500",
              errors?.routingNumber || validationError
                ? "border-red-300 dark:border-red-700"
                : "border-gray-300 dark:border-gray-600"
            )}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isValidating && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            {!isValidating && isRoutingValid && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {!isValidating && validationError && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
        {errors?.routingNumber && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.routingNumber}</p>
        )}

      </div>

      {/* Bank Name Input - Shows after routing number is validated */}
      {isRoutingValid && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={bankName}
              onChange={(e) => onBankNameChange(e.target.value)}
              placeholder="Enter your bank name (e.g., JPMorgan Chase)"
              className={cn(
                "w-full pl-10 pr-4 py-3 border rounded-lg",
                "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
                "bg-white dark:bg-gray-800",
                "text-gray-900 dark:text-white",
                "placeholder-gray-400 dark:placeholder-gray-500",
                errors?.bankName
                  ? "border-red-300 dark:border-red-700"
                  : "border-gray-300 dark:border-gray-600"
              )}
            />
          </div>
          {errors?.bankName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bankName}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Please enter the full name of your bank as it appears on your account
          </p>
        </div>
      )}

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Account Number
        </label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            onAccountNumberChange(value)
          }}
          placeholder="Enter account number"
          className={cn(
            "w-full px-4 py-3 border rounded-lg",
            "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
            "bg-white dark:bg-gray-800",
            "text-gray-900 dark:text-white",
            "placeholder-gray-400 dark:placeholder-gray-500",
            errors?.accountNumber
              ? "border-red-300 dark:border-red-700"
              : "border-gray-300 dark:border-gray-600"
          )}
        />
        {errors?.accountNumber && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountNumber}</p>
        )}
      </div>

      {/* Account Type */}
      {showAccountType && onAccountTypeChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onAccountTypeChange('checking')}
              className={cn(
                "px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all",
                accountType === 'checking'
                  ? "border-primary-dark bg-primary-dark/5 dark:bg-primary-dark/10 text-primary-dark"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
              )}
            >
              Checking
            </button>
            <button
              type="button"
              onClick={() => onAccountTypeChange('savings')}
              className={cn(
                "px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all",
                accountType === 'savings'
                  ? "border-primary-dark bg-primary-dark/5 dark:bg-primary-dark/10 text-primary-dark"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
              )}
            >
              Savings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
