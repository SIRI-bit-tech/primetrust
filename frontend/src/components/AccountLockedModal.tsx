'use client'

import { useState } from 'react'
import { X, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { authAPI } from '@/lib/api'

interface AccountLockedModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  lockReason: string
  lockedUntil: string
  unlockRequestPending: boolean
}

export default function AccountLockedModal({
  isOpen,
  onClose,
  email,
  lockReason,
  lockedUntil,
  unlockRequestPending: initialUnlockRequestPending
}: AccountLockedModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unlockRequestPending, setUnlockRequestPending] = useState(initialUnlockRequestPending)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleSubmitUnlockRequest = async () => {
    if (!message.trim()) {
      setError('Please provide a message explaining why your account should be unlocked')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await authAPI.requestAccountUnlock(email, message)
      setSuccess(response.message)
      setUnlockRequestPending(true)
      setMessage('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to submit unlock request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6 m-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

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

        {/* Lock details */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Reason:</p>
              <p className="text-red-800">{lockReason}</p>
            </div>
          </div>
          <div className="mt-3 text-sm text-red-700">
            <p><strong>Locked until:</strong> {formatDate(lockedUntil)}</p>
          </div>
        </div>

        {/* Unlock request section */}
        {unlockRequestPending ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 font-semibold mb-1">Unlock Request Pending</p>
            <p className="text-sm text-blue-700">
              Your unlock request has been submitted and is awaiting admin approval. 
              You will be notified once a decision has been made.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Request Account Unlock</h3>
            <p className="text-sm text-gray-600 mb-3">
              If you believe your account was locked in error, you can request an unlock. 
              Please explain why your account should be unlocked.
            </p>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Unlock Request'}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            For immediate assistance, please contact support at support@primetrust.com
          </p>
        </div>
      </div>
    </div>
  )
}
