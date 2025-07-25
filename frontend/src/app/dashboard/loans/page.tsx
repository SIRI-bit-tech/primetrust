'use client'

import { useState, useEffect } from 'react'

import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Home,
  Car,
  X
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/DashboardLayout'
import { loansAPI } from '@/lib/api'
import { Loan } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const loanApplicationSchema = z.object({
  loan_type: z.enum(['personal', 'business', 'mortgage', 'auto']),
  amount: z.number().min(1000, 'Minimum loan amount is $1,000').max(1000000, 'Maximum loan amount is $1,000,000'),
  purpose: z.string().min(10, 'Please provide a detailed purpose').max(500, 'Purpose is too long'),
  employment_status: z.enum(['employed', 'self_employed', 'unemployed']),
  monthly_income: z.number().min(1000, 'Monthly income must be at least $1,000'),
  credit_score: z.number().min(300).max(850).optional(),
})

type LoanApplicationForm = z.infer<typeof loanApplicationSchema>

const loanTypes = [
  { value: 'personal', label: 'Personal Loan', icon: DollarSign, description: 'For personal expenses, debt consolidation, or emergencies' },
  { value: 'business', label: 'Business Loan', icon: TrendingUp, description: 'For business expansion, equipment, or working capital' },
  { value: 'mortgage', label: 'Mortgage', icon: Home, description: 'For purchasing or refinancing a home' },
  { value: 'auto', label: 'Auto Loan', icon: Car, description: 'For purchasing a new or used vehicle' },
]

const employmentStatuses = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
]

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [makingPayment, setMakingPayment] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<LoanApplicationForm>({
    resolver: zodResolver(loanApplicationSchema),
  })

  const watchedAmount = watch('amount', 0)
  const watchedLoanType = watch('loan_type', 'personal')

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const data = await loansAPI.getLoans()
      setLoans(data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to fetch loans')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: LoanApplicationForm) => {
    try {
      setApplying(true)
      await loansAPI.applyForLoan(data)
      setShowApplicationForm(false)
      reset()
      fetchLoans()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to apply for loan')
    } finally {
      setApplying(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedLoan || !paymentAmount) return

    try {
      setMakingPayment(true)
      const amount = parseFloat(paymentAmount)
      await loansAPI.payLoan(selectedLoan.id, amount)
      setSelectedLoan(null)
      setPaymentAmount('')
      fetchLoans()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to make payment')
    } finally {
      setMakingPayment(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'active':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'paid':
        return 'text-green-600 bg-green-100'
      case 'defaulted':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />
      case 'active':
        return <TrendingUp className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'defaulted':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const calculateMonthlyPayment = (amount: number, rate: number, term: number) => {
    const monthlyRate = rate / 100 / 12
    const numberOfPayments = term
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  }

  const estimatedMonthlyPayment = watchedAmount > 0 
    ? calculateMonthlyPayment(watchedAmount, 8.5, 60) // Example: 8.5% APR, 60 months
    : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-dark"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
            <p className="text-gray-600 mt-1">Manage your loans and apply for new ones</p>
          </div>
          <button
            onClick={() => setShowApplicationForm(true)}
            className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-dark/90 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Apply for Loan</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        {/* Loan Application Form */}
        {showApplicationForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Apply for a Loan</h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false)
                  reset()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Loan Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Loan Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loanTypes.map((type) => (
                    <label
                      key={type.value}
                      className={cn(
                        "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none",
                        watchedLoanType === type.value
                          ? "border-primary-dark ring-2 ring-primary-dark"
                          : "border-gray-300"
                      )}
                    >
                      <input
                        type="radio"
                        {...register('loan_type')}
                        value={type.value}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <type.icon className="w-6 h-6 text-primary-dark mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.loan_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.loan_type.message}</p>
                )}
              </div>

              {/* Amount and Purpose */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                  {watchedAmount > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      Estimated monthly payment: {formatCurrency(estimatedMonthlyPayment)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose
                  </label>
                  <textarea
                    {...register('purpose')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="Describe the purpose of your loan"
                  />
                  {errors.purpose && (
                    <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
                  )}
                </div>
              </div>

              {/* Employment and Income */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Status
                  </label>
                  <select
                    {...register('employment_status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    {employmentStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {errors.employment_status && (
                    <p className="mt-1 text-sm text-red-600">{errors.employment_status.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      {...register('monthly_income', { valueAsNumber: true })}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                      placeholder="Enter monthly income"
                    />
                  </div>
                  {errors.monthly_income && (
                    <p className="mt-1 text-sm text-red-600">{errors.monthly_income.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Score (Optional)
                  </label>
                  <input
                    type="number"
                    {...register('credit_score', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="300-850"
                    min="300"
                    max="850"
                  />
                  {errors.credit_score && (
                    <p className="mt-1 text-sm text-red-600">{errors.credit_score.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationForm(false)
                    reset()
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="bg-primary-dark text-white px-6 py-2 rounded-md hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Loans */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Loans</h2>
          </div>

          {loans.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No loans yet</h3>
              <p className="text-gray-600 mb-4">You haven&apos;t applied for any loans yet.</p>
              <button
                onClick={() => setShowApplicationForm(true)}
                className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors"
              >
                Apply for Your First Loan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {loans.map((loan) => (
                <div key={loan.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {loan.loan_type.charAt(0).toUpperCase() + loan.loan_type.slice(1)} Loan
                        </h3>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(loan.status)
                        )}>
                          {getStatusIcon(loan.status)}
                          <span className="ml-1">{loan.status}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Original Amount</p>
                          <p className="font-medium">{formatCurrency(loan.amount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Remaining Balance</p>
                          <p className="font-medium">{formatCurrency(loan.remaining_balance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly Payment</p>
                          <p className="font-medium">{formatCurrency(loan.monthly_payment)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Interest Rate</p>
                          <p className="font-medium">{loan.interest_rate}%</p>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-gray-500">
                        <p>Applied on {formatDate(loan.created_at)}</p>
                        {loan.approved_at && <p>Approved on {formatDate(loan.approved_at)}</p>}
                        {loan.due_date && <p>Next payment due: {formatDate(loan.due_date)}</p>}
                      </div>
                    </div>

                    {loan.status === 'active' && (
                      <div className="ml-6">
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors"
                        >
                          Make Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="Enter amount"
                    min="0"
                    max={selectedLoan.remaining_balance}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Remaining balance: {formatCurrency(selectedLoan.remaining_balance)}
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setSelectedLoan(null)
                    setPaymentAmount('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={!paymentAmount || makingPayment}
                  className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
                >
                  {makingPayment ? 'Processing...' : 'Make Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 