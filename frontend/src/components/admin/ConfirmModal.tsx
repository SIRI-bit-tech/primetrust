'use client'

import { useState } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  requireInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  onConfirm: (inputValue?: string) => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  variant = 'info',
  requireInput = false,
  inputLabel,
  inputPlaceholder,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (requireInput) {
      onConfirm(inputValue)
    } else {
      onConfirm()
    }
    setInputValue('')
  }

  const handleCancel = () => {
    setInputValue('')
    onCancel()
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
          iconBg: 'bg-red-100',
          confirmBtn: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          iconBg: 'bg-yellow-100',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-100',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleCancel}>
      <div className="relative w-full max-w-md bg-background border border-border rounded-lg shadow-2xl p-6 m-4"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 ${styles.iconBg} rounded-full flex-shrink-0`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>

        {/* Input Field (if required) */}
        {requireInput && (
          <div className="mb-4">
            {inputLabel && (
              <label className="block text-sm font-medium text-foreground mb-2">
                {inputLabel}
              </label>
            )}
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full"
              rows={3}
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleCancel}
            variant="outline"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={styles.confirmBtn}
            disabled={requireInput && !inputValue.trim()}
          >
            {confirmText}
          </Button>
        </div>

        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
