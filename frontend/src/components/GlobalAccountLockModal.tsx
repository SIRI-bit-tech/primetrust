'use client'

import { useState, useEffect } from 'react'
import { Lock, AlertTriangle, Clock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { authAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface LockDetails {
  reason: string
  lockedUntil: string
  unlockRequestPending: boolean
}

export default function GlobalAccountLockModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [lockDetails, setLockDetails] = useState<LockDetails | null>(null)
  const [unlockMessage, setUnlockMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [unlockRequestPending, setUnlockRequestPending] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleAccountLocked = (event: CustomEvent) => {
      setLockDetails(event.detail)
      setUnlockRequestPending(event.detail.unlockRequestPending)
      setIsOpen(true)
    }

    window.addEventListener('accountLocked', handleAccountLocked as EventListener)

    return () => {
      window.removeEventListener('accountLocked', handleAccountLocked as EventListener)
    }
  }, [])

  const handleSubmitUnlockRequest = async () => {
    if (!unlockMessage.trim()) {
      setError('Please provide a message explaining why your account should be unlocked')
      return
    }

    if (!user?.email) {
      setError('User email not found')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await authAPI.requestAccountUnlock(user.email, unlockMessage)
      setSuccess(response.message)
      setUnlockRequestPending(true)
      setUnlockMessage('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to submit unlock request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleString()
  }

  if (!isOpen || !lockDetails) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6 m-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Account Locked</h2>
            <p className="text-sm text-gray-500">Your account has been temporarily locked</p>
          </div>
        </div>

        {/* Lock Details */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Lock Reason:</p>
              <p className="text-sm text-red-800">{lockDetails.reason}</p>
            </div>
          </div>
          
          {lockDetails.lockedUntil && (
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Locked Until:</p>
                <p className="text-sm text-red-800">{formatDate(lockDetails.lockedUntil)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Unlock Request Section */}
        {unlockRequestPending ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Unlock Request Submitted</p>
                <p className="text-sm text-blue-800">
                  Your unlock request is being reviewed by an administrator. You will be notified once it is processed.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Request Account Unlock</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you believe your account was locked in error, you can request an unlock. 
              Please explain why your account should be unlocked.
            </p>
            
            <Textarea
              value={unlockMessage}
              onChange={(e) => setUnlockMessage(e.target.value)}
              placeholder="Explain why your account should be unlocked..."
              className="mb-3"
              rows={4}
            />

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                {success}
              </div>
            )}

            <Button
              onClick={handleSubmitUnlockRequest}
              disabled={isSubmitting || !unlockMessage.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Unlock Request'}
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            You cannot perform any actions while your account is locked. 
            Please wait for the lock to expire or request an unlock above.
          </p>
        </div>
      </div>
    </div>
  )
}