'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import AccountLockedModal from '@/components/AccountLockedModal'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountLocked, setAccountLocked] = useState(false)
  const [lockDetails, setLockDetails] = useState<{
    reason: string
    lockedUntil: string
    unlockRequestPending: boolean
  } | null>(null)
  const router = useRouter()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })



  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')
    setAccountLocked(false)

    try {
      const response = await login(data.email, data.password)

      // Check if 2FA is required
      if (response.requires_2fa) {
        router.push(`/two-factor-login?token=${response.temp_token}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const error = err as { 
        response?: { 
          data?: { 
            message?: string
            account_locked?: boolean
            lock_reason?: string
            locked_until?: string
            unlock_request_pending?: boolean
          }
          status?: number
        } 
      }
      
      // Check if account is locked
      if (error.response?.status === 403 && error.response?.data?.account_locked) {
        setAccountLocked(true)
        setLockDetails({
          reason: error.response.data.lock_reason || 'Account locked by administrator',
          lockedUntil: error.response.data.locked_until || '',
          unlockRequestPending: error.response.data.unlock_request_pending || false
        })
      } else {
        setError(error.response?.data?.message || 'Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left Section - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="text-white text-center max-w-md">
            
            {/* Brand Name */}
            <h1 className="text-5xl font-bold mb-4 tracking-wider">PRIMETRUST</h1>
            
            {/* Main Heading */}
            <h2 className="text-3xl font-bold mb-4">SECURE BANKING</h2>
            
            {/* Tagline */}
            <p className="text-xl mb-6 text-white/90">
              Where Your Financial Dreams Become Reality
            </p>
            
            {/* Description */}
            <p className="text-lg text-white/80 leading-relaxed">
              Experience modern banking with cutting-edge security and seamless transactions.
            </p>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Glassmorphism Login Card */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Form Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-white/80">Sign in to your PrimeTrust account</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-white/90">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-white/60" />
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                        errors.email && "border-red-400 focus:ring-red-400"
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-300 text-sm">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-white/90">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-white/60" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Enter your password"
                      className={cn(
                        "w-full pl-10 pr-12 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                        errors.password && "border-red-400 focus:ring-red-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white/80 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-300 text-sm">{errors.password.message}</p>
                  )}
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-white/80 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing In...' : 'SIGN IN'}
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-white/80 text-sm">
                  Are you new?{' '}
                  <Link 
                    href="/register" 
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Create an Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Locked Modal */}
      {accountLocked && lockDetails && (
        <AccountLockedModal
          isOpen={accountLocked}
          onClose={() => setAccountLocked(false)}
          email={getValues('email')}
          lockReason={lockDetails.reason}
          lockedUntil={lockDetails.lockedUntil}
          unlockRequestPending={lockDetails.unlockRequestPending}
        />
      )}
    </div>
  )
} 