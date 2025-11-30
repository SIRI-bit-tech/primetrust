'use client'

import { useState } from 'react'
import { Check, X, Lock, Unlock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { User } from '@/types'
import { adminAPI } from '@/lib/api'

interface UnlockRequestsTableProps {
  users: User[]
  onUpdate: () => void
}

export default function UnlockRequestsTable({ users, onUpdate }: UnlockRequestsTableProps) {
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const handleApprove = async (userId: number) => {
    if (!confirm('Are you sure you want to unlock this account?')) return

    setProcessingId(userId)
    try {
      await adminAPI.approveUnlockRequest(userId)
      onUpdate()
    } catch (error) {
      console.error('Failed to approve unlock:', error)
      alert('Failed to approve unlock request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (userId: number) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    setProcessingId(userId)
    try {
      await adminAPI.rejectUnlockRequest(userId, reason)
      onUpdate()
    } catch (error) {
      console.error('Failed to reject unlock:', error)
      alert('Failed to reject unlock request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg">
        <Unlock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-300">No pending unlock requests</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-gray-800 rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-700 border-b border-gray-600">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Lock Reason</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Locked Until</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Requested</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {users.map((user) => (
            <>
              <tr key={user.id} className="hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-gray-300">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-white">{user.account_lock_reason || 'No reason provided'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {formatDate(user.account_locked_until || undefined)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {formatDate(user.unlock_request_submitted_at || undefined)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.unlock_request_message && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      disabled={processingId === user.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(user.id)}
                      disabled={processingId === user.id}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
              {expandedId === user.id && user.unlock_request_message && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 bg-gray-700">
                    <div className="p-4 bg-gray-600 border border-gray-500 rounded-lg">
                      <p className="text-sm font-semibold text-gray-200 mb-2">User's Message:</p>
                      <p className="text-sm text-white">{user.unlock_request_message}</p>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
