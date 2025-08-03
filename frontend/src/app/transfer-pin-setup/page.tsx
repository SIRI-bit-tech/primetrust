'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Lock, 
  Shield, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/lib/api'

const transferPinSchema = z.object({
  pin: z.string()
    .min(4, 'PIN must be 4 digits')
    .max(4, 'PIN must be 4 digits')
    .regex(/^\d+$/, 'PIN must contain only digits')
    .refine((pin) => {
      // Check for consecutive numbers
      for (let i = 0; i < pin.length - 1; i++) {
        if (parseInt(pin[i]) + 1 === parseInt(pin[i + 1])) {
          return false
        }
      }
      return true
    }, 'PIN cannot contain consecutive numbers')
    .refine((pin) => {
      // Check for repeated digits
      return new Set(pin).size > 1
    }, 'PIN cannot contain all identical digits')
    .refine((pin) => {
      // Check for common patterns
      const commonPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999']
      return !commonPins.includes(pin)
    }, 'PIN cannot be a common pattern'),
  confirmPin: z.string()
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"]
})

type TransferPinForm = z.infer<typeof transferPinSchema>

export default function TransferPinSetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)
  const router = useRouter()
  const { user, refreshUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TransferPinForm>({
    resolver: zodResolver(transferPinSchema)
  })

  const watchedPin = watch('pin')

  useEffect(() => {
    // Refresh user state to ensure we have the latest authentication
    const token = localStorage.getItem('access_token')
    if (token && !user) {
      refreshUser()
    }
  }, [user, refreshUser])

  useEffect(() => {
    
    // Only redirect to dashboard if user is loaded and PIN is already completed
    if (user && user.transfer_pin_setup_completed) {
      router.push('/dashboard')
    }
  }, [user, router])

  const onSubmit = async (data: TransferPinForm) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await authAPI.setupTransferPin(data.pin, data.confirmPin)
      
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to set up transfer PIN')
    } finally {
      setLoading(false)
    }
  }

  const getPinStrength = (pin: string) => {
    if (!pin || pin.length !== 4) return { strength: 'weak', color: 'text-red-600', bg: 'bg-red-100' }
    
    const uniqueDigits = new Set(pin).size
    const hasConsecutive = /(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9))/.test(pin)
    const isCommon = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(pin)
    
    if (isCommon || hasConsecutive || uniqueDigits === 1) {
      return { strength: 'weak', color: 'text-red-600', bg: 'bg-red-100' }
    } else if (uniqueDigits === 2) {
      return { strength: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    } else {
      return { strength: 'strong', color: 'text-green-600', bg: 'bg-green-100' }
    }
  }

  const pinStrength = getPinStrength(watchedPin)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Set Up Transfer PIN
            </h1>
            <p className="text-gray-600">
              Create a 4-digit PIN for secure money transfers
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* PIN Input */}
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Transfer PIN
              </label>
              <div className="relative">
                <input
                  {...register('pin')}
                  type={showPin ? 'text' : 'password'}
                  id="pin"
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.pin && (
                <p className="mt-1 text-sm text-red-600">{errors.pin.message}</p>
              )}
              {watchedPin && watchedPin.length === 4 && (
                <div className={`mt-2 px-3 py-2 rounded-lg ${pinStrength.bg}`}>
                  <p className={`text-sm font-medium ${pinStrength.color}`}>
                    PIN Strength: {pinStrength.strength.charAt(0).toUpperCase() + pinStrength.strength.slice(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm PIN Input */}
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <div className="relative">
                <input
                  {...register('confirmPin')}
                  type={showConfirmPin ? 'text' : 'password'}
                  id="confirmPin"
                  placeholder="Re-enter 4-digit PIN"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPin && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPin.message}</p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              Step 3 of 3: Transfer PIN Setup
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 