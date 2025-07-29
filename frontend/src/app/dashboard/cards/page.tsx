'use client'

import { useState, useEffect } from 'react'

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

export default function CardsPage() {
  const { toast } = useToast()
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
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      loadData()
    }, 30000) // 30 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval)
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

  const VirtualCard = ({ card }: { card: VirtualCard }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showCVV, setShowCVV] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const formatCardNumber = (number: string) => {
      const masked = number.replace(/\d(?=\d{4})/g, '•');
      return masked.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleFreezeCard = async () => {
      setIsLoading(true);
      try {
        if (card.status === 'active') {
          await virtualCardAPI.freezeCard(card.id);
        } else {
          await virtualCardAPI.unfreezeCard(card.id);
        }
        // Refresh the cards list
        loadData();
        toast({
          title: "Success",
          description: `Card ${card.status === 'active' ? 'frozen' : 'unfrozen'} successfully.`,
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
      if (!confirm('Are you sure you want to cancel this card? This action cannot be undone.')) {
        return;
      }
      
      setIsLoading(true);
      try {
        await virtualCardAPI.cancelCard(card.id);
        // Refresh the cards list
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
        {/* Card Display */}
        <div className="relative group">
          {/* Front of card */}
          <div 
            className={`relative w-full h-56 rounded-xl p-6 cursor-pointer transition-all duration-500 transform ${
              isFlipped ? 'rotate-y-180 opacity-0' : 'rotate-y-0 opacity-100'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => setIsFlipped(true)}
          >
            {/* EMV Chip */}
            <div className="absolute top-6 left-6 w-12 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md flex items-center justify-center">
              <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-sm relative">
                <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-700 rounded-full"></div>
                <div className="absolute top-1 left-3 w-1 h-1 bg-yellow-700 rounded-full"></div>
                <div className="absolute top-1 left-5 w-1 h-1 bg-yellow-700 rounded-full"></div>
                <div className="absolute top-3 left-1 w-1 h-1 bg-yellow-700 rounded-full"></div>
                <div className="absolute top-3 left-3 w-1 h-1 bg-yellow-700 rounded-full"></div>
                <div className="absolute top-3 left-5 w-1 h-1 bg-yellow-700 rounded-full"></div>
              </div>
            </div>

            {/* PrimeTrust Logo */}
            <div className="absolute top-6 right-6 text-white font-semibold text-lg">
              PrimeTrust
            </div>

            {/* Card Number */}
            <div className="absolute top-24 left-6 right-6">
              <div className="text-white text-2xl font-mono tracking-wider">
                {formatCardNumber(card.card_number)}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="absolute bottom-16 left-6">
              <div className="text-white text-sm opacity-80">Valid Thru</div>
              <div className="text-white font-mono">{card.expiry_month}/{card.expiry_year}</div>
            </div>

            {/* Cardholder Name */}
            <div className="absolute bottom-6 left-6">
              <div className="text-white text-sm opacity-80">Cardholder</div>
              <div className="text-white font-semibold">{card.user_name || 'Card Holder'}</div>
            </div>

            {/* Card Type Logo */}
            <div className="absolute bottom-6 right-6">
              <div className="text-white text-xs opacity-80 mb-1">{card.card_type}</div>
              <div className="flex items-center space-x-1">
                <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                <div className="w-6 h-6 bg-orange-500 rounded-full -ml-2"></div>
                <span className="text-white text-xs ml-1">Mastercard</span>
              </div>
            </div>

            {/* Hover effect */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl"></div>
          </div>

          {/* Back of card */}
          <div 
            className={`absolute inset-0 w-full h-56 rounded-xl p-6 cursor-pointer transition-all duration-500 transform ${
              isFlipped ? 'rotate-y-0 opacity-100' : 'rotate-y-180 opacity-0'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => setIsFlipped(false)}
          >
            {/* Magnetic stripe */}
            <div className="absolute top-6 left-0 right-0 h-8 bg-black"></div>
            
            {/* Signature panel */}
            <div className="absolute top-20 left-6 right-6 h-12 bg-white rounded flex items-center justify-end pr-4">
              <div className="text-gray-600 font-mono text-sm">CVV</div>
              <div className="ml-2 w-12 h-6 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-600 font-mono text-sm">
                  {showCVV ? card.cvv : '•••'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCVV(!showCVV);
                }}
                className="ml-2 text-blue-600 text-xs underline"
              >
                {showCVV ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Card info */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-white text-xs opacity-80 mb-2">Card Information</div>
              <div className="text-white text-sm">
                <div>Daily Limit: ${card.daily_limit?.toLocaleString()}</div>
                <div>Monthly Limit: ${card.monthly_limit?.toLocaleString()}</div>
                <div>Status: <span className={`${card.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                  {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                </span></div>
              </div>
            </div>

            {/* Flip back hint */}
            <div className="absolute top-6 right-6 text-white text-xs opacity-60">
              Click to flip back
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex space-x-2">
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
      <div className="space-y-6">
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
        {cards.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">My Virtual Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card, index) => (
                <VirtualCard key={card.id} card={card} />
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