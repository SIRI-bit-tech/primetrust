import { useState, useEffect, useCallback } from 'react'
import { notificationsAPI } from '@/lib/api'
import { UserNotification } from '@/types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await notificationsAPI.getNotifications()
      
      // Handle paginated response from Django REST Framework
      const notificationsArray = 'results' in data ? data.results : (Array.isArray(data) ? data : [])
      setNotifications(notificationsArray)
      setUnreadCount(notificationsArray.filter(n => !n.is_read).length)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Error loading notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead([notificationId])
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAsRead()
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [])

  // Real-time polling for new notifications
  useEffect(() => {
    // Initial load
    loadNotifications()

    // Set up polling every 60 seconds for new notifications (less aggressive)
    const interval = setInterval(() => {
      loadNotifications()
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    lastChecked
  }
} 