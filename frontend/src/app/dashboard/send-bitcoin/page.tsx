'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { bitcoinAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { BitcoinBalance, BitcoinPrice } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Bitcoin, 
  Building, 
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

export default function SendBitcoinPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [bitcoinData, setBitcoinData] = useState<BitcoinBalance | null>(null)
  const [priceData, setPriceData] = useState<BitcoinPrice | null>(null)
  
  // Form state
  const [balanceSource, setBalanceSource] = useState<'fiat' | 'bitcoin'>('fiat')
  const [amountUsd, setAmountUsd] = useState('')
  const [amountBtc, setAmountBtc] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [transactionPin, setTransactionPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceResponse, priceResponse] = await Promise.all([
          bitcoinAPI.getBalance(),
          bitcoinAPI.getPrice()
        ])
        setBitcoinData(balanceResponse)
        setPriceData(priceResponse)
      } catch (error) {
        console.error('Error fetching Bitcoin data:', error)
      }
    }
    fetchData()
  }, [])

  // Calculate conversion in real-time
  useEffect(() => {
    if (priceData && balanceSource === 'fiat' && amountUsd) {
      const usdAmount = parseFloat(amountUsd) || 0
      const btcAmount = usdAmount / priceData.price_usd
      setAmountBtc(btcAmount.toFixed(8))
    } else if (priceData && balanceSource === 'bitcoin' && amountBtc) {
      const btcAmount = parseFloat(amountBtc) || 0
      const usdAmount = btcAmount * priceData.price_usd
      setAmountUsd(usdAmount.toFixed(2))
    }
  }, [amountUsd, amountBtc, balanceSource, priceData])

  const handleSendBitcoin = async () => {
    if (!amountUsd && !amountBtc) {
      alert('Please enter an amount')
      return
    }
    if (!recipientAddress) {
      alert('Please enter recipient wallet address')
      return
    }
    if (!transactionPin) {
      alert('Please enter your transaction PIN')
      return
    }

    setIsLoading(true)
    try {
      const data: {
        balance_source: 'fiat' | 'bitcoin'
        recipient_wallet_address: string
        transaction_pin: string
        amount_usd?: number
        amount_btc?: number
      } = {
        balance_source: balanceSource,
        recipient_wallet_address: recipientAddress,
        transaction_pin: transactionPin
      }

      if (balanceSource === 'fiat') {
        data.amount_usd = parseFloat(amountUsd)
      } else {
        data.amount_btc = parseFloat(amountBtc)
      }

      const response = await bitcoinAPI.sendBitcoin(data)
      alert('Bitcoin transaction initiated successfully!')
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send Bitcoin'
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cryptocurrency Withdrawal Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Cryptocurrency Withdrawal</h2>
              <p className="text-blue-100">Withdrawals are typically processed within 1-3 hours.</p>
            </div>
          </CardContent>
        </Card>

        {/* Select Balance to Use */}
        <Card>
          <CardHeader>
            <CardTitle>Select Balance to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fiat Balance Card */}
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                balanceSource === 'fiat' 
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg' 
                  : 'border-border hover:border-blue-300/50 bg-card'
              }`}
              onClick={() => setBalanceSource('fiat')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    balanceSource === 'fiat' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  }`}>
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Fiat Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(user?.balance || 0)}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  balanceSource === 'fiat' 
                    ? 'border-blue-500 bg-blue-500 scale-110' 
                    : 'border-muted-foreground/30'
                }`}>
                  {balanceSource === 'fiat' && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>

            {/* Bitcoin Balance Card */}
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                balanceSource === 'bitcoin' 
                  ? 'border-orange-500 bg-orange-500/10 shadow-lg' 
                  : 'border-border hover:border-orange-300/50 bg-card'
              }`}
              onClick={() => setBalanceSource('bitcoin')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    balanceSource === 'bitcoin' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400'
                  }`}>
                    <Bitcoin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Bitcoin Balance</p>
                    <p className="text-2xl font-bold">{bitcoinData?.bitcoin_balance || '0.00000000'} BTC</p>
                    <p className="text-sm text-muted-foreground">
                      ~{formatCurrency(bitcoinData?.bitcoin_balance_usd || 0)}
                    </p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  balanceSource === 'bitcoin' 
                    ? 'border-orange-500 bg-orange-500 scale-110' 
                    : 'border-muted-foreground/30'
                }`}>
                  {balanceSource === 'bitcoin' && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount to Transfer */}
        <Card>
          <CardHeader>
            <CardTitle>Amount to Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00000000"
                  value={balanceSource === 'fiat' ? amountUsd : amountBtc}
                  onChange={(e) => {
                    if (balanceSource === 'fiat') {
                      setAmountUsd(e.target.value)
                    } else {
                      setAmountBtc(e.target.value)
                    }
                  }}
                  className="flex-1"
                />
                <Badge variant="outline" className="px-3 py-2">
                  {balanceSource === 'fiat' ? 'USD' : 'BTC'}
                </Badge>
              </div>
              
              {/* Conversion display */}
              {balanceSource === 'fiat' && amountUsd && priceData && (
                <p className="text-sm text-muted-foreground mt-2">
                  = {amountBtc} BTC (at ${priceData.price_usd.toLocaleString()}/BTC)
                </p>
              )}
              {balanceSource === 'bitcoin' && amountBtc && priceData && (
                <p className="text-sm text-muted-foreground mt-2">
                  = {formatCurrency(parseFloat(amountUsd) || 0)} USD (at ${priceData.price_usd.toLocaleString()}/BTC)
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (balanceSource === 'fiat') {
                    setAmountUsd('100')
                  } else {
                    setAmountBtc('0.001')
                  }
                }}
              >
                {balanceSource === 'fiat' ? '$100' : '0.001 BTC'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (balanceSource === 'fiat') {
                    setAmountUsd('1000')
                  } else {
                    setAmountBtc('0.01')
                  }
                }}
              >
                {balanceSource === 'fiat' ? '$1,000' : '0.01 BTC'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (balanceSource === 'fiat') {
                    setAmountUsd((user?.balance || 0).toString())
                  } else {
                    setAmountBtc(bitcoinData?.bitcoin_balance || '0')
                  }
                }}
              >
                Max
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Address */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="wallet-address">Recipient Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="Enter wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
            </div>

            {/* Warning Message */}
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Double-check your wallet address. Transactions to incorrect addresses cannot be reversed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction PIN */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction PIN</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="transaction-pin">Enter your 4-digit PIN</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="transaction-pin"
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter your 4-digit PIN"
                  value={transactionPin}
                  onChange={(e) => setTransactionPin(e.target.value)}
                  maxLength={4}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Send Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSendBitcoin}
            disabled={isLoading || !amountUsd && !amountBtc || !recipientAddress || !transactionPin}
            className="w-full max-w-md"
            size="lg"
          >
            {isLoading ? 'Processing...' : 'Send Bitcoin'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
} 