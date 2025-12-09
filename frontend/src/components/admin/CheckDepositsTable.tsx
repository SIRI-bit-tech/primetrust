'use client'

import { useState } from 'react'
import { FileCheck, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { adminAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface CheckDeposit {
  id: number
  user: number
  user_name: string
  user_email: string
  check_number: string
  amount: string
  front_image: string
  back_image: string
  payer_name: string
  memo: string
  ocr_amount: string | null
  ocr_check_number: string | null
  ocr_confidence: number
  status: string
  status_display: string
  admin_notes: string
  hold_until: string | null
  admin_approved_by: number | null
  admin_approved_by_name: string | null
  admin_approved_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

interface CheckDepositsTableProps {
  deposits: CheckDeposit[]
  onRefresh: () => void
}

export default function CheckDepositsTable({ deposits, onRefresh }: CheckDepositsTableProps) {
  const { toast } = useToast()
  const [selectedDeposit, setSelectedDeposit] = useState<CheckDeposit | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [holdDays, setHoldDays] = useState('1')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    if (!selectedDeposit) return
    
    setLoading(true)
    try {
      await adminAPI.approveCheckDeposit(selectedDeposit.id, parseInt(holdDays), notes)
      toast({
        title: 'Check Deposit Approved',
        description: `Deposit of $${selectedDeposit.amount} approved with ${holdDays} day hold period.`,
      })
      setShowApproveModal(false)
      setNotes('')
      setHoldDays('1')
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.response?.data?.error || 'Failed to approve check deposit',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDeposit) return
    
    setLoading(true)
    try {
      await adminAPI.rejectCheckDeposit(selectedDeposit.id, notes)
      toast({
        title: 'Check Deposit Rejected',
        description: `Deposit of $${selectedDeposit.amount} has been rejected.`,
      })
      setShowRejectModal(false)
      setNotes('')
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Rejection Failed',
        description: error.response?.data?.error || 'Failed to reject check deposit',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedDeposit) return
    
    setLoading(true)
    try {
      await adminAPI.completeCheckDeposit(selectedDeposit.id)
      toast({
        title: 'Check Deposit Completed',
        description: `Deposit of $${selectedDeposit.amount} has been completed and funds added to user account.`,
      })
      setShowCompleteModal(false)
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Completion Failed',
        description: error.response?.data?.error || 'Failed to complete check deposit',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Check #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{deposit.id}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium">{deposit.user_name}</div>
                      <div className="text-muted-foreground text-xs">{deposit.user_email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">${deposit.amount}</td>
                  <td className="px-4 py-3 text-sm">{deposit.check_number || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{getStatusBadge(deposit.status)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDeposit(deposit)
                          setShowImageModal(true)
                        }}
                        className="p-1 hover:bg-muted rounded"
                        title="View Images"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {deposit.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedDeposit(deposit)
                              setShowApproveModal(true)
                            }}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded text-green-600"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDeposit(deposit)
                              setShowRejectModal(true)
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {deposit.status === 'approved' && (
                        <button
                          onClick={() => {
                            setSelectedDeposit(deposit)
                            setShowCompleteModal(true)
                          }}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                          title="Complete Now"
                          disabled={loading}
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Check Images - Deposit #{selectedDeposit.id}</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Front</h4>
                  <img 
                    src={selectedDeposit.front_image} 
                    alt="Check front" 
                    className="w-full border rounded"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Back</h4>
                  <img 
                    src={selectedDeposit.back_image} 
                    alt="Check back" 
                    className="w-full border rounded"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div><strong>Amount:</strong> ${selectedDeposit.amount}</div>
                <div><strong>Check Number:</strong> {selectedDeposit.check_number || 'N/A'}</div>
                <div><strong>Payer:</strong> {selectedDeposit.payer_name || 'N/A'}</div>
                <div><strong>Memo:</strong> {selectedDeposit.memo || 'N/A'}</div>
                {selectedDeposit.ocr_amount && (
                  <div><strong>OCR Amount:</strong> ${selectedDeposit.ocr_amount} (Confidence: {(selectedDeposit.ocr_confidence * 100).toFixed(0)}%)</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Approve Check Deposit</h3>
            
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Approve deposit of ${selectedDeposit.amount} from {selectedDeposit.user_name}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hold Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={holdDays}
                    onChange={(e) => setHoldDays(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Funds will be available after {holdDays} day(s)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    rows={3}
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setNotes('')
                  setHoldDays('1')
                }}
                className="px-4 py-2 border rounded-md hover:bg-muted"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Reject Check Deposit</h3>
            
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Reject deposit of ${selectedDeposit.amount} from {selectedDeposit.user_name}
              </p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Reason for rejection</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  rows={3}
                  placeholder="Explain why this deposit is being rejected..."
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setNotes('')
                }}
                className="px-4 py-2 border rounded-md hover:bg-muted"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={loading || !notes}
              >
                {loading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Complete Check Deposit</h3>
            
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Complete deposit of <strong>${selectedDeposit.amount}</strong> from {selectedDeposit.user_name} immediately?
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ This will bypass the hold period and add funds to the user's account immediately.
              </p>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-muted"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
