'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { adminAPI } from '@/lib/api'
import { AxiosError } from 'axios'
import { 
  Users, 
  CreditCard, 
  FileText, 
  Bell, 
  TrendingUp, 
  Activity,
  DollarSign,
  Bitcoin,
  Shield,
  BarChart3,
  Receipt,
  PiggyBank,
  AlertTriangle,
  Clock,
  Unlock,
  Lock,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { 
  User, 
  Transaction, 
  Transfer,
  VirtualCard, 
  CardApplication, 
  UserNotification,
  SystemStatus,
  CurrencySwap,
  BitcoinTransaction,
  Loan,
  Bill,
  Investment,
  SecurityAuditLog,
  AdminDashboardData,
  TableItem
} from '@/types'
import PendingTransfersTable from '@/components/admin/PendingTransfersTable'
import UnlockRequestsTable from '@/components/admin/UnlockRequestsTable'
import AdminActionModal from '@/components/admin/AdminActionModal'

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Modal states
  const [showLockModal, setShowLockModal] = useState(false)
  const [selectedUserForAction, setSelectedUserForAction] = useState<number | null>(null)
  const [showCardSuccessModal, setShowCardSuccessModal] = useState(false)
  const [cardSuccessData, setCardSuccessData] = useState<{ cardNumber: string } | null>(null)

  // Data states
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([])
  const [unlockRequests, setUnlockRequests] = useState<User[]>([])
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [applications, setApplications] = useState<CardApplication[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([])
  const [currencySwaps, setCurrencySwaps] = useState<CurrencySwap[]>([])
  const [bitcoinTransactions, setBitcoinTransactions] = useState<BitcoinTransaction[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditLog[]>([])

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | 'set'>('add')
  const [bitcoinAmount, setBitcoinAmount] = useState('')
  const [bitcoinAction, setBitcoinAction] = useState<'add' | 'subtract' | 'set'>('add')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'pending-transfers', label: 'Pending Transfers', icon: Clock },
    { id: 'unlock-requests', label: 'Unlock Requests', icon: Unlock },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'applications', label: 'Applications', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system-status', label: 'System Status', icon: Activity },
    { id: 'currency-swaps', label: 'Currency Swaps', icon: DollarSign },
    { id: 'bitcoin-transactions', label: 'Bitcoin Transactions', icon: Bitcoin },
    { id: 'loans', label: 'Loans', icon: Shield },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'investments', label: 'Investments', icon: PiggyBank },
    { id: 'security-logs', label: 'Security Logs', icon: AlertTriangle },
  ]

  const loadData = async () => {
    setLoading(true)
    setError('')
    
    try {
      switch (activeTab) {
        case 'dashboard':
          const dashboard = await adminAPI.getAdminDashboard()
          setDashboardData(dashboard)
          // Also load users for Balance Management section
          const dashboardUsers = await adminAPI.getAllUsers()
          setUsers(dashboardUsers)
          break
        case 'users':
          const usersData = await adminAPI.getAllUsers()
          setUsers(usersData)
          break
        case 'transactions':
          const transactionsData = await adminAPI.getAllTransactions()
          setTransactions(transactionsData)
          break
        case 'cards':
          const cardsData = await adminAPI.getAllCards()
          setCards(cardsData)
          break
        case 'applications':
          const applicationsData = await adminAPI.getAllCardApplications()
          setApplications(applicationsData)
          break
        case 'notifications':
          const notificationsData = await adminAPI.getAllNotifications()
          setNotifications(notificationsData)
          break
        case 'system-status':
          const systemStatusData = await adminAPI.getSystemStatus()
          setSystemStatus(systemStatusData.components || [])
          break
        case 'currency-swaps':
          const currencySwapsData = await adminAPI.getAllCurrencySwaps()
          setCurrencySwaps(currencySwapsData)
          break
        case 'bitcoin-transactions':
          const bitcoinTransactionsData = await adminAPI.getAllBitcoinTransactions()
          setBitcoinTransactions(bitcoinTransactionsData)
          break
        case 'loans':
          const loansData = await adminAPI.getAllLoans()
          setLoans(loansData)
          break
        case 'bills':
          const billsData = await adminAPI.getAllBills()
          setBills(billsData)
          break
        case 'investments':
          const investmentsData = await adminAPI.getAllInvestments()
          setInvestments(investmentsData)
          break
        case 'security-logs':
          const securityLogsData = await adminAPI.getAllSecurityLogs()
          setSecurityLogs(securityLogsData)
          break
        case 'pending-transfers':
          const pendingTransfersData = await adminAPI.getPendingTransfers()
          setPendingTransfers(pendingTransfersData)
          break
        case 'unlock-requests':
          const unlockRequestsData = await adminAPI.getUnlockRequests()
          setUnlockRequests(unlockRequestsData)
          break
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const handleUpdateBalance = async () => {
    if (!selectedUser || !balanceAmount) return
    
    try {
      await adminAPI.updateUserBalance(selectedUser, parseFloat(balanceAmount), balanceAction)
      setBalanceAmount('')
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to update balance')
    }
  }

  const handleUpdateBitcoinBalance = async () => {
    if (!selectedUser || !bitcoinAmount) return
    
    try {
      await adminAPI.updateUserBitcoinBalance(selectedUser, parseFloat(bitcoinAmount), bitcoinAction)
      setBitcoinAmount('')
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to update Bitcoin balance')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    try {
      await adminAPI.deleteUser(userId)
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to delete user')
    }
  }

  const handleLockAccount = (userId: number) => {
    setSelectedUserForAction(userId)
    setShowLockModal(true)
  }

  const handleLockAccountConfirm = async (data: { [key: string]: string }) => {
    if (!selectedUserForAction) return

    const durationHours = parseInt(data.duration || '24')

    if (isNaN(durationHours) || durationHours <= 0) {
      setError('Invalid duration')
      return
    }

    try {
      await adminAPI.lockUserAccount(selectedUserForAction, data.reason, durationHours)
      setError('')
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to lock account')
    }
  }

  const handleUnlockAccount = async (userId: number) => {
    if (!confirm('Are you sure you want to unlock this account?')) return

    try {
      await adminAPI.unlockUserAccount(userId)
      setError('')
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to unlock account')
    }
  }

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) return
    
    try {
      await adminAPI.deleteCard(cardId)
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to delete card')
    }
  }

  const handleUpdateTransactionStatus = async (transactionId: number, status: string, itemType?: string) => {
    try {
      if (itemType === 'transfer') {
        await adminAPI.updateTransferStatus(transactionId, status)
      } else {
        await adminAPI.updateTransactionStatus(transactionId, status)
      }
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to update status')
    }
  }

  const handleUpdateCardApplicationStatus = async (applicationId: number, status: string) => {
    try {
      await adminAPI.updateCardApplicationStatus(applicationId, status)
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to update application status')
    }
  }

  const handleCompleteCardApplication = async (applicationId: number) => {
    try {
      const result = await adminAPI.completeCardApplication(applicationId)
      setError('') // Clear any previous errors
      // Show success modal
      setCardSuccessData({ cardNumber: result.card_number })
      setShowCardSuccessModal(true)
      loadData() // Reload data
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to complete application')
    }
  }

  const handleUpdateLoanStatus = async (loanId: number, status: string) => {
    try {
      await adminAPI.updateLoanStatus(loanId, status)
      loadData()
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string }>
      setError(error.response?.data?.error || 'Failed to update loan status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
      case 'operational':
      case 'confirmed':
        return 'text-green-600 bg-green-100'
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100'
      case 'locked':
        return 'text-red-600 bg-red-100'
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      case 'rejected':
      case 'failed':
      case 'major_outage':
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      case 'partial_outage':
      case 'degraded':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const filteredData = (): TableItem[] => {
    const dataMap: Record<string, TableItem[]> = {
      users,
      transactions,
      cards,
      applications,
      notifications,
      'currency-swaps': currencySwaps,
      'bitcoin-transactions': bitcoinTransactions,
      loans,
      bills,
      investments,
      'security-logs': securityLogs
    }
    
    const data = dataMap[activeTab] || []
    

    
    if (!searchTerm) return data
    
    return data.filter((item: TableItem) => {
      const userItem = item as User
      const transactionItem = item as Transaction
      const cardItem = item as VirtualCard
      const applicationItem = item as CardApplication
      const notificationItem = item as UserNotification
      const systemStatusItem = item as SystemStatus
      const currencySwapItem = item as CurrencySwap
      const bitcoinTransactionItem = item as BitcoinTransaction
      const loanItem = item as Loan
      const billItem = item as Bill
      const investmentItem = item as Investment
      const securityLogItem = item as SecurityAuditLog

      return (
        userItem.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transactionItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cardItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicationItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notificationItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currencySwapItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bitcoinTransactionItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loanItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investmentItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        securityLogItem.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item as TableItem & { id?: number }).id?.toString().includes(searchTerm) ||
        (item as TableItem & { status?: string }).status?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }

  const renderTableHeaders = () => {
    switch (activeTab) {
      case 'users':
        return ['User', 'Email', 'Balance', 'Status', 'Actions']
      case 'transactions':
        return ['User', 'Type', 'Amount', 'Status', 'Date', 'Actions']
      case 'cards':
        return ['User', 'Card Number', 'Type', 'Status', 'Daily Limit', 'Actions']
      case 'applications':
        return ['User', 'Card Type', 'Status', 'Date', 'Actions']
      case 'notifications':
        return ['User', 'Type', 'Title', 'Priority', 'Status', 'Date']
      case 'system-status':
        return ['Component', 'Status', 'Response Time', 'Uptime', 'Last Check']
      case 'currency-swaps':
        return ['User', 'Swap Type', 'Amount From', 'Amount To', 'Rate', 'Status', 'Date']
      case 'bitcoin-transactions':
        return ['User', 'Type', 'Amount', 'Address', 'Status', 'Confirmations', 'Date']
      case 'loans':
        return ['User', 'Type', 'Amount', 'Rate', 'Status', 'Purpose', 'Actions']
      case 'bills':
        return ['User', 'Type', 'Amount', 'Due Date', 'Status', 'Description']
      case 'investments':
        return ['User', 'Type', 'Amount', 'Return Rate', 'Status', 'Date']
      case 'security-logs':
        return ['User', 'Event Type', 'Description', 'IP Address', 'Timestamp']
      default:
        return []
    }
  }

  const renderTableRow = (item: TableItem) => {
    switch (activeTab) {
      case 'users':
        const userItem = item as User
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {userItem.first_name} {userItem.last_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {userItem.email}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency(Number(userItem.balance) || 0)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                userItem.account_locked_until && new Date(userItem.account_locked_until) > new Date() ? 'locked' : 
                userItem.is_active ? 'active' : 'inactive'
              )}`}>
                {userItem.account_locked_until && new Date(userItem.account_locked_until) > new Date() ? 'Locked' :
                 userItem.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <div className="flex items-center gap-2">
                {userItem.account_locked_until && new Date(userItem.account_locked_until) > new Date() ? (
                  <button
                    onClick={() => handleUnlockAccount(userItem.id)}
                    className="text-green-400 hover:text-green-300 flex items-center"
                    title="Unlock Account"
                  >
                    <Unlock className="w-4 h-4 mr-1" />
                    Unlock
                  </button>
                ) : (
                  <button
                    onClick={() => handleLockAccount(userItem.id)}
                    className="text-yellow-400 hover:text-yellow-300 flex items-center"
                    title="Lock Account"
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    Lock
                  </button>
                )}
                <button
                  onClick={() => handleDeleteUser(userItem.id)}
                  className="text-red-400 hover:text-red-300 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </td>
          </>
        )
      case 'transactions':
        const transactionItem = item as any // Can be Transaction or Transfer
        // Handle both Transaction and Transfer types
        const userName = transactionItem.user_name || transactionItem.sender_name || 'N/A'
        const transactionType = transactionItem.transaction_type || transactionItem.transfer_type || 'N/A'
        const itemType = transactionItem.type // 'transaction' or 'transfer'
        
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {userName}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {transactionType}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency(transactionItem.amount)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transactionItem.status)}`}>
                {transactionItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(transactionItem.created_at)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {transactionItem.status === 'pending' || transactionItem.status === 'processing' ? (
                <select
                  value={transactionItem.status}
                  onChange={(e) => handleUpdateTransactionStatus(transactionItem.id, e.target.value, itemType)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              ) : (
                <span className="text-gray-500 text-xs">
                  {transactionItem.status === 'completed' ? '✓ Completed' : '✗ ' + transactionItem.status}
                </span>
              )}
            </td>
          </>
        )
      case 'cards':
        const cardItem = item as VirtualCard
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {cardItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {cardItem.card_number_display}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {cardItem.card_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cardItem.status)}`}>
                {cardItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency(cardItem.daily_limit)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <button
                onClick={() => handleDeleteCard(cardItem.id)}
                className="text-red-400 hover:text-red-300 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
            </td>
          </>
        )
      case 'applications':
        const applicationItem = item as CardApplication
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {applicationItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {applicationItem.card_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(applicationItem.status)}`}>
                {applicationItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(applicationItem.created_at)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <div className="flex flex-col gap-2">
                <select
                  value={applicationItem.status}
                  onChange={(e) => handleUpdateCardApplicationStatus(applicationItem.id, e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs"
                  disabled={applicationItem.status === 'completed'}
                >
                  <option value="processing">Processing</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="completed">Completed</option>
                </select>
                {applicationItem.status === 'approved' && (
                  <button
                    onClick={() => handleCompleteCardApplication(applicationItem.id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                  >
                    Complete & Generate Card
                  </button>
                )}
              </div>
            </td>
          </>
        )
      case 'notifications':
        const notificationItem = item as UserNotification
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {notificationItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {notificationItem.notification_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {notificationItem.title}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notificationItem.priority)}`}>
                {notificationItem.priority}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notificationItem.is_read ? 'read' : 'unread')}`}>
                {notificationItem.is_read ? 'Read' : 'Unread'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(notificationItem.created_at)}
            </td>
          </>
        )
      case 'system-status':
        const systemStatusItem = item as SystemStatus
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {systemStatusItem.component}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemStatusItem.status)}`}>
                {systemStatusItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {systemStatusItem.response_time}ms
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {systemStatusItem.uptime_percentage}%
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(systemStatusItem.last_check)}
            </td>
          </>
        )
      case 'currency-swaps':
        const currencySwapItem = item as CurrencySwap
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {currencySwapItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {currencySwapItem.swap_type_display || currencySwapItem.swap_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {currencySwapItem.swap_type === 'usd_to_btc' 
                ? `$${Number(currencySwapItem.amount_from).toFixed(2)}`
                : `${Number(currencySwapItem.amount_from).toFixed(8)} BTC`
              }
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {currencySwapItem.swap_type === 'usd_to_btc'
                ? `${Number(currencySwapItem.amount_to).toFixed(8)} BTC`
                : `$${Number(currencySwapItem.amount_to).toFixed(2)}`
              }
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              ${Number(currencySwapItem.exchange_rate).toFixed(2)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currencySwapItem.status)}`}>
                {currencySwapItem.status_display || currencySwapItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(currencySwapItem.created_at)}
            </td>
          </>
        )
      case 'bitcoin-transactions':
        const bitcoinTransactionItem = item as BitcoinTransaction
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {bitcoinTransactionItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {bitcoinTransactionItem.transaction_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {bitcoinTransactionItem.amount} BTC
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {bitcoinTransactionItem.bitcoin_address.slice(0, 8)}...
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bitcoinTransactionItem.status)}`}>
                {bitcoinTransactionItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {bitcoinTransactionItem.confirmations}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(bitcoinTransactionItem.created_at)}
            </td>
          </>
        )
      case 'loans':
        const loanItem = item as Loan
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {loanItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {loanItem.loan_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency(loanItem.amount)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {loanItem.interest_rate}%
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loanItem.status)}`}>
                {loanItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {loanItem.purpose}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <select
                value={loanItem.status}
                onChange={(e) => handleUpdateLoanStatus(loanItem.id, e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </td>
          </>
        )
      case 'bills':
        const billItem = item as Bill
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {billItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {billItem.bill_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency(billItem.amount)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(billItem.due_date)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(billItem.status)}`}>
                {billItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {billItem.description}
            </td>
          </>
        )
      case 'investments':
        const investmentItem = item as Investment
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {investmentItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {investmentItem.investment_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatCurrency((investmentItem as any).amount_invested || 0)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {(investmentItem as any).return_rate ? `${(investmentItem as any).return_rate}%` : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(investmentItem.status)}`}>
                {investmentItem.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(investmentItem.created_at)}
            </td>
          </>
        )
      case 'security-logs':
        const securityLogItem = item as SecurityAuditLog
        return (
          <>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
              {securityLogItem.user_name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {securityLogItem.event_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {securityLogItem.description}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {securityLogItem.ip_address}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {formatDate(securityLogItem.created_at)}
            </td>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">PrimeTrust Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.first_name || 'Admin'}</span>
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/admin/login'
                }}
                className="text-red-400 hover:text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

             {/* Navigation Tabs */}
       <div className="bg-gray-800 border-b border-gray-700">
         <style jsx>{`
           .hide-scrollbar::-webkit-scrollbar {
             display: none;
           }
         `}</style>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                       <div className="flex space-x-8 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
             {tabs.map((tab) => {
               const Icon = tab.icon
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                     activeTab === tab.id
                       ? 'border-blue-500 text-blue-400'
                       : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                   }`}
                 >
                   <Icon className="w-4 h-4" />
                   <span>{tab.label}</span>
                 </button>
               )
             })}
           </div>
         </div>
       </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Admin Dashboard</h2>
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>

            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-400" />
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{dashboardData.users?.total || 0}</p>
                      <p className="text-gray-400 text-sm">{dashboardData.users?.active || 0} active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-green-400" />
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Total Transactions</p>
                      <p className="text-2xl font-bold text-white">{dashboardData.transactions?.total || 0}</p>
                      <p className="text-gray-400 text-sm">{dashboardData.transactions?.pending || 0} pending</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="w-8 h-8 text-purple-400" />
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Active Cards</p>
                      <p className="text-2xl font-bold text-white">{dashboardData.cards?.active || 0}</p>
                      <p className="text-gray-400 text-sm">{dashboardData.cards?.total || 0} total cards</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-yellow-400" />
                    <div className="ml-4">
                      <p className="text-gray-400 text-sm">Pending Applications</p>
                      <p className="text-2xl font-bold text-white">{dashboardData.applications?.pending || 0}</p>
                      <p className="text-gray-400 text-sm">{dashboardData.applications?.total || 0} total applications</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

                         {/* Balance Management */}
             <div className="bg-gray-800 p-6 rounded-lg">
               <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                 <DollarSign className="w-5 h-5 mr-2" />
                 Balance Management
               </h3>
               
               <div className="space-y-4">
                 {/* User Selection */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Select User</label>
                   <select
                     value={selectedUser || ''}
                     onChange={(e) => setSelectedUser(Number(e.target.value) || null)}
                     className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                   >
                     <option value="">Choose a user</option>
                     {users.map((user) => (
                       <option key={user.id} value={user.id}>
                         {user.first_name} {user.last_name} ({user.email})
                       </option>
                     ))}
                   </select>
                 </div>

                 {/* USD Balance */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">USD Balance</label>
                   <div className="flex gap-1">
                     <select
                       value={balanceAction}
                       onChange={(e) => setBalanceAction(e.target.value as 'add' | 'subtract' | 'set')}
                       className="w-20 bg-gray-700 border border-gray-600 text-white rounded px-2 py-2 text-sm"
                     >
                       <option value="add">Add</option>
                       <option value="subtract">Sub</option>
                       <option value="set">Set</option>
                     </select>
                     <input
                       type="number"
                       value={balanceAmount}
                       onChange={(e) => setBalanceAmount(e.target.value)}
                       placeholder="Amount"
                       className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                     />
                     <button
                       onClick={handleUpdateBalance}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
                     >
                       Update
                     </button>
                   </div>
                 </div>

                 {/* Bitcoin Balance */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Bitcoin Balance</label>
                   <div className="flex gap-1">
                     <select
                       value={bitcoinAction}
                       onChange={(e) => setBitcoinAction(e.target.value as 'add' | 'subtract' | 'set')}
                       className="w-20 bg-gray-700 border border-gray-600 text-white rounded px-2 py-2 text-sm"
                     >
                       <option value="add">Add</option>
                       <option value="subtract">Sub</option>
                       <option value="set">Set</option>
                     </select>
                     <input
                       type="number"
                       value={bitcoinAmount}
                       onChange={(e) => setBitcoinAmount(e.target.value)}
                       placeholder="BTC"
                       className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                     />
                     <button
                       onClick={handleUpdateBitcoinBalance}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
                     >
                       Update
                     </button>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* Pending Transfers Tab */}
        {activeTab === 'pending-transfers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Pending Transfers</h2>
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <PendingTransfersTable transfers={pendingTransfers} onUpdate={loadData} />
          </div>
        )}

        {/* Unlock Requests Tab */}
        {activeTab === 'unlock-requests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Account Unlock Requests</h2>
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <UnlockRequestsTable users={unlockRequests} onUpdate={loadData} />
          </div>
        )}

        {/* Other Tabs */}
        {activeTab !== 'dashboard' && activeTab !== 'pending-transfers' && activeTab !== 'unlock-requests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white capitalize">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                />
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Data Tables */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      {renderTableHeaders().map((header, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                                         {filteredData().map((item: TableItem) => (
                       <tr key={item.id} className="hover:bg-gray-700">
                         {renderTableRow(item)}
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lock Account Modal */}
      <AdminActionModal
        isOpen={showLockModal}
        onClose={() => {
          setShowLockModal(false)
          setSelectedUserForAction(null)
        }}
        onConfirm={handleLockAccountConfirm}
        title="Lock User Account"
        description="Enter the reason and duration for locking this account."
        fields={[
          {
            name: 'reason',
            label: 'Reason for Lock',
            type: 'textarea',
            placeholder: 'e.g., Suspicious activity detected, Unusual login location',
            required: true
          },
          {
            name: 'duration',
            label: 'Lock Duration (hours)',
            type: 'number',
            placeholder: '24',
            defaultValue: '24',
            required: true
          }
        ]}
        confirmText="Lock Account"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Card Success Modal */}
      {showCardSuccessModal && cardSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Card Created Successfully!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
              The virtual card has been issued and is ready for use.
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Card Number</p>
              <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                {cardSuccessData.cardNumber}
              </p>
            </div>
            <button
              onClick={() => {
                setShowCardSuccessModal(false)
                setCardSuccessData(null)
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}