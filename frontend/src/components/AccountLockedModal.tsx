'use client'

import { useState } from 'react'
import { X, Lock, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { authAPI } from '@/lib/api'

interface AccountLockedModalProps {
  isOpen: boolean
  lockedUntil: string
  lockReason: string
  unlockRequestPending: boolean
  userEmail: string
  onClose: () => void
  onUnlockRequested: () => void
}

export default function AccountLockedModal({
  isOpen,
  lockedUntil,
  lockReason,
  unlockRequestPending,
  userEmail,
  onClose,
  onUnlockRequested
}: AccountLockedModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = () => {
    const now = new Date()
    const lockEnd = new Date(lockedUntil)
    const diff = lockEnd.getTime() - now.getTime()

    if (diff <= 0) return 'Lock has expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const handleRequestUnlock = async () => {
    if (!message.trim()) {
      setError('Please provide a reason for your unlock request')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await authAPI.requestAccountUnlock(userEmail, message.trim())

      setSuccess(true)
      setMessage('')
      onUnlockRequested()
      
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit unlock request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-background border border-border rounded-lg shadow-2xl p-6 m-4 max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Account Locked</h2>
            <p className="text-sm text-muted-foreground">Your account has been temporarily restricted</p>
          </div>
        </div>

        {/* Lock Details */}
        <div className="mb-6 space-y-4">
          {/* Warning - Keep Red */}
          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Reason for Lock:</p>
                <p className="text-red-800 dark:text-red-200">{lockReason}</p>
              </div>
            </div>
          </div>

          {/* Duration - Use App Colors */}
          <div className="p-4 bg-muted border border-border rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Lock Duration:</p>
                <p className="text-muted-foreground mb-2">
                  Locked until: <span className="font-medium text-foreground">{formatDate(lockedUntil)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Time remaining: <span className="font-medium text-foreground">{getTimeRemaining()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unlock Request Section */}
        {!unlockRequestPending && !success && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Request Early Unlock</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you believe this lock was made in error or you'd like to appeal, please explain your situation below:
            </p>
            
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain why you're requesting an early unlock..."
              className="w-full mb-3"
              rows={4}
              disabled={isSubmitting}
            />

            {error && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <Button
              onClick={handleRequestUnlock}
              disabled={isSubmitting || !message.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Unlock Request'}
            </Button>
          </div>
        )}

        {unlockRequestPending && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Unlock Request Pending</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your unlock request has been submitted and is awaiting admin review. You'll be notified once a decision is made.
                </p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-xs">✓</span>
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100 mb-1">Request Submitted Successfully</p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  An administrator will review your request shortly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-muted border border-border rounded text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> While your account is locked, you have limited access to the platform. Most features are disabled until the lock expires or an administrator unlocks your account.
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
