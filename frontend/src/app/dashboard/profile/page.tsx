'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Edit,
  Check,
  X
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { User as UserType } from '@/types'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone_number: z.string().min(10, 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email address'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      phone_number: user?.phone_number || '',
      email: user?.email || '',
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone_number: user.phone_number,
        email: user.email,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile(data)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch (err: unknown) {
      // Generic error message
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    reset({
      full_name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      phone_number: user?.phone_number || '',
      email: user?.email || '',
    })
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account information and preferences.
            </p>
          </div>
          {!isEditing && !user?.is_account_locked && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
          {user?.is_account_locked && (
            <div className="text-sm text-gray-500 italic">
              Profile editing is disabled while your account is locked
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <X className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('full_name')}
                    type="text"
                    id="full_name"
                    disabled={!isEditing}
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.full_name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-primary-dark",
                      !isEditing && "bg-gray-50 dark:bg-gray-700 cursor-not-allowed text-gray-900 dark:text-gray-100"
                    )}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    disabled={!isEditing}
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-primary-dark",
                      !isEditing && "bg-gray-50 dark:bg-gray-700 cursor-not-allowed text-gray-900 dark:text-gray-100"
                    )}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('phone_number')}
                    type="tel"
                    id="phone_number"
                    disabled={!isEditing}
                    className={cn(
                      "block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent transition-colors",
                      errors.phone_number
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-primary-dark",
                      !isEditing && "bg-gray-50 dark:bg-gray-700 cursor-not-allowed text-gray-900 dark:text-gray-100"
                    )}
                    placeholder="Enter your phone number"
                  />
                </div>
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                )}
              </div>

              {/* Date of Birth (Read-only) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date of Birth
                </label>
                <div className="flex items-center space-x-3 p-3.5 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700/50">
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <Calendar className="h-5 w-5 text-primary-dark dark:text-primary-light" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold tracking-tight">
                      {user?.profile?.date_of_birth ? formatDate(user.profile.date_of_birth) : 'Not set'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Verification data • Permanent</p>
                  </div>
                </div>
              </div>

              {/* Gender (Read-only) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gender
                </label>
                <div className="flex items-center space-x-3 p-3.5 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700/50">
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <User className="h-5 w-5 text-primary-dark dark:text-primary-light" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold tracking-tight capitalize">
                      {user?.profile?.gender ? user.profile.gender.replace('_', ' ') : 'Not set'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Verification data • Permanent</p>
                  </div>
                </div>
              </div>

              {/* Location (Read-only) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <div className="flex items-center space-x-3 p-3.5 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700/50">
                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <MapPin className="h-5 w-5 text-primary-dark dark:text-primary-light" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold tracking-tight">
                      {user?.city && user?.state
                        ? `${user.city.split(',')[0].trim()}, ${user.state}`
                        : user?.city || user?.state || 'Not set'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Registered location • Permanent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Status
                  </label>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${user?.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Member Since
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-300">
                    {user?.date_joined ? formatDate(user.date_joined) : ''}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Login
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-300">
                    {user?.last_login ? formatDate(user.last_login) : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Type
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-300">PrimeTrust Banking</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
} 