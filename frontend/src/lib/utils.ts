import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return ''
  const lastFour = cardNumber.slice(-4)
  const masked = '*'.repeat(cardNumber.length - 4)
  return `${masked}${lastFour}`
}
