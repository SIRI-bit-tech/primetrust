'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { authAPI } from '@/lib/api'

const twoFactorSchema = z.object({
  code: z.string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits')
})

type TwoFactorForm = z.infer<typeof twoFactorSchema>

export default function TwoFactorLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showBackupCode, setShowBackupCode] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tempToken = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TwoFactorForm>({
    resolver: zodResolver(twoFactorSchema)
  })

  const watchedCode = watch('code')

  useEffect(() => {
    if (!tempToken) {
      router.push('/login')
    }
  }, [tempToken, router])

  const onSubmit = async (data: TwoFactorForm) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await authAPI.verifyTwoFactorLogin(data.code, tempToken!)
      
      // Store tokens and user data
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupCodeSubmit = async (data: TwoFactorForm) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await authAPI.verifyTwoFactorLogin(data.code, tempToken!, true)
      
      // Store tokens and user data
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Invalid backup code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-gray-600">
              Enter the code from your authenticator app
            </p>
          </div>

          {/* Toggle between TOTP and Backup Code */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setUseBackupCode(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !useBackupCode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-4 h-4 inline mr-2" />
              Authenticator App
            </button>
            <button
              type="button"
              onClick={() => setUseBackupCode(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                useBackupCode 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              Backup Code
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {useBackupCode ? 'Backup Code' : 'Authenticator Code'}
                </h3>
                <p className="text-sm text-blue-800">
                  {useBackupCode 
                    ? 'Enter one of your backup codes to access your account.'
                    : 'Open your authenticator app and enter the 6-digit code.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(useBackupCode ? handleBackupCodeSubmit : onSubmit)} className="space-y-4">
            {/* Code Input */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {useBackupCode ? 'Backup Code' : 'Authentication Code'}
              </label>
              <div className="relative">
                <input
                  {...register('code')}
                  type={showBackupCode ? 'text' : 'password'}
                  id="code"
                  placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                  maxLength={useBackupCode ? 8 : 6}
                />
                {useBackupCode && (
                  <button
                    type="button"
                    onClick={() => setShowBackupCode(!showBackupCode)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showBackupCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                )}
              </div>
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
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
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {useBackupCode 
                ? 'Lost your backup codes? Contact support for assistance.'
                : 'Having trouble? Try using a backup code instead.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 