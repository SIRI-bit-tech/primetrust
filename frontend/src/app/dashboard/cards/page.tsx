'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

import { 
  CreditCard, 
  Plus, 
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Snowflake,
  Sun,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react'

import DashboardLayout from '@/components/DashboardLayout'
import { virtualCardAPI, cardApplicationAPI } from '@/lib/api'
import { VirtualCard, CardApplication } from '@/types'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function CardsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
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
  
  const isAccountLocked = user?.is_account_locked || false

  useEffect(() => {
    loadData()
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      loadData()
    }, 30000) // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading cards and applications...')
      const [cardsData, applicationsData] = await Promise.all([
        virtualCardAPI.getCards(),
        cardApplicationAPI.getMyApplications()
      ])
      console.log('Cards data:', cardsData)
      console.log('Applications data:', applicationsData)
      console.log('Cards length:', cardsData.length)
      console.log('Applications length:', applicationsData.length)
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

  const VirtualCard = ({ card }: { card: VirtualCard }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showCVV, setShowCVV] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const formatCardNumber = (number: string) => {
      return number.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const handleCardClick = () => {
      setIsFlipped(true);
      // Auto-return to front after 45 seconds
      setTimeout(() => {
        setIsFlipped(false);
      }, 45000);
    };

    const handleFreezeCard = async () => {
      setIsLoading(true);
      try {
        if (card.status === 'active') {
          await virtualCardAPI.freezeCard(card.id);
        } else {
          await virtualCardAPI.unfreezeCard(card.id);
        }
        loadData();
        toast({
          title: "Success",
          description: card.status === 'active' ? "Card frozen successfully." : "Card unfrozen successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update card status.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleCancelCard = async () => {
      setIsLoading(true);
      try {
        await virtualCardAPI.cancelCard(card.id);
        loadData();
        toast({
          title: "Success",
          description: "Card cancelled successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to cancel card.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* 3D Card Container */}
        <div className="relative w-full max-w-2xl mx-auto perspective-1000">
          <div 
            className={`relative w-full h-48 rounded-xl cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 6px 20px rgba(0, 0, 0, 0.3)',
              transformStyle: 'preserve-3d'
            }}
            onClick={handleCardClick}
          >
            {/* Front of Card - Using Mockup */}
            <div className="absolute inset-0 w-full h-full rounded-xl backface-hidden">
              <Image 
                src="/images/card-front-mockup.png" 
                alt="Card Front" 
                layout="fill"
                objectFit="cover"
                className="rounded-xl"
              />
              
              {/* Dynamic Text Overlays */}
              <div className="absolute inset-0 p-6">
                {/* Card Number - Centered */}
                <div className="absolute top-16 left-6 right-6">
                  <div className="text-white text-xl font-mono tracking-wider font-bold">
                    {formatCardNumber(card.card_number)}
                  </div>
                </div>

                {/* Expiry Date - Bottom Left */}
                <div className="absolute bottom-14 left-6">
                  <div className="text-white text-sm opacity-80 mb-0.5 font-medium">Valid Thru</div>
                  <div className="text-white font-mono text-sm font-bold">{String(card.expiry_month).padStart(2, '0')}/{String(card.expiry_year).slice(-2)}</div>
                </div>

                {/* Cardholder Name - Bottom Left */}
                <div className="absolute bottom-2 left-6">
                  <div className="text-white text-sm opacity-80 mb-0.5 font-medium">Cardholder</div>
                  <div className="text-white font-mono text-sm font-bold tracking-wide">{card.user_name || 'Card Holder'}</div>
                </div>

                {/* Click hint */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-60 bg-black bg-opacity-50 px-2 py-1 rounded">
                  Click to flip
                </div>
              </div>
            </div>

            {/* Back of Card - Using Mockup */}
            <div className="absolute inset-0 w-full h-full rounded-xl backface-hidden rotate-y-180">
              <Image 
                src="/images/card-back-mockup.png" 
                alt="Card Back" 
                layout="fill"
                objectFit="cover"
                className="rounded-xl"
              />
              
              {/* CVV Overlay */}
              <div className="absolute bottom-8 right-6">
                <div className="flex items-center justify-end">
                  <div className="text-black font-mono text-xs font-bold mr-1">CVV</div>
                  <div className="w-12 h-6 flex items-center justify-center">
                    <span className="text-black font-mono text-xs font-bold">
                      {showCVV ? card.cvv : '•••'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCVV(!showCVV);
                    }}
                    className="ml-1 text-black hover:text-blue-600 transition-colors"
                  >
                    {showCVV ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex space-x-2 max-w-md mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFreezeCard}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : card.status === 'active' ? (
              <>
                <Snowflake className="w-4 h-4 mr-2" />
                Freeze Card
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 mr-2" />
                Unfreeze Card
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelCard}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel Card
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

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
      <div className={cn("space-y-6 relative", isAccountLocked && "pointer-events-none opacity-50")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Virtual Cards</h1>
            <p className="text-muted-foreground mt-2">
              Apply for virtual credit cards and manage your existing cards.
            </p>
          </div>
          <div className="flex space-x-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
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
                        {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
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
        {cards.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">My Virtual Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <VirtualCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Show "No Cards" message only when there are no cards AND no applications */}
        {cards.length === 0 && applications.length === 0 && (
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
        )}

        {/* Security Information */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Virtual Card Security
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <div key="unique-number" className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Each card has a unique number and CVV</span>
              </div>
              <div key="online-transactions" className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Cards can be used for online transactions</span>
              </div>
              <div key="no-physical" className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>No physical card needed</span>
              </div>
            </div>
            <div className="space-y-2">
              <div key="secure-encryption" className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Secure encryption protects your data</span>
              </div>
              <div key="real-time-monitor" className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Monitor transactions in real-time</span>
              </div>
              <div key="apply-anytime" className="flex items-center">
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