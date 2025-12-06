'use client'

import { useState, useEffect } from 'react'
import { 
  Receipt, 
  Plus, 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Edit,
  Trash2,
  Repeat,
  X,
  Shield
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DashboardLayout from '@/components/DashboardLayout'
import { billsAPI } from '@/lib/api'
import { Bill, BillPayment } from '@/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const billSchema = z.object({
  biller_name: z.string().min(1, 'Biller name is required'),
  biller_category: z.enum(['utilities', 'insurance', 'subscription', 'credit_card', 'other']),
  account_number: z.string().min(1, 'Account number is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  due_date: z.string().min(1, 'Due date is required'),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
})

type BillForm = z.infer<typeof billSchema>

const billCategories = [
  { value: 'utilities', label: 'Utilities', icon: Receipt, description: 'Electric, water, gas, internet' },
  { value: 'insurance', label: 'Insurance', icon: Shield, description: 'Health, auto, home insurance' },
  { value: 'subscription', label: 'Subscriptions', icon: Repeat, description: 'Streaming, software, services' },
  { value: 'credit_card', label: 'Credit Cards', icon: CreditCard, description: 'Credit card payments' },
  { value: 'other', label: 'Other', icon: Receipt, description: 'Other bills and expenses' },
]

const recurringFrequencies = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function BillsPage() {
  const { user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'account_balance' | 'virtual_card'>('account_balance')
  const [paying, setPaying] = useState(false)
  
  const isAccountLocked = user?.is_account_locked || false

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
  })

  const watchedIsRecurring = watch('is_recurring', false)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const data = await billsAPI.getBills()
      setBills(data)
    } catch (err: unknown) {
      // Generic error message
      setError('Failed to load bills. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: BillForm) => {
    try {
      setAdding(true)
      if (editingBill) {
        await billsAPI.updateBill(editingBill.id, data)
        setEditingBill(null)
      } else {
        await billsAPI.addBill({
          ...data,
          status: 'pending'
        })
      }
      setShowAddForm(false)
      reset()
      fetchBills()
    } catch (err: unknown) {
      // Generic error message
      setError('Failed to save bill. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBill) return

    try {
      setPaying(true)
      const paymentData: BillPayment = {
        bill_id: selectedBill.id,
        amount: selectedBill.amount,
        payment_method: paymentMethod,
      }
      await billsAPI.payBill(paymentData)
      setSelectedBill(null)
      fetchBills()
    } catch (err: unknown) {
      // Generic error message
      setError('Failed to pay bill. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const handleDelete = async (billId: number) => {
    if (!confirm('Are you sure you want to delete this bill?')) return

    try {
      await billsAPI.deleteBill(billId)
      fetchBills()
    } catch (err: unknown) {
      // Generic error message
      setError('Failed to delete bill. Please try again.')
    }
  }

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill)
    setValue('biller_name', bill.biller_name)
    setValue('biller_category', bill.biller_category)
    setValue('account_number', bill.account_number)
    setValue('amount', bill.amount)
    setValue('due_date', bill.due_date.split('T')[0])
    setValue('is_recurring', bill.is_recurring)
    setValue('recurring_frequency', bill.recurring_frequency)
    setShowAddForm(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'overdue':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = billCategories.find(cat => cat.value === category)
    return categoryData ? categoryData.icon : Receipt
  }

  const totalBills = bills.length
  const pendingBills = bills.filter(bill => bill.status === 'pending').length
  const overdueBills = bills.filter(bill => bill.status === 'overdue').length
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)

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
      <div className={cn("space-y-6 relative", isAccountLocked && "pointer-events-none opacity-50")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pay Bills</h1>
            <p className="text-gray-600 mt-1">Manage and pay your bills</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-dark/90 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Bill</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">{totalBills}</p>
              </div>
              <Receipt className="w-8 h-8 text-primary-dark" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingBills}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueBills}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary-dark" />
            </div>
          </div>
        </div>

        {/* Add/Edit Bill Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBill ? 'Edit Bill' : 'Add New Bill'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingBill(null)
                  reset()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Biller Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biller Name
                  </label>
                  <input
                    type="text"
                    {...register('biller_name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="e.g., Electric Company"
                  />
                  {errors.biller_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.biller_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    {...register('account_number')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    placeholder="Enter account number"
                  />
                  {errors.account_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.account_number.message}</p>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bill Category
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {billCategories.map((category) => (
                    <label
                      key={category.value}
                      className="relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none"
                    >
                      <input
                        type="radio"
                        {...register('biller_category')}
                        value={category.value}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <category.icon className="w-6 h-6 text-primary-dark mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{category.label}</p>
                          <p className="text-xs text-gray-500">{category.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.biller_category && (
                  <p className="mt-1 text-sm text-red-600">{errors.biller_category.message}</p>
                )}
              </div>

              {/* Amount and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount', { valueAsNumber: true })}
                      className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    {...register('due_date')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                  />
                  {errors.due_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
                  )}
                </div>
              </div>

              {/* Recurring Settings */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('is_recurring')}
                    className="h-4 w-4 text-primary-dark focus:ring-primary-dark border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    This is a recurring bill
                  </label>
                </div>

                {watchedIsRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurring Frequency
                    </label>
                    <select
                      {...register('recurring_frequency')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    >
                      <option value="">Select frequency</option>
                      {recurringFrequencies.map((frequency) => (
                        <option key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </option>
                      ))}
                    </select>
                    {errors.recurring_frequency && (
                      <p className="mt-1 text-sm text-red-600">{errors.recurring_frequency.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingBill(null)
                    reset()
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-primary-dark text-white px-6 py-2 rounded-md hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
                >
                  {adding ? 'Saving...' : (editingBill ? 'Update Bill' : 'Add Bill')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bills List */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Bills</h2>
          </div>

          {bills.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bills yet</h3>
              <p className="text-gray-600 mb-4">Add your first bill to get started.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors"
              >
                Add Your First Bill
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {bills.map((bill) => {
                const CategoryIcon = getCategoryIcon(bill.biller_category)
                return (
                  <div key={bill.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CategoryIcon className="w-5 h-5 text-primary-dark" />
                          <h3 className="text-lg font-medium text-gray-900">{bill.biller_name}</h3>
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getStatusColor(bill.status)
                          )}>
                            {getStatusIcon(bill.status)}
                            <span className="ml-1">{bill.status}</span>
                          </span>
                          {bill.is_recurring && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                              <Repeat className="w-3 h-3 mr-1" />
                              Recurring
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium">{formatCurrency(bill.amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-medium">{formatDate(bill.due_date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Account</p>
                            <p className="font-medium">{bill.account_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Category</p>
                            <p className="font-medium capitalize">{bill.biller_category.replace('_', ' ')}</p>
                          </div>
                        </div>

                        <div className="mt-4 text-sm text-gray-500">
                          <p>Added on {formatDate(bill.created_at)}</p>
                          {bill.paid_at && <p>Paid on {formatDate(bill.paid_at)}</p>}
                          {bill.is_recurring && bill.recurring_frequency && (
                            <p>Recurring: {bill.recurring_frequency}</p>
                          )}
                        </div>
                      </div>

                      <div className="ml-6 flex space-x-2">
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(bill)}
                          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="bg-red-100 text-red-700 px-3 py-2 rounded-md hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Bill</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Biller: <span className="font-medium">{selectedBill.biller_name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Amount: <span className="font-medium">{formatCurrency(selectedBill.amount)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="account_balance"
                      checked={paymentMethod === 'account_balance'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'account_balance' | 'virtual_card')}
                      className="h-4 w-4 text-primary-dark focus:ring-primary-dark border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Account Balance</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="virtual_card"
                      checked={paymentMethod === 'virtual_card'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'account_balance' | 'virtual_card')}
                      className="h-4 w-4 text-primary-dark focus:ring-primary-dark border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Virtual Card</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedBill(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={paying}
                  className="bg-primary-dark text-white px-4 py-2 rounded-md hover:bg-primary-dark/90 transition-colors disabled:opacity-50"
                >
                  {paying ? 'Processing...' : 'Pay Bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
} 