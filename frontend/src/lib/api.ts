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
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          })
          
                     const { access_token } = response.data
           localStorage.setItem('access_token', access_token)
          
                     originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        // Check if we're on admin pages and redirect accordingly
        const currentPath = window.location.pathname
        if (currentPath.includes('/admin')) {
          window.location.href = '/admin/login'
        } else {
          window.location.href = '/login'
        }
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
    const refreshToken = localStorage.getItem('refresh_token')
    await api.post('/auth/logout/', { refresh_token: refreshToken })
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile/')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/auth/update/', data)
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

  verifyTwoFactorLogin: async (code: string, tempToken: string, isBackupCode = false): Promise<AuthResponse> => {
    const response = await api.post('/auth/two-factor-login-verify/', { 
      code, 
      temp_token: tempToken,
      is_backup_code: isBackupCode 
    })
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

  updateUserBalance: async (userId: number, balance: number): Promise<Account> => {
    const response = await api.put(`/admin/users/${userId}/balance/`, { balance })
    return response.data
  },

  updateUserBitcoinBalance: async (userId: number, bitcoinBalance: number, action: 'set' | 'add' | 'subtract' = 'set'): Promise<{ message: string; bitcoin_balance: string; action: string }> => {
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

  getAllCards: async (): Promise<VirtualCard[]> => {
    const response = await api.get('/admin/cards/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  getAllCardApplications: async (): Promise<CardApplication[]> => {
    const response = await api.get('/admin/card-applications/')
    return Array.isArray(response.data) ? response.data : (response.data?.results || [])
  },

  updateCardApplicationStatus: async (applicationId: number, status: string): Promise<CardApplication> => {
    const response = await api.put(`/admin/card-applications/${applicationId}/status/`, { status })
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
    return response.data
  },

  getLoan: async (id: number): Promise<Loan> => {
    const response = await api.get(`/loans/${id}/`)
    return response.data
  },

  applyForLoan: async (data: LoanApplication): Promise<Loan> => {
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
    const response = await api.get('/investments/')
    return response.data
  },

  getInvestment: async (id: number): Promise<Investment> => {
    const response = await api.get(`/investments/${id}/`)
    return response.data
  },

  purchaseInvestment: async (data: InvestmentPurchase): Promise<Investment> => {
    const response = await api.post('/investments/purchase/', data)
    return response.data
  },

  sellInvestment: async (id: number, quantity?: number): Promise<Investment> => {
    const response = await api.post(`/investments/${id}/sell/`, { quantity })
    return response.data
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
    const response = await api.get('/investments/market-data/')
    return response.data
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
    return response.data
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