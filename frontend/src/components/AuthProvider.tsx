'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, RegisterData } from '@/types'
import { authAPI } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ requires_2fa?: boolean; temp_token?: string }>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  setUserFromTokens: (accessToken: string, refreshToken: string, userData: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  // Listen for WebSocket events to refresh user data
  useEffect(() => {
    const handleRefreshUser = () => {
      refreshUser()
    }

    window.addEventListener('refresh-user-data', handleRefreshUser)

    return () => {
      window.removeEventListener('refresh-user-data', handleRefreshUser)
    }
  }, [])

  // Polling disabled - causes page reloads
  // User can manually refresh or lock status will update on next login
  // useEffect(() => {
  //   if (pollingIntervalRef.current) {
  //     clearInterval(pollingIntervalRef.current)
  //     pollingIntervalRef.current = null
  //   }
  //   if (user?.id) {
  //     pollingIntervalRef.current = setInterval(() => {
  //       refreshUser()
  //     }, 15000)
  //   }
  //   return () => {
  //     if (pollingIntervalRef.current) {
  //       clearInterval(pollingIntervalRef.current)
  //     }
  //   }
  // }, [user?.id])

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('user')

      if (storedUser) {
        try {
          // Try to fetch fresh user data (token is in cookie)
          const userData = await authAPI.getProfile()
          setUser(userData)
        } catch {
          // If API call fails, try to use stored user data
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
        }
      } else {
        setUser(null)
      }
    } catch {
      // Clear user data (tokens are in cookies, managed by backend)
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    try {
      // Token is in HTTP-only cookie, just fetch user data
      const userData = await authAPI.getProfile()
      // Only update if data actually changed to prevent unnecessary re-renders
      if (JSON.stringify(userData) !== JSON.stringify(user)) {
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const setUserFromTokens = (accessToken: string, refreshToken: string, userData: User) => {
    // Tokens are now in HTTP-only cookies, but we store them in session storage as fallback
    if (accessToken) sessionStorage.setItem('access_token', accessToken)
    if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken)

    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    // Clear temp token after successful 2FA
    sessionStorage.removeItem('temp_2fa_token')
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password })

      // Check if 2FA is required
      if (response.requires_2fa) {
        // Store temp token in session storage as fallback for cookie-blocked environments
        if (response.temp_token) {
          sessionStorage.setItem('temp_2fa_token', response.temp_token)
        }
        return { requires_2fa: true, temp_token: response.temp_token }
      }

      // Normal login flow - tokens are in HTTP-only cookies
      // We also store them as fallbacks
      if (response.access_token) sessionStorage.setItem('access_token', response.access_token)
      if (response.refresh_token) sessionStorage.setItem('refresh_token', response.refresh_token)

      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)

      return { requires_2fa: false }
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      await authAPI.register(data)
      // Store email for verification page
      localStorage.setItem('pending_verification_email', data.email)
      // Don't set user as logged in until email is verified
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if backend call fails
    } finally {
      // Clear user data (tokens are in cookies, cleared by backend)
      localStorage.removeItem('user')
      setUser(null)
      // Redirect to login page
      window.location.href = '/login'
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await authAPI.updateProfile(data)
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refreshUser, setUserFromTokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 