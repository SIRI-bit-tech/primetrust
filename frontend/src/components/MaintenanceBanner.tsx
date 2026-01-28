'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { AlertTriangle, Wrench, Clock } from 'lucide-react'

interface MaintenanceStatus {
  is_active: boolean
  start_date: string | null
  end_date: string | null
  message: string
  estimated_duration: string
  is_within_maintenance: boolean
}

export default function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await api.get('maintenance/maintenance/status/')
        setMaintenance(response.data)
        setShowBanner(response.data.is_active && response.data.is_within_maintenance)
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenanceStatus()

    // Poll for maintenance status every 5 minutes
    const interval = setInterval(fetchMaintenanceStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !showBanner || !maintenance) {
    return null
  }

  const tickerText = `⚠️ Bank Maintenance in Progress • ${maintenance.message} • Duration: ${maintenance.estimated_duration} • All transactions will be on hold • `

  return (
    <div className="sticky top-0 left-0 right-0 z-40 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md h-8 flex items-center overflow-hidden">
      <style>{`
        @keyframes scroll-ticker {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .ticker-scroll {
          animation: scroll-ticker 20s linear infinite;
          white-space: nowrap;
          display: inline-block;
        }
      `}</style>
      
      <div className="flex items-center gap-2 px-4 w-full">
        <Wrench className="w-4 h-4 flex-shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll text-sm font-medium">
            {tickerText}
            {tickerText}
          </div>
        </div>
      </div>
    </div>
  )
}
