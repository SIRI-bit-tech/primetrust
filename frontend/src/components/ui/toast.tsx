'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  onClose: () => void;
}

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const variantStyles = {
    default: 'bg-green-50 border-green-200 text-green-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 border rounded-lg shadow-lg max-w-sm ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm mt-1">{description}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: any[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
} 