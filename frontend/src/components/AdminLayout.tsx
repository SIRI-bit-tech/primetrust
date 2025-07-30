'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { adminAPI } from '@/lib/api'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  useEffect(() => {
    const checkAdminAccess = () => {
      // Check if user is authenticated from localStorage first
      const storedUser = localStorage.getItem('user')
      const accessToken = localStorage.getItem('access_token')
      
      if (!storedUser || !accessToken) {
        router.push('/admin/login')
        return
      }
      
      try {
        const userData = JSON.parse(storedUser)
        const hasAdminAccess = userData.is_staff || userData.is_superuser
        
        if (!hasAdminAccess) {
          // User is not admin, redirect to regular dashboard
          router.push('/dashboard')
          return
        }
        
        setIsAdmin(true)
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/admin/login')
        return
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    // Check admin access immediately, don't wait for useAuth loading
    checkAdminAccess()
  }, [router])

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">PrimeTrust Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                Welcome, {user?.first_name} {user?.last_name}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('access_token')
                  localStorage.removeItem('refresh_token')
                  localStorage.removeItem('user')
                  window.location.href = '/admin/login'
                }}
                className="text-sm text-red-400 hover:text-red-300 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
} 