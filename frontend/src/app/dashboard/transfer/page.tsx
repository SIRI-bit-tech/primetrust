'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, DollarSign, User, MessageSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import TransferPinModal from '@/components/TransferPinModal'
import { bankingAPI } from '@/lib/api'
import { TransferData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const transferSchema = z.object({
  recipient_email: z.string().email('Please enter a valid email address'),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(10000, 'Maximum transfer amount is $10,000'),
  description: z.string().min(1, 'Description is required').max(100, 'Description must be less than 100 characters'),
})

type TransferFormData = z.infer<typeof transferSchema>

export default function TransferPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingTransfer, setPendingTransfer] = useState<TransferData | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  })

  const onSubmit = async (data: TransferFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // Store pending transfer and show PIN modal
      setPendingTransfer(data)
      setShowPinModal(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Transfer failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinVerification = async () => {
    if (!pendingTransfer) return

    setIsLoading(true)
    setError('')

    try {
      await bankingAPI.initiateTransfer(pendingTransfer)
      setSuccess(true)
      setShowPinModal(false)
      setPendingTransfer(null)
      reset()
      
      // Redirect to transactions page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/transactions')
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Transfer failed. Please try again.')
    } finally {
      setIsLoading(false)
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Transfer Money</h1>
          <p className="text-gray-600 mt-2">
            Send money to other PrimeTrust users instantly and securely.
          </p>
        </div>

        {/* Transfer Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-lg shadow-sm p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Email */}
              <div>
                <label htmlFor="recipient_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('recipient_email')}
                    type="email"
                    id="recipient_email"
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.recipient_email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary-dark"
                    )}
                    placeholder="Enter recipient's email address"
                  />
                </div>
                {errors.recipient_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.recipient_email.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    id="amount"
                    step="0.01"
                    min="0.01"
                    max="10000"
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.amount
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary-dark"
                    )}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum transfer amount: {formatCurrency(10000)}
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('description')}
                    type="text"
                    id="description"
                    maxLength={100}
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.description
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary-dark"
                    )}
                    placeholder="What's this transfer for?"
                  />
                </div>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

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
                    Send Money
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
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Transfer Information</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Transfers are processed instantly between PrimeTrust users</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Maximum transfer amount: {formatCurrency(10000)}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>No transfer fees for PrimeTrust users</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Recipient must have a PrimeTrust account</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Security Notice</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                • All transfers are encrypted and secure
              </p>
              <p>
                • Double-check the recipient email before sending
              </p>
              <p>
                • Transfers cannot be cancelled once processed
              </p>
              <p>
                • Contact support if you notice any suspicious activity
              </p>
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
          recipient={pendingTransfer.recipient_email}
        />
      )}
    </DashboardLayout>
  )
} 