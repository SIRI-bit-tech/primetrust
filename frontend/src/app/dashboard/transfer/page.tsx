'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, DollarSign, User, MessageSquare, ArrowLeft, Globe } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import TransferPinModal from '@/components/TransferPinModal'
import TransferTypeSelector from '@/components/transfer/TransferTypeSelector'
import BankAccountInput from '@/components/transfer/BankAccountInput'
import TransferFeeDisplay from '@/components/transfer/TransferFeeDisplay'
import SavedBeneficiarySelector from '@/components/transfer/SavedBeneficiarySelector'
import TransferReceipt from '@/components/receipt/TransferReceipt'
import { bankingAPI } from '@/lib/api'
import { TransferData, TransferType, BankLookupResponse, SavedBeneficiary, ReceiptData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// Internal transfer schema
const internalTransferSchema = z.object({
  recipient_email: z.string().email('Please enter a valid email address'),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(10000, 'Maximum transfer amount is $10,000'),
  description: z.string().min(1, 'Description is required').max(100, 'Description must be less than 100 characters'),
})

// ACH transfer schema
const achTransferSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name is required'),
  routing_number: z.string().length(9, 'Routing number must be 9 digits'),
  account_number: z.string().min(4, 'Account number is required'),
  bank_name: z.string().min(2, 'Bank name is required'),
  account_type: z.enum(['checking', 'savings']),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(50000, 'Maximum ACH transfer is $50,000'),
  description: z.string().min(1, 'Description is required').max(100, 'Description must be less than 100 characters'),
  save_recipient: z.boolean().optional(),
  recipient_nickname: z.string().optional(),
})

// Wire transfer schema
const wireTransferSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name is required'),
  routing_number: z.string().length(9, 'Routing number must be 9 digits'),
  account_number: z.string().min(4, 'Account number is required'),
  bank_name: z.string().min(2, 'Bank name is required'),
  bank_address: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(100000, 'Maximum wire transfer is $100,000'),
  description: z.string().min(1, 'Description is required').max(100, 'Description must be less than 100 characters'),
  reference: z.string().optional(),
  save_recipient: z.boolean().optional(),
  recipient_nickname: z.string().optional(),
})

// International wire schema
const internationalWireSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name is required'),
  recipient_address: z.string().min(5, 'Recipient address is required'),
  recipient_city: z.string().min(2, 'City is required'),
  recipient_country: z.string().min(2, 'Country is required'),
  swift_code: z.string().min(8, 'SWIFT/BIC code is required'),
  iban: z.string().optional(),
  bank_name: z.string().min(2, 'Bank name is required'),
  bank_address: z.string().min(5, 'Bank address is required'),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(250000, 'Maximum international wire is $250,000'),
  currency: z.string().default('USD'),
  description: z.string().min(1, 'Description is required').max(100, 'Description must be less than 100 characters'),
  purpose: z.string().min(5, 'Purpose of transfer is required'),
  save_recipient: z.boolean().optional(),
  recipient_nickname: z.string().optional(),
})

type InternalTransferFormData = z.infer<typeof internalTransferSchema>
type ACHTransferFormData = z.infer<typeof achTransferSchema>
type WireTransferFormData = z.infer<typeof wireTransferSchema>
type InternationalWireFormData = z.infer<typeof internationalWireSchema>

export default function TransferPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // State
  const [transferType, setTransferType] = useState<TransferType>('internal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingTransfer, setPendingTransfer] = useState<any>(null)
  const [bankInfo, setBankInfo] = useState<BankLookupResponse | null>(null)
  const [savedBeneficiaries] = useState<SavedBeneficiary[]>([]) // TODO: Fetch from API
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking')
  const [saveRecipient, setSaveRecipient] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  
  const isAccountLocked = user?.is_account_locked || false

  // Get schema based on transfer type
  const getSchema = () => {
    switch (transferType) {
      case 'internal':
        return internalTransferSchema
      case 'ach':
        return achTransferSchema
      case 'wire_domestic':
        return wireTransferSchema
      case 'wire_international':
        return internationalWireSchema
      default:
        return internalTransferSchema
    }
  }

  // Get current schema for the active transfer type
  const currentSchema = getSchema()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(currentSchema),
  })

  // Reset form when transfer type changes to apply new schema
  useEffect(() => {
    reset()
  }, [transferType, reset])

  // Sync account_type separately to avoid resetting entire form
  useEffect(() => {
    if (transferType === 'ach') {
      setValue('account_type', accountType)
    }
  }, [transferType, accountType, setValue])

  const amount = watch('amount', 0)

  // Calculate fees based on transfer type
  const getFeeInfo = () => {
    const fees = {
      internal: { base: 0, percentage: 0, time: 'Instant', completion: 'Immediately' },
      ach: { base: 0.5, percentage: 0, time: '1-3 business days', completion: 'Within 3 business days' },
      wire_domestic: { base: 25, percentage: 0, time: 'Same day', completion: 'Today by 5 PM EST' },
      wire_international: { base: 45, percentage: 0.5, time: '1-5 business days', completion: 'Within 5 business days' },
    }
    
    const feeConfig = fees[transferType]
    const baseFee = feeConfig.base
    const percentageFee = (amount * feeConfig.percentage) / 100
    const totalFee = baseFee + percentageFee
    
    return {
      fee: totalFee,
      totalAmount: amount + totalFee,
      processingTime: feeConfig.time,
      estimatedCompletion: feeConfig.completion,
    }
  }

  const feeInfo = getFeeInfo()

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setError('')

    try {
      // Prepare transfer data based on transfer type
      let transferData: any = {
        ...data,
        save_recipient: saveRecipient,
        recipient_nickname: saveRecipient ? (data.recipient_nickname || data.recipient_name) : undefined,
      }
      
      // Store fee info separately for receipt (not sent to backend)
      transferData._feeInfo = feeInfo
      transferData._transferType = transferType
      
      // Store pending transfer and show PIN modal
      setPendingTransfer(transferData)
      setShowPinModal(true)
    } catch (err: unknown) {
      // Generic error message
      setError('Transfer failed. Please check your information and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinVerification = async () => {
    if (!pendingTransfer) return

    setIsLoading(true)
    setError('')

    try {
      let response: any
      
      // Extract stored values
      const storedTransferType = pendingTransfer._transferType || transferType
      const storedFeeInfo = pendingTransfer._feeInfo || feeInfo
      
      // Remove internal fields before sending to API
      const { _feeInfo, _transferType, ...apiData } = pendingTransfer
      
      // Call appropriate API based on transfer type
      switch (storedTransferType) {
        case 'internal':
          response = await bankingAPI.initiateTransfer(apiData)
          break
        case 'ach':
          response = await bankingAPI.createACHTransfer(apiData)
          break
        case 'wire_domestic':
          response = await bankingAPI.createWireTransfer(apiData)
          break
        case 'wire_international':
          response = await bankingAPI.createInternationalWireTransfer(apiData)
          break
        default:
          throw new Error('Invalid transfer type')
      }
      
      // Prepare receipt data - show as pending since it needs admin approval
      const receipt: ReceiptData = {
        type: 'transfer',
        status: response.status === 'completed' ? 'completed' : 'pending',
        amount: pendingTransfer.amount,
        currency: pendingTransfer.currency || 'USD',
        sender: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'You',
        recipient: pendingTransfer.recipient_name || pendingTransfer.recipient_email,
        transferType: getTransferTypeLabel(storedTransferType),
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        }),
        referenceId: response.reference_number || generateReferenceId(storedTransferType),
      }
      
      setReceiptData(receipt)
      setShowPinModal(false)
      setShowReceipt(true)
      setPendingTransfer(null)
      reset()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } }
      
      // Extract stored values for failed receipt
      const storedTransferType = pendingTransfer._transferType || transferType
      
      // Show failed receipt
      const receipt: ReceiptData = {
        type: 'transfer',
        status: 'failed',
        amount: pendingTransfer.amount,
        currency: pendingTransfer.currency || 'USD',
        sender: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'You',
        recipient: pendingTransfer.recipient_name || pendingTransfer.recipient_email,
        transferType: getTransferTypeLabel(storedTransferType),
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        }),
        referenceId: generateReferenceId(storedTransferType),
      }
      
      setReceiptData(receipt)
      setShowPinModal(false)
      setShowReceipt(true)
      // Generic error message
      setError('Transfer failed. Please check your information and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getTransferTypeLabel = (type: TransferType): string => {
    const labels = {
      internal: 'Internal Transfer',
      ach: 'ACH Transfer',
      wire_domestic: 'Wire Transfer',
      wire_international: 'International Wire',
    }
    return labels[type]
  }

  const generateReferenceId = (type: string): string => {
    const prefix = type === 'ach' ? 'AC' : type === 'wire_domestic' ? 'WD' : type === 'wire_international' ? 'WI' : 'IT'
    const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
    return `${prefix}${random}`
  }

  const handleCloseReceipt = () => {
    setShowReceipt(false)
    setReceiptData(null)
    router.push('/dashboard/transactions')
  }

  const handleBeneficiarySelect = (beneficiary: SavedBeneficiary) => {
    setValue('recipient_name', beneficiary.recipient_name)
    setValue('routing_number', beneficiary.routing_number || '')
    setValue('account_number', beneficiary.account_number || '')
    setValue('bank_name', beneficiary.bank_name)
    if (beneficiary.account_type) {
      setAccountType(beneficiary.account_type)
    }
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Successful!</h2>
              <p className="text-gray-600 mb-4">
                Your money has been sent successfully. Redirecting to transactions...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-dark mx-auto"></div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transfer Money</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Send money securely with multiple transfer options
          </p>
        </div>

        {/* Transfer Type Selector */}
        <TransferTypeSelector
          selectedType={transferType}
          onTypeChange={(type) => {
            setTransferType(type)
            setError('')
          }}
          className="mb-8"
        />

        {/* Transfer Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={transferType}
        >
          <div className={cn(
            "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 relative",
            isAccountLocked && "pointer-events-none opacity-50"
          )}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Saved Beneficiaries */}
              {transferType !== 'internal' && savedBeneficiaries.length > 0 && (
                <SavedBeneficiarySelector
                  beneficiaries={savedBeneficiaries.filter(b => b.transfer_type === transferType)}
                  onSelect={handleBeneficiarySelect}
                />
              )}

              {/* Internal Transfer Fields */}
              {transferType === 'internal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipient Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('recipient_email')}
                      type="email"
                      className={cn(
                        "block w-full pl-10 pr-3 py-3 border rounded-lg",
                        "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "placeholder-gray-400 dark:placeholder-gray-500",
                        errors.recipient_email
                          ? "border-red-300 dark:border-red-700"
                          : "border-gray-300 dark:border-gray-600"
                      )}
                      placeholder="Enter recipient's email address"
                    />
                  </div>
                  {errors.recipient_email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.recipient_email.message as string}
                    </p>
                  )}
                </div>
              )}

              {/* ACH/Wire Transfer Fields */}
              {(transferType === 'ach' || transferType === 'wire_domestic') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recipient Name
                    </label>
                    <input
                      {...register('recipient_name')}
                      type="text"
                      className={cn(
                        "w-full px-4 py-3 border rounded-lg",
                        "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "placeholder-gray-400 dark:placeholder-gray-500",
                        errors.recipient_name
                          ? "border-red-300 dark:border-red-700"
                          : "border-gray-300 dark:border-gray-600"
                      )}
                      placeholder="Full name on account"
                    />
                    {errors.recipient_name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.recipient_name.message as string}
                      </p>
                    )}
                  </div>

                  <BankAccountInput
                    routingNumber={watch('routing_number') || ''}
                    accountNumber={watch('account_number') || ''}
                    bankName={watch('bank_name') || ''}
                    onRoutingNumberChange={(value) => setValue('routing_number', value)}
                    onAccountNumberChange={(value) => setValue('account_number', value)}
                    onBankNameChange={(value) => setValue('bank_name', value)}
                    onBankInfoLoaded={(info) => {
                      setBankInfo(info)
                    }}
                    accountType={accountType}
                    onAccountTypeChange={(type) => {
                      setAccountType(type)
                      setValue('account_type', type)
                    }}
                    showAccountType={transferType === 'ach'}
                    errors={{
                      routingNumber: errors.routing_number?.message as string,
                      accountNumber: errors.account_number?.message as string,
                      bankName: errors.bank_name?.message as string,
                    }}
                  />

                  {transferType === 'wire_domestic' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference (Optional)
                      </label>
                      <input
                        {...register('reference')}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Reference number or memo"
                      />
                    </div>
                  )}
                </>
              )}

              {/* International Wire Fields */}
              {transferType === 'wire_international' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recipient Name
                      </label>
                      <input
                        {...register('recipient_name')}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SWIFT/BIC Code
                      </label>
                      <input
                        {...register('swift_code')}
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="e.g., CHASUS33"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      IBAN (Optional)
                    </label>
                    <input
                      {...register('iban')}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="International Bank Account Number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name
                    </label>
                    <input
                      {...register('bank_name')}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Recipient's bank name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Purpose of Transfer
                    </label>
                    <input
                      {...register('purpose')}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Family support, Business payment"
                    />
                  </div>
                </>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg",
                      "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
                      "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                      errors.amount
                        ? "border-red-300 dark:border-red-700"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.amount.message as string}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  {...register('description')}
                  type="text"
                  maxLength={100}
                  className={cn(
                    "w-full px-4 py-3 border rounded-lg",
                    "focus:ring-2 focus:ring-primary-dark focus:border-transparent",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                    errors.description
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  )}
                  placeholder="What's this transfer for?"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.description.message as string}
                  </p>
                )}
              </div>

              {/* Save Recipient */}
              {transferType !== 'internal' && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="save_recipient"
                      checked={saveRecipient}
                      onChange={(e) => setSaveRecipient(e.target.checked)}
                      className="w-4 h-4 text-primary-dark focus:ring-primary-dark border-gray-300 rounded"
                    />
                    <label htmlFor="save_recipient" className="text-sm text-gray-700 dark:text-gray-300">
                      Save this recipient for future transfers
                    </label>
                  </div>

                  {/* Recipient Nickname (shown when save is checked) */}
                  {saveRecipient && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recipient Nickname (Optional)
                      </label>
                      <input
                        {...register('recipient_nickname')}
                        type="text"
                        placeholder="e.g., Mom, John's Business Account"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        If not provided, recipient name will be used
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Fee Display */}
              {amount > 0 && (
                <TransferFeeDisplay
                  amount={amount}
                  fee={feeInfo.fee}
                  totalAmount={feeInfo.totalAmount}
                  processingTime={feeInfo.processingTime}
                  estimatedCompletion={feeInfo.estimatedCompletion}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-dark to-primary-navy text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Transfer...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    {transferType === 'internal' ? 'Send Money' : 'Review Transfer'}
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Transfer Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              {transferType === 'internal' && 'Internal Transfer Information'}
              {transferType === 'ach' && 'ACH Transfer Information'}
              {transferType === 'wire_domestic' && 'Wire Transfer Information'}
              {transferType === 'wire_international' && 'International Wire Information'}
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              {transferType === 'internal' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Transfers are processed instantly</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>No transfer fees</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Recipient must have a PrimeTrust account</span>
                  </div>
                </>
              )}
              {transferType === 'ach' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Processing time: 1-3 business days</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Transfer fee: $0.50 per transaction</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Maximum amount: $50,000 per transfer</span>
                  </div>
                </>
              )}
              {transferType === 'wire_domestic' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Same-day processing (before 5 PM EST)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Transfer fee: $25 per transaction</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Maximum amount: $100,000 per transfer</span>
                  </div>
                </>
              )}
              {transferType === 'wire_international' && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Processing time: 1-5 business days</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Transfer fee: $45 + 0.5% of amount</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Maximum amount: $250,000 per transfer</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>SWIFT/BIC code required</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>


      </div>

      {/* Transfer PIN Modal */}
      {pendingTransfer && (
        <TransferPinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false)
            setPendingTransfer(null)
          }}
          onVerify={handlePinVerification}
          amount={pendingTransfer.amount}
          recipient={pendingTransfer.recipient_email || pendingTransfer.recipient_name}
          bankName={pendingTransfer.bank_name}
        />
      )}

      {/* Transfer Receipt */}
      {showReceipt && receiptData && (
        <TransferReceipt
          {...receiptData}
          onClose={handleCloseReceipt}
        />
      )}
    </DashboardLayout>
  )
} 