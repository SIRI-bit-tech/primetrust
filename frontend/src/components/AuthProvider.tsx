'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')
      
      if (token && storedUser) {
        try {
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
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    await checkAuth()
  }

  const setUserFromTokens = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password })
      
      // Check if 2FA is required
      if (response.requires_2fa) {
        return { requires_2fa: true, temp_token: response.temp_token }
      }
      
      // Normal login flow
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
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
      // Always clear local storage and user state
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
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