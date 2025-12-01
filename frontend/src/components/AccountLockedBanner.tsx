'use client'

import { useState } from 'react'
import { AlertTriangle, Lock, Clock, MessageSquare } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface AccountLockedBannerProps {
  lockReason: string
  lockedUntil: string
  unlockRequestPending: boolean
  userEmail: string
  onUnlockRequested: () => void
}

export default function AccountLockedBanner({
  lockReason,
  lockedUntil,
  unlockRequestPending,
  userEmail,
  onUnlockRequested
}: AccountLockedBannerProps) {
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const getTimeRemaining = () => {
    const now = new Date()
    const lockEnd = new Date(lockedUntil)
    const diff = lockEnd.getTime() - now.getTime()

    if (diff <= 0) return 'Lock has expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const handleRequestUnlock = async () => {
    if (!message.trim()) {
      setError('Please provide a reason for your unlock request')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await axios.post(
        'http://localhost:8000/api/auth/request-unlock/',
        { 
          email: userEmail,
          message: message.trim() 
        }
      )

      setSuccess(true)
      setMessage('')
      setShowRequestForm(false)
      onUnlockRequested()
      
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit unlock request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="h-5 w-5 text-red-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Account Locked
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Reason:</span> {lockReason}
                </p>
                <p className="text-sm text-gray-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">Time remaining:</span> {getTimeRemaining()}
                </p>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Your account is temporarily restricted. Most features are disabled until the lock expires or is removed by an administrator.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              {!unlockRequestPending && !success && (
                <Button
                  onClick={() => setShowRequestForm(!showRequestForm)}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Request Unlock
                </Button>
              )}
              
              {unlockRequestPending && (
                <div className="px-3 py-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800 whitespace-nowrap">
                  ⏳ Request Pending
                </div>
              )}
              
              {success && (
                <div className="px-3 py-2 bg-green-100 border border-green-300 rounded text-xs text-green-800 whitespace-nowrap">
                  ✓ Request Submitted
                </div>
              )}
            </div>
          </div>

          {/* Request Form */}
          {showRequestForm && !unlockRequestPending && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Early Unlock</h4>
              <p className="text-xs text-gray-600 mb-3">
                Explain why you're requesting an early unlock. An administrator will review your request.
              </p>
              
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain your situation..."
                className="w-full mb-2"
                rows={3}
                disabled={isSubmitting}
              />

              {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleRequestUnlock}
                  disabled={isSubmitting || !message.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  onClick={() => {
                    setShowRequestForm(false)
                    setMessage('')
                    setError('')
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
