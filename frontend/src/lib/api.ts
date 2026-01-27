import axios from 'axios'
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Account,
  Transaction,
  VirtualCard,
  TransferData,
  Transfer,
  Loan,
  LoanApplication,
  Investment,
  InvestmentPurchase,
  Bill,
  BillPayment,
  UserNotification,
  BitcoinWallet,
  IncomingBitcoinTransaction,
  CurrencySwap,
  CardApplication
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Always send cookies
})

// Request interceptor - tokens are now sent automatically via cookies
api.interceptors.request.use(
  (config) => {
    // Ensure credentials are included to send cookies
    config.withCredentials = true
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Check for account lock (403 with account_locked flag)
    if (error.response?.status === 403 && error.response?.data?.account_locked) {
      // Dispatch a custom event to show account lock modal
      const lockEvent = new CustomEvent('accountLocked', {
        detail: {
          reason: error.response.data.lock_reason || 'Account locked by administrator',
          lockedUntil: error.response.data.locked_until || '',
          unlockRequestPending: error.response.data.unlock_request_pending || false
        }
      })
      window.dispatchEvent(lockEvent)

      return Promise.reject(error)
    }

    // Don't try to refresh tokens for public endpoints
    const publicEndpoints = ['/auth/register/', '/auth/login/', '/auth/verify-email/', '/auth/password-reset-request/', '/auth/password-reset/', '/auth/refresh/']
    const isPublicEndpoint = publicEndpoints.some(endpoint => originalRequest.url?.includes(endpoint))

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      originalRequest._retry = true

      try {
        // Refresh token is now in HTTP-only cookie, sent automatically
        await axios.post(`${API_BASE_URL}/auth/refresh/`, {}, {
          withCredentials: true
        })

        // Token is now in cookie, just retry the request
        return api(originalRequest)
      } catch (refreshError) {
        // Only redirect if we're not already on a login/auth page
        const currentPath = window.location.pathname
        const authPages = ['/login', '/register', '/verify-email', '/two-factor-login', '/two-factor-setup', '/transfer-pin-setup']
        const isAuthPage = authPages.some(page => currentPath.includes(page))

        if (!isAuthPage) {
          // Clear user data from localStorage (tokens are in cookies)
          localStorage.removeItem('user')

          // Check if we're on admin pages and redirect accordingly
          if (currentPath.includes('/admin')) {
            window.location.href = '/admin/login'
          } else {
            window.location.href = '/login'
          }
        }

        // If we're on an auth page, just reject the error without redirecting
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register/', data)
    return response.data
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login/', credentials)
    return response.data
  },

  verifyEmail: async (email: string, code: string): Promise<{ message: string; access_token?: string; refresh_token?: string; user?: User; next_step?: string }> => {
    const response = await api.post('/auth/verify-email/', { code })
    return response.data
  },

  logout: async (): Promise<void> => {
    // Tokens are in HTTP-only cookies, backend will clear them
    await api.post('/auth/logout/', {})
    localStorage.removeItem('user')
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile/')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch('/auth/update/', data)
    return response.data
  },

  // 2FA and Transfer PIN methods
  initiateTwoFactor: async (): Promise<{ qr_uri: string; qr_code_image: string; secret: string; backup_codes: string[] }> => {
    const response = await api.post('/auth/two-factor-initiate/')
    return response.data
  },

  verifyTwoFactor: async (code: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/two-factor-verify/', { code })
    return response.data
  },

  verifyTwoFactorLogin: async (code: string, isBackupCode = false): Promise<AuthResponse> => {
    // Temp token is now sent automatically via HTTP-only cookie
    const response = await api.post('/auth/two-factor-login-verify/',
      isBackupCode ? { backup_code: code } : { code }
    )
    return response.data
  },

  setupTransferPin: async (pin: string, confirmPin: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/transfer-pin-setup/', { pin, confirm_pin: confirmPin })
    return response.data
  },

  verifyTransferPin: async (pin: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/transfer-pin-verify/', { pin })
    return response.data
  },

  getRegistrationStatus: async (): Promise<{
    two_factor_setup_completed: boolean;
    transfer_pin_setup_completed: boolean;
    is_registration_complete: boolean;
  }> => {
    const response = await api.get('/auth/registration-status/')
    return response.data
  },

  // Account unlock
  requestAccountUnlock: async (email: string, message: string): Promise<{ message: string; status: string }> => {
    const response = await api.post('/auth/request-unlock/', { email, message })
    return response.data
  },

  checkAccountLockStatus: async (email: string): Promise<{
    is_locked: boolean
    locked_until: string | null
    lock_reason: string | null
    unlock_request_pending: boolean
    unlock_request_submitted_at: string | null
  }> => {
    const response = await api.post('/auth/check-lock-status/', { email })
    return response.data
  },
}

// Banking API
export const bankingAPI = {
  getBalance: async (): Promise<Account> => {
    const response = await api.get('/auth/account-info/')
    return response.data
  },

  getAccountInfo: async (): Promise<Account> => {
    const response = await api.get('/auth/account-info/')
    return response.data
  },

  getTransfers: async (): Promise<Transaction[]> => {
    const response = await api.get('/banking/transfers/')
    return response.data
  },

  initiateTransfer: async (data: TransferData): Promise<Transaction> => {
    const response = await api.post('/banking/transfers/', data)
    return response.data
  },

  getBitcoinBalance: async (): Promise<{ bitcoin_balance: string }> => {
    const response = await api.get('/bitcoin-wallet/wallets/bitcoin_balance/')
    return { bitcoin_balance: response.data.bitcoin_balance }
  },

  // New transfer endpoints
  validateRoutingNumber: async (routingNumber: string) => {
    const response = await api.post('/banking/validate-routing/', { routing_number: routingNumber })
    return response.data
  },

  createACHTransfer: async (data: any) => {
    const response = await api.post('/banking/transfers/ach/', data)
    return response.data
  },

  createWireTransfer: async (data: any) => {
    const response = await api.post('/banking/transfers/wire/', data)
    return response.data
  },

  createInternationalWireTransfer: async (data: any) => {
    const response = await api.post('/banking/transfers/international/', data)
    return response.data
  },

  // External bank accounts
  getExternalAccounts: async () => {
    const response = await api.get('/banking/external-accounts/')
    return response.data
  },

  createExternalAccount: async (data: any) => {
    const response = await api.post('/banking/external-accounts/', data)
    return response.data
  },

  // Saved beneficiaries
  getSavedBeneficiaries: async () => {
    const response = await api.get('/banking/saved-beneficiaries/')
    return response.data
  },

  createSavedBeneficiary: async (data: any) => {
    const response = await api.post('/banking/saved-beneficiaries/', data)
    return response.data
  },

  // Check deposits
  getCheckDeposits: async () => {
    const response = await api.get('/banking/check-deposits/')
    return response.data
  },

  createCheckDeposit: async (formData: FormData) => {
    const response = await api.post('/banking/check-deposits/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  extractCheckData: async (formData: FormData) => {
    const response = await api.post('/banking/check-deposits/extract/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

// Transactions API
export const transactionsAPI = {
  getTransactions: async (): Promise<{ results: Transaction[] } | Transaction[]> => {
    const response = await api.get('/transactions/')
    return response.data
  },

  getTransaction: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}/`)
    return response.data
  },

  getTransfers: async (): Promise<any[]> => {
    const response = await api.get('/banking/transfers/')
    return response.data
  },
}

// Admin API
export const adminAPI = {
  checkAdminAuth: async (): Promise<{ is_admin: boolean; user_id: number; email: string; is_staff: boolean; is_superuser: boolean }> => {
    const response = await api.get('/admin/auth/')
    return response.data
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  deleteUser: async (userId: number) => {
    const response = await api.delete(`/admin/users/${userId}/delete/`)
    return response.data
  },

  updateUserBalance: async (userId: number, balance: number, action: 'add' | 'subtract' | 'set' = 'add'): Promise<Account> => {
    const response = await api.put(`/admin/users/${userId}/balance/`, { balance, action })
    return response.data
  },

  updateUserBitcoinBalance: async (userId: number, bitcoinBalance: number, action: 'set' | 'add' | 'subtract' = 'add'): Promise<{ message: string; bitcoin_balance: string; action: string }> => {
    const response = await api.put(`/admin/users/${userId}/bitcoin-balance/`, {
      bitcoin_balance: bitcoinBalance,
      action: action
    })
    return response.data
  },

  getAllTransactions: async (): Promise<Transaction[]> => {
    const response = await api.get('/admin/transactions/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  updateTransactionStatus: async (transactionId: number, status: string): Promise<Transaction> => {
    const response = await api.put(`/admin/transactions/${transactionId}/status/`, { status })
    return response.data
  },

  updateTransferStatus: async (transferId: number, status: string): Promise<Transfer> => {
    const response = await api.put(`/admin/transfers/${transferId}/status/`, { status })
    return response.data
  },

  getAllCards: async (): Promise<VirtualCard[]> => {
    const response = await api.get('/admin/cards/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  getAllCardApplications: async (): Promise<CardApplication[]> => {
    const response = await api.get('/admin/applications/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  updateCardApplicationStatus: async (applicationId: number, status: string): Promise<CardApplication> => {
    const response = await api.put(`/admin/applications/${applicationId}/status/`, { status })
    return response.data
  },

  completeCardApplication: async (applicationId: number): Promise<{ message: string; card_id: number; card_number: string; status: string }> => {
    const response = await api.post(`/admin/applications/${applicationId}/complete/`)
    return response.data
  },

  getAllNotifications: async (): Promise<UserNotification[]> => {
    const response = await api.get('/admin/notifications/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  deleteCard: async (cardId: number): Promise<void> => {
    await api.delete(`/admin/cards/${cardId}/`)
  },

  getAdminDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/admin/dashboard/')
    return response.data
  },

  // System status
  getSystemStatus: async () => {
    const response = await api.get('/admin/system-status/')
    return response.data
  },

  // Currency swaps
  getAllCurrencySwaps: async () => {
    const response = await api.get('/admin/currency-swaps/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  // Bitcoin transactions
  getAllBitcoinTransactions: async () => {
    const response = await api.get('/admin/bitcoin-transactions/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  // Loans
  getAllLoans: async () => {
    const response = await api.get('/admin/loans/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  getAllLoanApplications: async () => {
    const response = await api.get('/admin/loan-applications/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  updateLoanStatus: async (loanApplicationId: number, status: string) => {
    const response = await api.patch(`/admin/loan-applications/${loanApplicationId}/status/`, { status })
    return response.data
  },

  // Bills
  getAllBills: async () => {
    const response = await api.get('/admin/bills/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  // Investments
  getAllInvestments: async () => {
    const response = await api.get('/admin/investments/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  // Security audit logs
  getAllSecurityLogs: async () => {
    const response = await api.get('/admin/security-logs/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  // Check deposits
  getAllCheckDeposits: async () => {
    const response = await api.get('/admin/check-deposits/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  getPendingCheckDeposits: async () => {
    const response = await api.get('/admin/pending-check-deposits/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  approveCheckDeposit: async (depositId: number, holdDays: number = 1, notes?: string) => {
    const response = await api.post(`/admin/check-deposits/${depositId}/approve/`, {
      hold_days: holdDays,
      notes
    })
    return response.data
  },

  rejectCheckDeposit: async (depositId: number, notes?: string) => {
    const response = await api.post(`/admin/check-deposits/${depositId}/reject/`, { notes })
    return response.data
  },

  completeCheckDeposit: async (depositId: number) => {
    const response = await api.post(`/admin/check-deposits/${depositId}/complete/`)
    return response.data
  },

  // Transfer approval
  getPendingTransfers: async () => {
    const response = await api.get('/admin/pending-transfers/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  approveTransfer: async (transferId: number, notes?: string) => {
    const response = await api.post(`/admin/transfers/${transferId}/approve/`, { notes })
    return response.data
  },

  rejectTransfer: async (transferId: number, notes?: string) => {
    const response = await api.post(`/admin/transfers/${transferId}/reject/`, { notes })
    return response.data
  },

  // Account locking
  lockUserAccount: async (userId: number, reason: string, durationHours: number = 24) => {
    const response = await api.post(`/admin/users/${userId}/lock/`, {
      reason,
      duration_hours: durationHours
    })
    return response.data
  },

  unlockUserAccount: async (userId: number) => {
    const response = await api.post(`/admin/users/${userId}/unlock/`)
    return response.data
  },

  getUnlockRequests: async () => {
    const response = await api.get('/admin/unlock-requests/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  approveUnlockRequest: async (userId: number) => {
    const response = await api.post(`/admin/users/${userId}/unlock/approve/`)
    return response.data
  },

  rejectUnlockRequest: async (userId: number, reason?: string) => {
    const response = await api.post(`/admin/users/${userId}/unlock/reject/`, { reason })
    return response.data
  },
}

// Location API
export const locationAPI = {
  getStates: async (): Promise<{ name: string; abbreviation: string }[]> => {
    const response = await api.get('/location/states/')
    return response.data
  },

  getCities: async (state: string): Promise<{ id: number; name: string; state: { id: number; name: string; abbreviation: string } }[]> => {
    const response = await api.get(`/location/cities/?state=${state}`)
    return response.data
  },
}

// Loans API
export const loansAPI = {
  getLoans: async (): Promise<Loan[]> => {
    const response = await api.get('/loans/')
    return response.data?.results || response.data || []
  },

  getLoanApplications: async (): Promise<any[]> => {
    const response = await api.get('/loans/apply/')
    return response.data?.results || response.data || []
  },

  getLoan: async (id: number): Promise<Loan> => {
    const response = await api.get(`/loans/${id}/`)
    return response.data
  },

  applyForLoan: async (data: LoanApplication): Promise<any> => {
    const response = await api.post('/loans/apply/', data)
    return response.data
  },

  payLoan: async (id: number, amount: number): Promise<Loan> => {
    const response = await api.post(`/loans/${id}/pay/`, { amount })
    return response.data
  },
}

// Investments API
export const investmentsAPI = {
  getInvestments: async (): Promise<Investment[]> => {
    try {
      const response = await api.get('/transactions/investments/')
      return response.data?.results || response.data || []
    } catch (error) {
      console.debug('Failed to fetch investments:', error)
      return []
    }
  },

  getInvestment: async (id: number): Promise<Investment> => {
    const response = await api.get(`/transactions/investments/${id}/`)
    return response.data
  },

  purchaseInvestment: async (data: InvestmentPurchase): Promise<Investment> => {
    try {
      const response = await api.post('/transactions/investments/purchase/', data)
      return response.data
    } catch (error: any) {
      // Suppress console errors but throw for UI handling
      console.debug('Purchase failed:', error?.response?.data || error.message)
      throw error
    }
  },

  sellInvestment: async (id: number, quantity?: number): Promise<Investment> => {
    try {
      const response = await api.post(`/transactions/investments/${id}/sell/`, { quantity })
      return response.data
    } catch (error: any) {
      console.debug('Sell failed:', error?.response?.data || error.message)
      throw error
    }
  },

  getMarketData: async (): Promise<{
    stocks: Array<{
      symbol: string
      name: string
      price: number
      change: number
      changePercent: number
    }>
    crypto: Array<{
      symbol: string
      name: string
      price: number
      change: number
      changePercent: number
    }>
  }> => {
    try {
      const response = await api.get('/market-data/')
      return response.data
    } catch (error) {
      console.debug('Failed to fetch market data:', error)
      return { stocks: [], crypto: [] }
    }
  },

  getAvailableInvestments: async (type: string): Promise<Array<{
    symbol: string
    name: string
    price: number
    type: string
  }>> => {
    try {
      const response = await api.get('/available-investments/', {
        params: { type }
      })
      return response.data || []
    } catch (error) {
      console.debug('Failed to fetch available investments:', error)
      return []
    }
  },
}

// Notifications API
export const notificationsAPI = {
  getNotifications: async (): Promise<{ results: UserNotification[] } | UserNotification[]> => {
    const response = await api.get('/notifications/')
    return response.data
  },

  getNotification: async (id: number): Promise<UserNotification> => {
    const response = await api.get(`/notifications/${id}/`)
    return response.data
  },

  markAsRead: async (notificationIds?: number[]): Promise<void> => {
    await api.post('/notifications/mark-read/', { notification_ids: notificationIds })
  },

  getSettings: async (): Promise<{
    email_notifications: boolean
    sms_notifications: boolean
    marketing_emails: boolean
  }> => {
    const response = await api.get('/notifications/settings/')
    return response.data
  },

  updateSettings: async (settings: {
    email_notifications?: boolean
    sms_notifications?: boolean
    marketing_emails?: boolean
  }): Promise<void> => {
    await api.post('/notifications/settings/', settings)
  },
}

// Bills API
export const billsAPI = {
  getBills: async (): Promise<Bill[]> => {
    const response = await api.get('/bills/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  getBill: async (id: number): Promise<Bill> => {
    const response = await api.get(`/bills/${id}/`)
    return response.data
  },

  addBill: async (data: Omit<Bill, 'id' | 'user' | 'created_at' | 'paid_at'>): Promise<Bill> => {
    const response = await api.post('/bills/', data)
    return response.data
  },

  payBill: async (data: BillPayment): Promise<Bill> => {
    const response = await api.post('/bills/pay/', data)
    return response.data
  },

  updateBill: async (id: number, data: Partial<Bill>): Promise<Bill> => {
    const response = await api.patch(`/bills/${id}/`, data)
    return response.data
  },

  deleteBill: async (id: number): Promise<void> => {
    await api.delete(`/bills/${id}/`)
  },
}

// Bitcoin API
export const bitcoinAPI = {
  // New Bitcoin wallet and incoming transaction functions
  getWallet: async (): Promise<BitcoinWallet> => {
    const response = await api.get('/bitcoin-wallet/wallets/my_wallet/')
    return response.data
  },

  getIncomingTransactions: async (): Promise<IncomingBitcoinTransaction[]> => {
    const response = await api.get('/bitcoin-wallet/transactions/my_transactions/')
    return response.data
  },

  getIncomingTransaction: async (id: number): Promise<IncomingBitcoinTransaction> => {
    const response = await api.get(`/bitcoin-wallet/transactions/${id}/`)
    return response.data
  },

  // Currency swap functions
  getExchangeRate: async (): Promise<{ exchange_rate: number }> => {
    const response = await api.get('/bitcoin-wallet/swaps/exchange_rate/')
    return response.data
  },

  createSwap: async (swapData: {
    swap_type: 'usd_to_btc' | 'btc_to_usd'
    amount_from: string
    amount_to: string
    exchange_rate: string
  }): Promise<CurrencySwap> => {
    const response = await api.post('/bitcoin-wallet/swaps/create_swap/', swapData)
    return response.data
  },

  getMySwaps: async (): Promise<CurrencySwap[]> => {
    const response = await api.get('/bitcoin-wallet/swaps/my_swaps/')
    return response.data
  },

  // Send Bitcoin
  sendBitcoin: async (data: {
    balance_source: 'fiat' | 'bitcoin'
    recipient_wallet_address: string
    amount_btc: number
    amount_usd?: number
    bitcoin_price_at_time: number
    transaction_fee?: number
  }): Promise<{
    id: number
    transaction_hash: string
    status: string
    amount_btc: number
    recipient_wallet_address: string
  }> => {
    const response = await api.post('/bitcoin-wallet/send/send/', data)
    return response.data
  },
}

// Card Applications
export const cardApplicationAPI = {
  // Get all applications for current user
  getMyApplications: async (): Promise<CardApplication[]> => {
    const response = await api.get('/banking/card-applications/my_applications/');
    return response.data;
  },

  // Create a new card application
  applyForCard: async (data: {
    card_type: 'debit' | 'credit';
    reason?: string;
    preferred_daily_limit?: number;
    preferred_monthly_limit?: number;
  }): Promise<CardApplication> => {
    const response = await api.post('/banking/card-applications/', data);
    return response.data;
  },

  // Get a specific application
  getApplication: async (id: number): Promise<CardApplication> => {
    const response = await api.get(`/banking/card-applications/${id}/`);
    return response.data;
  },
};

// Updated Virtual Cards API (read-only for users)
export const virtualCardAPI = {
  getCards: async (): Promise<VirtualCard[]> => {
    const response = await api.get('/banking/virtual-cards/')
    return response.data.results || []
  },

  getCard: async (id: number): Promise<VirtualCard> => {
    const response = await api.get(`/banking/virtual-cards/${id}/`)
    return response.data
  },

  updateCard: async (id: number, data: Partial<VirtualCard>): Promise<VirtualCard> => {
    const response = await api.patch(`/banking/virtual-cards/${id}/update/`, data)
    return response.data
  },

  cancelCard: async (id: number): Promise<void> => {
    await api.post(`/banking/virtual-cards/${id}/cancel/`)
  },

  freezeCard: async (id: number): Promise<void> => {
    await api.post(`/banking/virtual-cards/${id}/freeze/`)
  },

  unfreezeCard: async (id: number): Promise<void> => {
    await api.post(`/banking/virtual-cards/${id}/unfreeze/`)
  },

  deleteCard: async (id: number): Promise<void> => {
    await api.delete(`/banking/virtual-cards/${id}/delete/`)
  }
}


export default api 