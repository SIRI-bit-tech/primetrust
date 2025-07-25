import { type ClassValue, clsx } from "clsx"
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

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateAccountNumber(): string {
  return Math.random().toString().slice(2, 12)
}

export function generateCardNumber(): string {
  const digits = '0123456789'
  let cardNumber = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) cardNumber += ' '
    cardNumber += digits[Math.floor(Math.random() * digits.length)]
  }
  return cardNumber
}

export function generateCVV(): string {
  return Math.random().toString().slice(2, 5)
}

export function maskCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})/, '$1 **** **** $4')
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/
  return phoneRegex.test(phone)
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
} 