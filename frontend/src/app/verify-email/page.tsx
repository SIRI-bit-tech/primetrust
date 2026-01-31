'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

const verificationSchema = z.object({
  code: z.string().length(6, 'Please enter the 6-digit verification code'),
})

type VerificationFormData = z.infer<typeof verificationSchema>

function VerifyEmailContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  })

  useEffect(() => {
    // Get email/code from URL params or localStorage
    const emailParam = searchParams.get('email')
    const codeParam = searchParams.get('code')
    const storedEmail = localStorage.getItem('pending_verification_email')

    if (emailParam) {
      setEmail(emailParam)
    } else if (storedEmail) {
      setEmail(storedEmail)
    }

    if (codeParam) {
      setValue('code', codeParam)
    }
  }, [searchParams, setValue])

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

      // Store user data and tokens (tokens are in cookies, but we update sessionStorage as fallback)
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
        if (response.access_token) sessionStorage.setItem('access_token', response.access_token)
        if (response.refresh_token) sessionStorage.setItem('refresh_token', response.refresh_token)

        // Force a page reload to ensure AuthProvider picks up the new user state
        setTimeout(() => {
          window.location.href = '/two-factor-setup'
        }, 2000)
      } else {
        // Fallback to router.push if no tokens
        setTimeout(() => {
          router.push('/two-factor-setup')
        }, 2000)
      }
    } catch (err: unknown) {
      // Generic error message to prevent information disclosure
      setError('Verification failed. Please check your code and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    if (countdown > 0) return

    try {
      await authAPI.resendVerification(email)
      setCountdown(60) // Start 60-second countdown
      setError('')
      // Show success message or toast (optional, for now just clearing error)
    } catch {
      setError('Failed to resend code. Please try again.')
    }
  }

  if (success) {
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

        <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl max-w-md w-full text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Email Verified!</h1>
          <p className="text-white/80 mb-8 text-lg">
            Your email has been successfully verified. Redirecting to security setup...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

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
        {/* Back to Home */}
        <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Verification Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
            <p className="text-white/80">
              We&apos;ve sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-white mt-1 block">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl flex items-center animate-in slide-in-from-top-2 duration-300">
              <XCircle className="w-5 h-5 text-red-300 mr-2 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Verification Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-white/90 mb-2">
                Verification Code
              </label>
              <input
                {...register('code')}
                type="text"
                id="code"
                maxLength={6}
                className={cn(
                  "block w-full py-4 px-4 bg-white/20 border border-white/30 rounded-xl text-center text-3xl font-mono tracking-[0.5em] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                  errors.code && "border-red-400 focus:ring-red-400"
                )}
                placeholder="000000"
                autoComplete="one-time-code"
              />
              {errors.code && (
                <p className="mt-2 text-sm text-red-300 text-center">{errors.code.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-blue-500/25"
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
          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <p className="text-white/60 text-sm mb-3">
              Didn&apos;t receive the code?
            </p>
            <button
              onClick={resendCode}
              disabled={countdown > 0}
              className={cn(
                "text-blue-300 hover:text-blue-200 font-semibold transition-colors text-sm",
                countdown > 0 && "opacity-50 cursor-not-allowed text-white/50"
              )}
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Verification Code'}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
          <p className="text-white/40 text-xs">
            Secured by PrimeTrust Banking Protection
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
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
        <div className="relative z-10 animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
