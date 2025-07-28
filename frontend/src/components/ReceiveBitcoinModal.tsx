'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, QrCode, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';
import { bitcoinAPI } from '@/lib/api';

interface BitcoinWallet {
  id: number;
  user: string;
  wallet_address: string;
  qr_code_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ReceiveBitcoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiveBitcoinModal({ isOpen, onClose }: ReceiveBitcoinModalProps) {
  const [wallet, setWallet] = useState<BitcoinWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast, toasts, removeToast } = useToast();
  const toastRef = useRef(toast);
  const isLoadingRef = useRef(false);

  const fetchWalletData = useCallback(async () => {
    if (isLoadingRef.current) return; // Prevent multiple simultaneous requests
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const walletData = await bitcoinAPI.getWallet();
      setWallet(walletData);
    } catch (error: unknown) {
      console.error('Error fetching wallet data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet information';
      toastRef.current({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Fetch wallet data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWalletData();
    }
  }, [isOpen, fetchWalletData]);

  const copyWalletAddress = async () => {
    if (!wallet?.wallet_address) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(wallet.wallet_address);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy wallet address",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const downloadQRCode = async () => {
    if (!wallet?.qr_code_url) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(wallet.qr_code_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wallet.user}_bitcoin_qr_code.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded!",
        description: "QR code downloaded successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyQRCode = async () => {
    if (!wallet?.qr_code_url) return;
    
    try {
      const response = await fetch(wallet.qr_code_url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast({
        title: "Copied!",
        description: "QR code copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <QrCode className="h-5 w-5" />
            Receive Bitcoin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : wallet ? (
            <>
              {/* QR Code Section */}
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold">QR Code</h3>
                </div>
                
                {wallet.qr_code_url ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg inline-block">
                      <Image
                        src={wallet.qr_code_url}
                        alt="Bitcoin QR Code"
                        width={160}
                        height={160}
                        className="object-contain"
                      />
                    </div>
                    
                                         <div className="flex justify-center">
                       <Button
                         onClick={downloadQRCode}
                         disabled={isDownloading}
                         variant="outline"
                         size="sm"
                         className="flex items-center gap-1 text-xs"
                       >
                         <Download className="h-3 w-3" />
                         {isDownloading ? 'Downloading...' : 'Download'}
                       </Button>
                     </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      QR code not available
                    </p>
                  </div>
                )}
              </div>

              {/* Wallet Address Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold">Wallet Address</h3>
                  <Badge variant={wallet.is_active ? "default" : "secondary"} className="text-xs">
                    {wallet.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                {wallet.wallet_address ? (
                  <div className="space-y-2">
                    <div className="bg-muted p-2 rounded-lg">
                      <p className="font-mono text-xs break-all">
                        {wallet.wallet_address}
                      </p>
                    </div>
                    
                    <Button
                      onClick={copyWalletAddress}
                      disabled={isCopying}
                      size="sm"
                      className="w-full flex items-center gap-2 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      {isCopying ? 'Copying...' : 'Copy Address'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">
                      Wallet address not set
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Bitcoin wallet not found
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </Dialog>
  );
} 