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
  Lock
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { bankingAPI } from '@/lib/api'
import { VirtualCard } from '@/types'
import { maskCardNumber} from '@/lib/utils'

export default function CardsPage() {
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCVV, setShowCVV] = useState<{ [key: number]: boolean }>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      const cardsData = await bankingAPI.getCards()
      setCards(cardsData)
    } catch (error) {
      console.error('Error loading cards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateNewCard = async () => {
    setIsGenerating(true)
    try {
      const newCard = await bankingAPI.generateCard()
      setCards([...cards, newCard])
    } catch (error) {
      console.error('Error generating card:', error)
    } finally {
      setIsGenerating(false)
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
      case 'visa':
        return 'from-blue-600 to-blue-800'
      case 'mastercard':
        return 'from-orange-500 to-red-600'
      default:
        return 'from-primary-dark to-primary-navy'
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
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Virtual Cards</h1>
            <p className="text-gray-600 mt-2">
              Manage your virtual credit cards for secure online transactions.
            </p>
          </div>
          <button
            onClick={generateNewCard}
            disabled={isGenerating}
            className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Generate New Card
              </>
            )}
          </button>
        </div>

        {/* Cards Grid */}
        {cards.length > 0 ? (
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
                      {maskCardNumber(card.card_number)}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={card.card_number}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(card.card_number, `card-${card.id}`)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={showCVV[card.id] ? card.cvv : '•••'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(card.cvv, `cvv-${card.id}`)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        card.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Created</span>
                      <span className="text-sm text-gray-900">
                        {new Date(card.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Virtual Cards Yet</h3>
            <p className="text-gray-600 mb-6">
              Generate your first virtual card to start making secure online transactions.
            </p>
            <button
              onClick={generateNewCard}
              disabled={isGenerating}
              className="bg-gradient-to-r from-primary-dark to-primary-navy text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center mx-auto"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Generate Your First Card
                </>
              )}
            </button>
          </div>
        )}

        {/* Security Information */}
        <div className="bg-blue-50 rounded-lg p-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Virtual Card Security
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
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
                <span>Generate new cards anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="bg-gray-50 rounded-lg p-6 animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Usage Tips
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Keep your CVV secure and never share it with anyone</p>
            <p>• Use different cards for different types of transactions</p>
            <p>• Monitor your transactions regularly for any suspicious activity</p>
            <p>• Virtual cards are perfect for online shopping and subscriptions</p>
            <p>• You can generate as many cards as you need</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 