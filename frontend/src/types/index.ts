export interface UserProfile {
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  employer: string
  job_title: string
  annual_income: number
  preferred_currency: string
  language: string
  timezone: string
  receive_email_notifications: boolean
  receive_sms_notifications: boolean
  receive_marketing_emails: boolean
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  date_joined: string
  last_login: string
  is_staff: boolean
  is_superuser: boolean
  balance?: number
  bitcoin_balance?: number
  two_factor_setup_completed?: boolean
  transfer_pin_setup_completed?: boolean
  is_account_locked?: boolean
  account_locked_until?: string | null
  account_lock_reason?: string
  unlock_request_pending?: boolean
  unlock_request_submitted_at?: string | null
  unlock_request_message?: string
}

export interface Account {
  id: number
  user: number
  account_number: string
  routing_number: string
  balance: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  user: number
  user_name?: string
  transaction_type: string
  amount: number
  description: string
  status: string
  created_at: string
  updated_at: string
}

export interface VirtualCard {
  id: number
  user: number
  user_email: string
  user_name: string
  application?: number
  card_number: string
  card_number_display: string
  cvv: string
  expiry_month: string
  expiry_year: string
  card_type: 'debit' | 'credit'
  status: 'active' | 'suspended' | 'cancelled' | 'expired'
  daily_limit: number
  monthly_limit: number
  current_daily_spent: number
  current_monthly_spent: number
  is_default: boolean
  is_expired: boolean
  created_at: string
  updated_at: string
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
  access_token: string
  refresh_token: string
  user: User
  requires_2fa?: boolean
  temp_token?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  first_name: string
  last_name: string
  username: string
  phone_number: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  address: string
  state: string
  city: string
  zip_code: string
  country: string
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
  user_name?: string
  loan_type: 'personal' | 'business' | 'mortgage' | 'auto'
  amount: number
  interest_rate: number
  term_months: number
  monthly_payment: number
  total_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'paid' | 'defaulted'
  purpose?: string
  created_at: string
  approved_at?: string
  disbursed_at?: string
  due_date?: string
  remaining_balance: number
}

export interface Investment {
  id: number
  user?: User
  user_name?: string
  investment_type: 'stocks' | 'bonds' | 'mutual_funds' | 'etfs' | 'crypto'
  name: string
  symbol?: string
  balance_source: 'fiat' | 'bitcoin'
  quantity: number
  price_per_unit: number
  amount_invested: number
  current_price_per_unit: number
  current_value: number
  profit_loss: number
  profit_loss_percentage: number
  status: 'active' | 'sold' | 'pending' | 'cancelled'
  created_at: string
  last_updated: string
  sold_at?: string | null
}

export interface Bill {
  id: number
  user: User
  user_name?: string
  biller_name: string
  biller_category: 'utilities' | 'insurance' | 'subscription' | 'credit_card' | 'other'
  bill_type?: string
  account_number: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  description?: string
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
  balance_source: 'fiat' | 'bitcoin'
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
  notification_type: 'transaction' | 'security' | 'account' | 'investment' | 'loan' | 'bill' | 'card_application' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  user_name?: string
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

export interface BitcoinBalance {
  id: number
  user: number
  balance: string
  created_at: string
  updated_at: string
}

export interface BitcoinPrice {
  price_usd: number
  price_change_24h: number
  price_change_percentage_24h: number
  last_updated: string
}

export interface BitcoinWallet {
  id: number
  user: string
  wallet_address: string
  qr_code_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IncomingBitcoinTransaction {
  id: number
  user: string
  transaction_hash: string
  amount_btc: string
  amount_usd: string
  sender_address: string
  status: 'pending' | 'confirmed' | 'completed' | 'failed'
  status_display: string
  confirmation_count: number
  required_confirmations: number
  block_height: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
  admin_notes: string
  is_manually_approved: boolean
}

export interface CurrencySwap {
  id: number
  user: number
  user_name?: string
  swap_type: 'usd_to_btc' | 'btc_to_usd'
  swap_type_display: string
  currency_from?: string
  currency_to?: string
  amount_from: string | number
  amount_to: string | number
  exchange_rate: string | number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  status_display: string
  created_at: string
  updated_at: string
  completed_at: string | null
  transaction_id: string
}

export interface Notification {
  id: number
  user: number
  title: string
  message: string
  notification_type: string
  is_read: boolean
  created_at: string
  data: Record<string, unknown>
}

export interface CardApplication {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  card_type: 'debit' | 'credit';
  reason?: string;
  preferred_daily_limit?: number;
  preferred_monthly_limit?: number;
  status: 'processing' | 'approved' | 'declined' | 'completed';
  status_display: string;
  admin_notes?: string;
  estimated_completion_date?: string;
  estimated_completion_days?: number;
  processed_by?: number;
  processed_by_name?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemStatus {
  id: number
  component: string
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'
  message: string
  response_time: number
  uptime_percentage: number
  error_count: number
  request_count: number
  last_check: string
  created_at: string
}

export interface BitcoinTransaction {
  id: number
  user: number
  user_name?: string
  transaction_type: 'incoming' | 'outgoing'
  amount: number
  bitcoin_address: string
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  created_at: string
}

export interface SecurityAuditLog {
  id: number
  user: number
  user_name?: string
  event_type: string
  description: string
  ip_address: string
  user_agent: string
  created_at: string
}

export interface SystemStatusResponse {
  overall_status: string
  components: SystemStatus[]
  last_updated: string
}

export interface AdminDashboardData {
  users?: {
    total: number
    active: number
  }
  transactions?: {
    total: number
    pending: number
  }
  cards?: {
    total: number
    active: number
  }
  applications?: {
    total: number
    pending: number
  }
}

// Check Deposit
export interface CheckDeposit {
  id: number
  user: number
  user_email: string
  user_name: string
  check_number: string
  amount: number
  front_image: string
  back_image: string
  payer_name: string
  memo: string
  ocr_amount: number | null
  ocr_check_number: string
  ocr_confidence: number
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed'
  status_display: string
  admin_notes: string
  hold_until: string | null
  admin_approved_by: number | null
  admin_approved_by_name: string | null
  admin_approved_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CheckDepositCreate {
  check_number: string
  amount: number
  front_image: File
  back_image: File
  payer_name: string
  memo: string
}

export interface OCRExtractResponse {
  amount: number | null
  check_number: string | null
  confidence: number
  message: string
}

export type TableItem = 
  | User 
  | Transaction 
  | VirtualCard 
  | CardApplication 
  | UserNotification 
  | SystemStatus 
  | CurrencySwap 
  | BitcoinTransaction 
  | Loan 
  | Bill 
  | Investment 
  | SecurityAuditLog 
  | CheckDeposit 


// Transfer with approval fields
export interface Transfer {
  id: number
  sender: number
  sender_email: string
  sender_name: string
  recipient: number | null
  recipient_name: string | null
  recipient_email: string
  amount: number
  currency: string
  transfer_type: 'internal' | 'external' | 'instant'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  reference_number: string
  description: string
  fee: number
  requires_admin_approval: boolean
  admin_approved: boolean
  admin_approved_by: number | null
  admin_approved_by_name: string | null
  admin_approved_at: string | null
  admin_notes: string
  scheduled_completion_time: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Unlock request interface
export interface UnlockRequest {
  id: number
  email: string
  first_name: string
  last_name: string
  account_locked_until: string
  account_lock_reason: string
  unlock_request_pending: boolean
  unlock_request_submitted_at: string
  unlock_request_message: string
}

// Account lock status
export interface AccountLockStatus {
  is_locked: boolean
  locked_until: string | null
  lock_reason: string | null
  unlock_request_pending: boolean
  unlock_request_submitted_at: string | null
}

// Transfer types
export type TransferType = 'internal' | 'ach' | 'wire_domestic' | 'wire_international'

// Beneficiary transfer types (excludes 'internal' as beneficiaries are only for external transfers)
export type BeneficiaryTransferType = 'ach' | 'wire_domestic' | 'wire_international'

// External bank account
export interface ExternalBankAccount {
  id: number
  user: number
  account_holder_name: string
  account_number: string
  routing_number: string
  account_type: 'checking' | 'savings'
  bank_name: string
  bank_address?: string
  is_verified: boolean
  is_default: boolean
  nickname?: string
  created_at: string
  updated_at: string
}

// Bank lookup response
export interface BankLookupResponse {
  is_valid: boolean
  message: string
  routing_number?: string
  note?: string
}

// Transfer fee info
export interface TransferFeeInfo {
  transfer_type: TransferType
  base_fee: number
  percentage_fee: number
  total_fee: number
  estimated_completion: string
  processing_time: string
}

// ACH Transfer
export interface ACHTransferData {
  recipient_account_id?: number
  recipient_name: string
  account_number: string
  routing_number: string
  account_type: 'checking' | 'savings'
  amount: number
  description: string
  save_recipient?: boolean
  recipient_nickname?: string
}

// Wire Transfer (Domestic)
export interface WireTransferData {
  recipient_name: string
  account_number: string
  routing_number: string
  bank_name: string
  bank_address: string
  amount: number
  description: string
  reference?: string
  save_recipient?: boolean
  recipient_nickname?: string
}

// Wire Transfer (International)
export interface InternationalWireTransferData {
  recipient_name: string
  recipient_address: string
  recipient_city: string
  recipient_country: string
  iban?: string
  swift_code: string
  bank_name: string
  bank_address: string
  amount: number
  currency: string
  description: string
  purpose: string
  save_recipient?: boolean
  recipient_nickname?: string
}

// Saved beneficiary
export interface SavedBeneficiary {
  id: number
  user: number
  nickname: string
  transfer_type: BeneficiaryTransferType
  recipient_name: string
  account_number?: string
  routing_number?: string
  iban?: string
  swift_code?: string
  bank_name: string
  account_type?: 'checking' | 'savings'
  created_at: string
  last_used: string | null
}

// Receipt data
export interface ReceiptData {
  type: 'transfer' | 'bitcoin'
  status: 'completed' | 'pending' | 'failed'
  amount: number
  currency?: string
  btcAmount?: number
  usdAmount?: number
  sender: string
  recipient: string
  recipientWallet?: string
  senderWallet?: string
  transferType?: string
  date: string
  referenceId: string
  networkFee?: number
  transactionHash?: string
}
