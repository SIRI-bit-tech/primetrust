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
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

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
    if (!user) {
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
      setError('Failed to set up transfer PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPinStrength = (pin: string) => {
    if (!pin || pin.length !== 4) return { strength: 'Weak', color: 'text-red-400', bg: 'bg-red-500/10' }

    const uniqueDigits = new Set(pin).size
    const hasConsecutive = /(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9))/.test(pin)
    const isCommon = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(pin)

    if (isCommon || hasConsecutive || uniqueDigits === 1) {
      return { strength: 'Weak', color: 'text-red-400', bg: 'bg-red-500/10' }
    } else if (uniqueDigits === 2) {
      return { strength: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    } else {
      return { strength: 'Strong', color: 'text-green-400', bg: 'bg-green-500/10' }
    }
  }

  const pinStrength = getPinStrength(watchedPin)

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Set Up Transfer PIN
            </h1>
            <p className="text-white/80">
              Create a 4-digit PIN for secure money transfers
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* PIN Input */}
            <div className="space-y-2">
              <label htmlFor="pin" className="block text-sm font-medium text-white/90">
                Transfer PIN
              </label>
              <div className="relative">
                <input
                  {...register('pin')}
                  type={showPin ? 'text' : 'password'}
                  id="pin"
                  placeholder="Enter 4-digit PIN"
                  className={cn(
                    "w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                    errors.pin && "border-red-400 focus:ring-red-400"
                  )}
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.pin && (
                <p className="text-sm text-red-300">{errors.pin.message}</p>
              )}
              {watchedPin && watchedPin.length === 4 && (
                <div className={`mt-2 px-3 py-2 rounded-lg ${pinStrength.bg} border border-white/10 flex items-center justify-between`}>
                  <span className="text-xs text-white/60 uppercase tracking-wider">Security Level</span>
                  <span className={`text-sm font-bold ${pinStrength.color}`}>
                    {pinStrength.strength}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm PIN Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPin" className="block text-sm font-medium text-white/90">
                Confirm PIN
              </label>
              <div className="relative">
                <input
                  {...register('confirmPin')}
                  type={showConfirmPin ? 'text' : 'password'}
                  id="confirmPin"
                  placeholder="Re-enter 4-digit PIN"
                  className={cn(
                    "w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                    errors.confirmPin && "border-red-400 focus:ring-red-400"
                  )}
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPin && (
                <p className="text-sm text-red-300">{errors.confirmPin.message}</p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
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
          <div className="mt-8 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Secure Banking Environment
          </p>
        </div>
      </div>
    </div>
  )
}
