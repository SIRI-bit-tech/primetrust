'use client'

import { useAuth } from '@/hooks/useAuth'
import AdminLayout from '@/components/AdminLayout'
import MaintenanceSettings from '@/components/admin/MaintenanceSettings'
import { AlertTriangle } from 'lucide-react'

export default function MaintenancePage() {
  const { user } = useAuth()

  if (!(user?.is_staff || user?.is_superuser)) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <MaintenanceSettings />
      </div>
    </AdminLayout>
  )
}
