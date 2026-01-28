'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Save, Loader2, Wrench, Info } from 'lucide-react'
import api from '@/lib/api'

interface MaintenanceData {
  is_active: boolean
  start_date: string
  end_date: string
  message: string
  estimated_duration: string
}

export default function MaintenanceSettings() {
  const [maintenance, setMaintenance] = useState<MaintenanceData>({
    is_active: false,
    start_date: '',
    end_date: '',
    message: 'The bank is currently under maintenance. All transactions will be on hold during this period.',
    estimated_duration: '7-14 days'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const response = await api.get('maintenance/maintenance/status/')
        setMaintenance({
          ...response.data,
          start_date: response.data.start_date || '',
          end_date: response.data.end_date || ''
        })
        setError('')
      } catch (err) {
        console.error('Maintenance API Error:', err)
        setError('Failed to load maintenance settings. Please ensure the maintenance module is properly installed.')
        setMaintenance({
          is_active: false,
          start_date: '',
          end_date: '',
          message: 'The bank is currently under maintenance. All transactions will be on hold during this period.',
          estimated_duration: '7-14 days'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenance()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setMaintenance(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else {
      setMaintenance(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      await api.post('maintenance/maintenance/update_maintenance/', maintenance)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save maintenance settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await api.post('maintenance/maintenance/toggle/')
      setMaintenance(response.data)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle maintenance mode')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-300">Loading maintenance settings...</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/50 rounded-lg">
            <Wrench className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white">Maintenance Mode</h2>
        </div>
        <div className={`px-6 py-2 rounded-full font-bold text-white ${
          maintenance.is_active ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {maintenance.is_active ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-300">Error</p>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-900/30 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-green-300">Settings saved successfully!</p>
        </div>
      )}

      <div className="mb-8 p-6 bg-blue-900/30 rounded-lg border-2 border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Activate Maintenance Mode</h3>
            <p className="text-gray-300">
              When enabled, all new transactions will be placed on hold and a banner will be shown to users.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-bold text-white transition-all whitespace-nowrap ml-4 ${
              maintenance.is_active
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            ) : null}
            {maintenance.is_active ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Start Date & Time
          </label>
          <input
            type="datetime-local"
            name="start_date"
            value={maintenance.start_date}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition"
          />
          <p className="text-xs text-gray-400 mt-1">When the maintenance period starts</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            End Date & Time (Expected)
          </label>
          <input
            type="datetime-local"
            name="end_date"
            value={maintenance.end_date}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition"
          />
          <p className="text-xs text-gray-400 mt-1">When you expect the maintenance to end</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Estimated Duration
          </label>
          <input
            type="text"
            name="estimated_duration"
            value={maintenance.estimated_duration}
            onChange={handleChange}
            placeholder="e.g., 7-14 days"
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition"
          />
          <p className="text-xs text-gray-400 mt-1">How long you expect the maintenance to take</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Message for Users
          </label>
          <textarea
            name="message"
            value={maintenance.message}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">This message will be displayed on the user dashboard banner</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  )
}
