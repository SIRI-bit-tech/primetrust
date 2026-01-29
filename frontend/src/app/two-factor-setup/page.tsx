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
  RefreshCw,
  Lock
} from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { authAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

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
      setError('Failed to initiate 2FA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verify2FA = async (data: TwoFactorVerifyForm) => {
    try {
      setLoading(true)
      setError('')

      if (!user) {
        await refreshUser()
      }

      await authAPI.verifyTwoFactor(data.code)

      // Force navigation to transfer PIN setup
      window.location.href = '/transfer-pin-setup'
    } catch (err: unknown) {
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

      <div className="relative z-10 w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 'initiate' ? (
                <Shield className="w-8 h-8 text-blue-300" />
              ) : (
                <QrCode className="w-8 h-8 text-blue-300" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 'initiate' ? 'Two-Factor Authentication' : 'Scan QR Code'}
            </h1>
            <p className="text-white/80">
              {step === 'initiate'
                ? 'Add an extra layer of security to your account'
                : 'Open your authenticator app and scan this QR code'}
            </p>
          </div>

          {step === 'initiate' ? (
            <>
              {/* Instructions */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Smartphone className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Authenticator App Required
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Download Google Authenticator, Authy, or any TOTP-compatible app on your phone to generate secure codes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                  <span className="text-red-200 text-sm">{error}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={initiate2FA}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <span>Continue Setup</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* QR Code Section */}
              {qrData?.qr_code_image && (
                <div className="text-center mb-8">
                  <div className="inline-block p-4 bg-white rounded-xl shadow-lg transform transition-transform hover:scale-[1.02] duration-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData.qr_code_image}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-white/90 mb-3 uppercase tracking-wider">Manual Entry Code</h3>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-black/20 border border-white/10 px-4 py-3 rounded-lg text-lg font-mono text-white/90 tracking-wider text-center select-all">
                    {qrData?.secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 rounded-lg transition-colors"
                  >
                    {copied ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              {/* Backup Codes */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-yellow-200 uppercase tracking-wider">Backup Codes</h3>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex items-center space-x-2 text-xs text-yellow-200 hover:text-white transition-colors bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/20"
                  >
                    {downloaded ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>Save Codes</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {qrData?.backup_codes.map((code, index) => (
                    <code key={index} className="bg-black/20 border border-white/5 px-2 py-1.5 rounded text-sm font-mono text-center text-white/80">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleSubmit(verify2FA)} className="space-y-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-white/90 mb-2">
                    Enter Verification Code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    id="code"
                    placeholder="000000"
                    className={cn(
                      "block w-full py-4 px-4 bg-white/20 border border-white/30 rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-200",
                      errors.code && "border-red-400 focus:ring-red-400"
                    )}
                    maxLength={6}
                  />
                  {errors.code && (
                    <p className="mt-2 text-sm text-red-300 text-center">{errors.code.message}</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-center">
                    <span className="text-red-200 text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('initiate')}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish Setup</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Progress Dots */}
          <div className="mt-8 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className={`w-2 h-2 rounded-full transition-colors ${step === 'verify' ? 'bg-blue-500' : 'bg-white/20'}`}></div>
            <div className="w-2 h-2 bg-white/20 rounded-full"></div>
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
