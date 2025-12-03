'use client'

import { useState } from 'react'
import { Check, X, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Transfer } from '@/types'
import { adminAPI } from '@/lib/api'

interface PendingTransfersTableProps {
  transfers: Transfer[]
  onUpdate: () => void
}

export default function PendingTransfersTable({ transfers, onUpdate }: PendingTransfersTableProps) {
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [notes, setNotes] = useState<{ [key: number]: string }>({})
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultType, setResultType] = useState<'success' | 'error'>('success')

  const handleApprove = async (transferId: number) => {
    setSelectedTransferId(transferId)
    setApprovalNotes('')
    setShowApproveModal(true)
  }

  const confirmApprove = async () => {
    if (!selectedTransferId) return
    
    setProcessingId(selectedTransferId)
    try {
      const response = await adminAPI.approveTransfer(selectedTransferId, approvalNotes)
      setShowApproveModal(false)
      setApprovalNotes('')
      setResultType('success')
      setResultMessage(response.message || 'Transfer approved and processed successfully')
      setShowResultModal(true)
      onUpdate()
    } catch (error: any) {
      console.error('Failed to approve transfer:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to approve transfer'
      setShowApproveModal(false)
      setResultType('error')
      setResultMessage(errorMessage)
      setShowResultModal(true)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (transferId: number) => {
    setSelectedTransferId(transferId)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const confirmReject = async () => {
    if (!selectedTransferId || !rejectionReason.trim()) {
      setResultType('error')
      setResultMessage('Please enter a rejection reason')
      setShowResultModal(true)
      return
    }

    setProcessingId(selectedTransferId)
    try {
      const response = await adminAPI.rejectTransfer(selectedTransferId, rejectionReason)
      setShowRejectModal(false)
      setRejectionReason('')
      setResultType('success')
      setResultMessage(response.message || 'Transfer rejected and refunded successfully')
      setShowResultModal(true)
      onUpdate()
    } catch (error: any) {
      console.error('Failed to reject transfer:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to reject transfer'
      setShowRejectModal(false)
      setResultType('error')
      setResultMessage(errorMessage)
      setShowResultModal(true)
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTimeRemaining = (scheduledTime: string) => {
    const now = new Date().getTime()
    const scheduled = new Date(scheduledTime).getTime()
    const diff = scheduled - now

    if (diff <= 0) return 'Ready to process'

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-300">No pending transfers</p>
      </div>
    )
  }

  return (
    <>
      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              {resultType === 'success' ? (
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {resultType === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
              {resultMessage}
            </p>
            <button
              onClick={() => setShowResultModal(false)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Approve Transfer
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to approve this transfer? The funds will be processed immediately.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={processingId !== null}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Reject Transfer
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please provide a reason for rejecting this transfer. The user will be refunded.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={4}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={processingId !== null || !rejectionReason.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-gray-800 rounded-lg">
        <table className="w-full">
        <thead className="bg-gray-700 border-b border-gray-600">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Sender</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Recipient</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Scheduled</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {transfers.map((transfer) => (
            <tr key={transfer.id} className="hover:bg-gray-700">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{transfer.sender_name}</p>
                  <p className="text-sm text-gray-300">{transfer.sender_email}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{transfer.recipient_name || 'External'}</p>
                  <p className="text-sm text-gray-300">{transfer.recipient_email}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="font-semibold text-white">{formatAmount(transfer.amount)}</span>
                </div>
                {transfer.description && (
                  <p className="text-xs text-gray-300 mt-1">{transfer.description}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  transfer.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                  transfer.status === 'processing' ? 'bg-blue-600 text-blue-100' :
                  'bg-gray-600 text-gray-100'
                }`}>
                  {transfer.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {transfer.scheduled_completion_time && (
                  <div>
                    <p className="text-sm text-white">{formatDate(transfer.scheduled_completion_time)}</p>
                    <p className="text-xs text-gray-300">{getTimeRemaining(transfer.scheduled_completion_time)}</p>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">
                {formatDate(transfer.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(transfer.id)}
                    disabled={processingId === transfer.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(transfer.id)}
                    disabled={processingId === transfer.id}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}
