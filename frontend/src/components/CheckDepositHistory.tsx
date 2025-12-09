'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, DollarSign, FileCheck, Eye } from 'lucide-react'
import { bankingAPI } from '@/lib/api'
import { CheckDeposit } from '@/types'
import { formatCurrency } from '@/lib/utils'

export default function CheckDepositHistory() {
  const [deposits, setDeposits] = useState<CheckDeposit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDeposits()

    // Listen for real-time check deposit updates
    const handleCheckDepositUpdate = () => {
      fetchDeposits()
    }

    window.addEventListener('check-deposit-updated', handleCheckDepositUpdate as EventListener)

    return () => {
      window.removeEventListener('check-deposit-updated', handleCheckDepositUpdate as EventListener)
    }
  }, [])

  const fetchDeposits = async () => {
    try {
      setIsLoading(true)
      const data = await bankingAPI.getCheckDeposits()
      setDeposits(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Failed to fetch check deposits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (deposits.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCheck className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No check deposits yet</p>
          <p className="text-sm text-muted-foreground mt-1">Your check deposit history will appear here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {deposits.map((deposit) => (
        <Card key={deposit.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">Check Deposit</h3>
                    <Badge className={getStatusColor(deposit.status)}>
                      {deposit.status_display || deposit.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {deposit.payer_name && (
                      <p>From: {deposit.payer_name}</p>
                    )}
                    {deposit.check_number && (
                      <p>Check #: {deposit.check_number}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(deposit.created_at).toLocaleDateString()}</span>
                    </div>
                    {deposit.hold_until && deposit.status === 'approved' && (
                      <p className="text-yellow-600 dark:text-yellow-400">
                        Funds available: {new Date(deposit.hold_until).toLocaleDateString()}
                      </p>
                    )}
                    {deposit.admin_notes && (
                      <p className="text-xs mt-2 p-2 bg-muted rounded">
                        Note: {deposit.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(deposit.amount)}
                </p>
                {deposit.front_image && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(deposit.front_image, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Check
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
