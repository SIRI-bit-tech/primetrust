'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Shield, 
  Smartphone, 
  QrCode, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/lib/api'

const twoFactorInitiateSchema = z.object({
  // No fields needed for initiation
})

const twoFactorVerifySchema = z.object({
  code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits')
})

type TwoFactorVerifyForm = z.infer<typeof twoFactorVerifySchema>

export default function TwoFactorSetupPage() {
  const [step, setStep] = useState<'initiate' | 'verify'>('initiate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrData, setQrData] = useState<{
    qr_uri: string
    qr_code_image: string
    secret: string
    backup_codes: string[]
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const router = useRouter()
  const { user, refreshUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorVerifyForm>({
    resolver: zodResolver(twoFactorVerifySchema)
  })

  useEffect(() => {
    // Refresh user state to ensure we have the latest authentication
    // Token is in HTTP-only cookie
    if (!user) {
      refreshUser()
    }
  }, [user, refreshUser])

  useEffect(() => {
    if (user?.two_factor_setup_completed) {
      router.push('/transfer-pin-setup')
    }
  }, [user, router])

  const initiate2FA = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await authAPI.initiateTwoFactor()
      setQrData(response)
      setStep('verify')
    } catch (err: unknown) {
      // Generic error message to prevent information disclosure
      setError('Failed to initiate 2FA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verify2FA = async (data: TwoFactorVerifyForm) => {
    try {
      setLoading(true)
      setError('')
      
      // Check if we need to refresh user state
      // Token is in HTTP-only cookie
      if (!user) {
        await refreshUser()
      }
      
      await authAPI.verifyTwoFactor(data.code)
      
      // Force navigation to transfer PIN setup
      window.location.href = '/transfer-pin-setup'
    } catch (err: unknown) {
      // Generic error message to prevent information disclosure
      setError('Invalid verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    if (qrData?.secret) {
      await navigator.clipboard.writeText(qrData.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadBackupCodes = () => {
    if (qrData?.backup_codes) {
      const content = `PrimeTrust Backup Codes\n\nKeep these codes safe. You can use them to access your account if you lose your authenticator app.\n\n${qrData.backup_codes.join('\n')}\n\nGenerated on: ${new Date().toLocaleDateString()}`
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'primetrust-backup-codes.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    }
  }

  if (step === 'initiate') {
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
                Set Up Two-Factor Authentication
              </h1>
              <p className="text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    You&apos;ll need an authenticator app
                  </h3>
                  <p className="text-sm text-blue-800">
                    Download Google Authenticator, Authy, or any TOTP-compatible app on your phone.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={initiate2FA}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Progress Indicator */}
            <div className="mt-8">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Step 2 of 3: Two-Factor Authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Scan QR Code
            </h1>
            <p className="text-gray-600">
              Open your authenticator app and scan this QR code
            </p>
          </div>

          {/* QR Code */}
          {qrData?.qr_code_image && (
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img
                  src={qrData.qr_code_image}
                  alt="QR Code for authenticator app"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Manual Entry</h3>
            <p className="text-sm text-gray-600 mb-3">
              If QR code doesn&apos;t work, manually enter this code in your app:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-white px-4 py-3 rounded border-2 border-gray-200 text-base font-mono text-gray-900 font-semibold tracking-wider">
                {qrData?.secret}
              </code>
              <button
                onClick={copySecret}
                className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                {copied ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Backup Codes</h3>
            <p className="text-sm text-yellow-800 mb-3">
              Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {qrData?.backup_codes.map((code, index) => (
                <code key={index} className="bg-white px-3 py-2 rounded border border-yellow-200 text-base font-mono text-center font-semibold text-gray-900 tracking-wider">
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={downloadBackupCodes}
              className="flex items-center space-x-2 text-sm text-yellow-800 hover:text-yellow-900 transition-colors font-medium"
            >
              {downloaded ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download backup codes</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleSubmit(verify2FA)} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                {...register('code')}
                type="text"
                id="code"
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
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

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('initiate')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
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
            </div>
          </form>

          {/* Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              Step 2 of 3: Two-Factor Authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 