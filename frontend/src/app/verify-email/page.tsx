'use client'

import { useState, useEffect } from 'react'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

const verificationSchema = z.object({
  code: z.string().length(6, 'Please enter the 6-digit verification code'),
})

type VerificationFormData = z.infer<typeof verificationSchema>

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  })

  useEffect(() => {
    // Get email from localStorage or URL params
    const storedEmail = localStorage.getItem('pending_verification_email')
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const onSubmit = async (data: VerificationFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await authAPI.verifyEmail(email, data.code)
      setSuccess(true)
      localStorage.removeItem('pending_verification_email')
      
      // Store authentication tokens
      if (response.access_token && response.refresh_token) {
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('refresh_token', response.refresh_token)
        localStorage.setItem('user', JSON.stringify(response.user))
      }
      
      // Redirect to 2FA setup after 2 seconds
      setTimeout(() => {
        router.push('/two-factor-setup')
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    if (countdown > 0) return

    try {
      // This would typically call an API to resend the verification code
      setCountdown(60) // Start 60-second countdown
      setError('')
    } catch {
      setError('Failed to resend code. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. Redirecting to security setup...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-dark mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-dark/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-dark" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">
              We&apos;ve sent a 6-digit verification code to{' '}
              <span className="font-semibold text-primary-dark">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center animate-in slide-in-from-top-2 duration-300">
              <XCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Verification Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                {...register('code')}
                type="text"
                id="code"
                maxLength={6}
                className={cn(
                  "block w-full py-3 px-4 border rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                  errors.code
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-primary-dark"
                )}
                placeholder="000000"
                autoComplete="one-time-code"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-dark to-primary-navy text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-2">
              Didn&apos;t receive the code?
            </p>
            <button
              onClick={resendCode}
              disabled={countdown > 0}
              className={cn(
                "text-primary-dark hover:text-primary-navy font-semibold transition-colors text-sm",
                countdown > 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your email inbox for the verification code</li>
              <li>• Enter the 6-digit code above</li>
              <li>• The code expires in 10 minutes</li>
              <li>• Check your spam folder if you don&apos;t see the email</li>
            </ul>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
          <p className="text-white/80 text-sm">
            This verification helps us keep your account secure.
          </p>
        </div>
      </div>
    </div>
  )
} 