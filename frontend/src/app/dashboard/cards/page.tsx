'use client'

import { useState, useEffect } from 'react'

import { 
  CreditCard, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowLeft,
  Shield,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { virtualCardAPI, cardApplicationAPI } from '@/lib/api'
import { VirtualCard, CardApplication } from '@/types'
import { maskCardNumber} from '@/lib/utils'

export default function CardsPage() {
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [applications, setApplications] = useState<CardApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [showCVV, setShowCVV] = useState<{ [key: number]: boolean }>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationData, setApplicationData] = useState({
    card_type: 'debit' as 'debit' | 'credit',
    reason: '',
    preferred_daily_limit: 1000,
    preferred_monthly_limit: 10000
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cardsData, applicationsData] = await Promise.all([
        virtualCardAPI.getCards(),
        cardApplicationAPI.getMyApplications()
      ])
      setCards(cardsData)
      setApplications(applicationsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyForCard = async () => {
    setIsApplying(true)
    try {
      const newApplication = await cardApplicationAPI.applyForCard(applicationData)
      setApplications([newApplication, ...applications])
      setShowApplicationForm(false)
      setApplicationData({
        card_type: 'debit',
        reason: '',
        preferred_daily_limit: 1000,
        preferred_monthly_limit: 10000
      })
    } catch (error) {
      console.error('Error applying for card:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const toggleCVV = (cardId: number) => {
    setShowCVV(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getCardGradient = (cardType: string) => {
    switch (cardType) {
      case 'debit':
        return 'from-blue-600 to-blue-800'
      case 'credit':
        return 'from-orange-500 to-red-600'
      default:
        return 'from-primary-dark to-primary-navy'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-dark"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Virtual Cards</h1>
            <p className="text-muted-foreground mt-2">
              Apply for virtual credit cards and manage your existing cards.
            </p>
          </div>
          <button
            onClick={() => setShowApplicationForm(true)}
            disabled={isApplying}
            className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Applying...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Apply for Card
              </>
            )}
          </button>
        </div>

        {/* Application Form Modal */}
        {showApplicationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-foreground mb-4">Apply for Virtual Card</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Card Type</label>
                  <select
                    value={applicationData.card_type}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, card_type: e.target.value as 'debit' | 'credit' }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="debit">Debit Card</option>
                    <option value="credit">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Reason for Application</label>
                  <textarea
                    value={applicationData.reason}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    rows={3}
                    placeholder="Please explain why you need this card..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Preferred Daily Limit ($)</label>
                  <input
                    type="number"
                    value={applicationData.preferred_daily_limit}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, preferred_daily_limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    min="100"
                    max="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Preferred Monthly Limit ($)</label>
                  <input
                    type="number"
                    value={applicationData.preferred_monthly_limit}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, preferred_monthly_limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    min="1000"
                    max="100000"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowApplicationForm(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={applyForCard}
                  disabled={isApplying}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isApplying ? 'Applying...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications Section */}
        {applications.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">My Applications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {application.card_type.charAt(0).toUpperCase() + application.card_type.slice(1)} Card
                    </span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(application.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {application.status_display}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Applied:</span>
                      <span className="text-foreground ml-2">
                        {new Date(application.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {application.estimated_completion_days !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Estimated completion:</span>
                        <span className="text-foreground ml-2">
                          {application.estimated_completion_days} days
                        </span>
                      </div>
                    )}
                    
                    {application.admin_notes && (
                      <div>
                        <span className="text-muted-foreground">Admin notes:</span>
                        <p className="text-foreground text-xs mt-1">{application.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {cards.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">My Virtual Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Card Display */}
                  <div className={`bg-gradient-to-r ${getCardGradient(card.card_type)} p-6 text-white relative`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm opacity-80">Virtual Card</span>
                      <span className="text-sm opacity-80">{card.card_type.toUpperCase()}</span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-lg font-mono tracking-wider">
                        {card.card_number_display}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm opacity-80">
                      <div>
                        <p className="text-xs opacity-60">CVV</p>
                        <p className="font-mono">
                          {showCVV[card.id] ? card.cvv : '•••'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-60">EXPIRES</p>
                        <p className="font-mono">{card.expiry_date}</p>
                      </div>
                    </div>
                    
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => toggleCVV(card.id)}
                        className="p-1 text-white/80 hover:text-white transition-colors"
                      >
                        {showCVV[card.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Card Number */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Card Number
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={card.card_number}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-sm font-mono text-foreground"
                          />
                          <button
                            onClick={() => copyToClipboard(card.card_number, `card-${card.id}`)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedField === `card-${card.id}` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* CVV */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          CVV
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={showCVV[card.id] ? card.cvv : '•••'}
                            readOnly
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-muted text-sm font-mono text-foreground"
                          />
                          <button
                            onClick={() => copyToClipboard(card.cvv, `cvv-${card.id}`)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedField === `cvv-${card.id}` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          card.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                        </span>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm text-foreground">
                          {new Date(card.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Virtual Cards Yet</h3>
            <p className="text-muted-foreground mb-6">
              Apply for your first virtual card to start making secure online transactions.
            </p>
            <button
              onClick={() => setShowApplicationForm(true)}
              disabled={isApplying}
              className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center mx-auto"
            >
              {isApplying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Applying...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Apply for Your First Card
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* Security Information */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Virtual Card Security
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Each card has a unique number and CVV</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Cards can be used for online transactions</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>No physical card needed</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Secure encryption protects your data</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Monitor transactions in real-time</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Apply for new cards anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 