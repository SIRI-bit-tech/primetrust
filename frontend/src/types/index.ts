export interface User {
  id: number
  email: string
  full_name: string
  phone_number: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  state: string
  city: string
  is_active: boolean
  date_joined: string
  last_login: string
}

export interface Account {
  id: number
  user: User
  account_number: string
  balance: number
  account_type: 'checking' | 'savings'
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  sender: User
  recipient: User
  amount: number
  transaction_type: 'transfer' | 'deposit' | 'withdrawal'
  status: 'pending' | 'approved' | 'declined' | 'completed'
  description: string
  created_at: string
  updated_at: string
}

export interface VirtualCard {
  id: number
  user: User
  card_number: string
  cvv: string
  expiry_date: string
  card_type: 'visa' | 'mastercard'
  is_active: boolean
  created_at: string
}

export interface EmailVerification {
  id: number
  email: string
  code: string
  is_used: boolean
  created_at: string
  expires_at: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  full_name: string
  phone_number: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  state: string
  city: string
  email: string
  password: string
  confirm_password: string
}

export interface TransferData {
  recipient_email: string
  amount: number
  description: string
}

export interface USState {
  name: string
  abbreviation: string
}

export interface City {
  name: string
  state: string
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Loan {
  id: number
  user: User
  loan_type: 'personal' | 'business' | 'mortgage' | 'auto'
  amount: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  total_amount: number
  status: 'pending' | 'approved' | 'active' | 'paid' | 'defaulted'
  created_at: string
  approved_at?: string
  due_date?: string
  remaining_balance: number
}

export interface Investment {
  id: number
  user: User
  investment_type: 'stocks' | 'bonds' | 'mutual_funds' | 'etfs' | 'crypto'
  name: string
  symbol?: string
  amount_invested: number
  current_value: number
  profit_loss: number
  profit_loss_percentage: number
  status: 'active' | 'sold' | 'pending'
  created_at: string
  last_updated: string
}

export interface Bill {
  id: number
  user: User
  biller_name: string
  biller_category: 'utilities' | 'insurance' | 'subscription' | 'credit_card' | 'other'
  account_number: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  is_recurring: boolean
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly'
  created_at: string
  paid_at?: string
}

export interface LoanApplication {
  loan_type: 'personal' | 'business' | 'mortgage' | 'auto'
  amount: number
  purpose: string
  employment_status: 'employed' | 'self_employed' | 'unemployed'
  monthly_income: number
  credit_score?: number
}

export interface InvestmentPurchase {
  investment_type: 'stocks' | 'bonds' | 'mutual_funds' | 'etfs' | 'crypto'
  name: string
  symbol?: string
  amount: number
  quantity?: number
}

export interface BillPayment {
  bill_id: number
  amount: number
  payment_method: 'account_balance' | 'virtual_card'
}

export interface UserNotification {
  id: number
  notification_type: 'transaction' | 'security' | 'account' | 'investment' | 'loan' | 'bill' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  is_read: boolean
  is_sent: boolean
  data: Record<string, unknown>
  created_at: string
  read_at: string | null
  sent_at: string | null
  related_transaction?: number
  related_investment?: number
  related_bill?: number
  user?: number
} 