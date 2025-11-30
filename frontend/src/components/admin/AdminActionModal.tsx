'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AdminActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { [key: string]: string }) => void
  title: string
  description?: string
  fields: {
    name: string
    label: string
    type: 'text' | 'number' | 'textarea'
    placeholder?: string
    defaultValue?: string
    required?: boolean
  }[]
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export default function AdminActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  fields,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: AdminActionModalProps) {
  const [formData, setFormData] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const missingFields = fields.filter(field => field.required && !formData[field.name])
    if (missingFields.length > 0) {
      alert(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`)
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(formData)
      setFormData({})
      onClose()
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-6 m-4 border border-gray-700">
        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {description && (
            <p className="text-sm text-gray-300 mt-1">{description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name} className="text-gray-300">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  value={formData[field.name] || field.defaultValue || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  rows={4}
                  required={field.required}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type}
                  value={formData[field.name] || field.defaultValue || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  required={field.required}
                />
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              className={`flex-1 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : confirmText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
