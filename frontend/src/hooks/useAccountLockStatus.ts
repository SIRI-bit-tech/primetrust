import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import axios from 'axios'

export function useAccountLockStatus() {
  const { user, refreshUser } = useAuth()
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    // Check immediately
    if (user?.is_account_locked) {
      setIsLocked(true)
    } else {
      setIsLocked(false)
    }

    // Poll every 10 seconds to check for lock status changes
    const interval = setInterval(async () => {
      try {
        await refreshUser()
      } catch (error) {
        console.error('Error refreshing user data:', error)
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [user?.is_account_locked, refreshUser])

  return {
    isLocked,
    lockReason: user?.account_lock_reason || '',
    lockedUntil: user?.account_locked_until || '',
    unlockRequestPending: user?.unlock_request_pending || false
  }
}
