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

  const handleApprove = async (transferId: number) => {
    setProcessingId(transferId)
    try {
      await adminAPI.approveTransfer(transferId, notes[transferId] || '')
      onUpdate()
    } catch (error) {
      console.error('Failed to approve transfer:', error)
      alert('Failed to approve transfer')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (transferId: number) => {
    const reason = notes[transferId] || prompt('Enter rejection reason:')
    if (!reason) return

    setProcessingId(transferId)
    try {
      await adminAPI.rejectTransfer(transferId, reason)
      onUpdate()
    } catch (error) {
      console.error('Failed to reject transfer:', error)
      alert('Failed to reject transfer')
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
  )
}
