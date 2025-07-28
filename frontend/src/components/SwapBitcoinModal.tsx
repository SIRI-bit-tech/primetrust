'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, DollarSign, Bitcoin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';
import { bitcoinAPI } from '@/lib/api';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

interface SwapBitcoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: {
    usd: number;
    bitcoin: number;
  };
  onSwapComplete?: () => void;
}

export default function SwapBitcoinModal({ 
  isOpen, 
  onClose, 
  userBalance, 
  onSwapComplete 
}: SwapBitcoinModalProps) {
  const [swapType, setSwapType] = useState<'usd_to_btc' | 'btc_to_usd'>('usd_to_btc');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [estimatedConversion, setEstimatedConversion] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const { toast, toasts, removeToast } = useToast();
  const toastRef = useRef(toast);
  const rateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchExchangeRate = useCallback(async () => {
    if (isLoadingRate) return;
    setIsLoadingRate(true);
    try {
      const response = await bitcoinAPI.getExchangeRate();
      setExchangeRate(response.exchange_rate);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      toastRef.current({
        title: "Error",
        description: "Failed to fetch exchange rate",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRate(false);
    }
  }, [isLoadingRate]);

  useEffect(() => {
    if (amount && exchangeRate) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        setEstimatedConversion('');
        return;
      }

      if (swapType === 'usd_to_btc') {
        const btcAmount = numAmount / exchangeRate;
        setEstimatedConversion(`${btcAmount.toFixed(8)} BTC`);
      } else {
        const usdAmount = numAmount * exchangeRate;
        setEstimatedConversion(`$${usdAmount.toFixed(2)} USD`);
      }
    } else {
      setEstimatedConversion('');
    }
  }, [amount, exchangeRate, swapType]);

  useEffect(() => {
    if (isOpen) {
      fetchExchangeRate();
      rateIntervalRef.current = setInterval(fetchExchangeRate, 30000);
    } else {
      if (rateIntervalRef.current) {
        clearInterval(rateIntervalRef.current);
        rateIntervalRef.current = null;
      }
    }

    return () => {
      if (rateIntervalRef.current) {
        clearInterval(rateIntervalRef.current);
        rateIntervalRef.current = null;
      }
    };
  }, [isOpen, fetchExchangeRate]);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setEstimatedConversion('');
      setSwapType('usd_to_btc');
    }
  }, [isOpen]);

  const handleSwap = async () => {
    if (!amount || !exchangeRate) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (swapType === 'usd_to_btc' && numAmount > userBalance.usd) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough USD balance",
        variant: "destructive",
      });
      return;
    }

    if (swapType === 'btc_to_usd' && numAmount > userBalance.bitcoin) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough Bitcoin balance",
        variant: "destructive",
      });
      return;
    }

    setIsSwapping(true);
    try {
      const swapData = {
        swap_type: swapType,
        amount_from: numAmount,
        amount_to: swapType === 'usd_to_btc' 
          ? numAmount / exchangeRate 
          : numAmount * exchangeRate,
        exchange_rate: exchangeRate,
      };

      await bitcoinAPI.createSwap(swapData);
      
      toast({
        title: "Swap Initiated",
        description: "Your swap is being processed. It will complete in 3 minutes.",
      });

      setAmount('');
      setEstimatedConversion('');
      
      if (onSwapComplete) {
        onSwapComplete();
      }
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: unknown) {
      console.error('Error creating swap:', error);
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.detail || apiError.message || 'Failed to create swap';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwapTypeToggle = () => {
    setSwapType(prev => prev === 'usd_to_btc' ? 'btc_to_usd' : 'usd_to_btc');
    setAmount('');
    setEstimatedConversion('');
  };

  const getMaxAmount = () => {
    if (swapType === 'usd_to_btc') {
      return userBalance.usd.toFixed(2);
    } else {
      return userBalance.bitcoin.toFixed(8);
    }
  };

  const setMaxAmount = () => {
    setAmount(getMaxAmount());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <ArrowLeftRight className="h-5 w-5" />
            Currency Swap
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Current Exchange Rate
              </span>
              {isLoadingRate && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Bitcoin className="h-4 w-4 text-yellow-600" />
              <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                1 BTC = ${exchangeRate ? exchangeRate.toLocaleString() : '...'} USD
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Button
              onClick={handleSwapTypeToggle}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {swapType === 'usd_to_btc' ? 'USD → Bitcoin' : 'Bitcoin → USD'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">From Currency</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {swapType === 'usd_to_btc' ? (
                <DollarSign className="h-4 w-4 text-green-600" />
              ) : (
                <Bitcoin className="h-4 w-4 text-yellow-600" />
              )}
              <span className="flex-1 text-sm">
                {swapType === 'usd_to_btc' ? 'USD' : 'Bitcoin'} 
                ({swapType === 'usd_to_btc' 
                  ? `$${userBalance.usd.toLocaleString()}` 
                  : `${userBalance.bitcoin.toFixed(8)} BTC`
                })
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">To Currency</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {swapType === 'usd_to_btc' ? (
                <Bitcoin className="h-4 w-4 text-yellow-600" />
              ) : (
                <DollarSign className="h-4 w-4 text-green-600" />
              )}
              <span className="flex-1 text-sm">
                {swapType === 'usd_to_btc' ? 'Bitcoin' : 'USD'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              The destination currency is automatically selected based on your source currency
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Amount</Label>
              <Button
                onClick={setMaxAmount}
                variant="ghost"
                size="sm"
                className="text-xs h-auto p-1"
              >
                Max
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
                step={swapType === 'usd_to_btc' ? '0.01' : '0.00000001'}
                min="0"
              />
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                {swapType === 'usd_to_btc' ? 'USD' : 'BTC'}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Enter the amount you want to swap
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Estimated Conversion</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm">
                {estimatedConversion || 'Enter an amount to see conversion'}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSwap}
            disabled={!amount || !exchangeRate || isSwapping || parseFloat(amount) <= 0}
            className="w-full"
            size="lg"
          >
            {isSwapping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Swap...
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Swap Currencies
              </>
            )}
          </Button>

          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              Processing time: ~3 minutes
            </Badge>
          </div>
        </div>
      </DialogContent>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </Dialog>
  );
} 