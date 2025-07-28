import { useState } from 'react';

interface ToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  id?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const toast = (options: ToastOptions) => {
    const newToast = { ...options, id: Date.now() };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toast, toasts, removeToast };
} 