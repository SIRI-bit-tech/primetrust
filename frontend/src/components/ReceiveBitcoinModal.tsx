'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const fetchWalletData = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous requests
    
    setIsLoading(true);
    try {
      const walletData = await bitcoinAPI.getWallet();
      setWallet(walletData);
    } catch (error: unknown) {
      console.error('Error fetching wallet data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet information';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isLoading]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Receive Bitcoin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : wallet ? (
            <>
              {/* QR Code Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <QrCode className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Scan QR Code</h3>
                    </div>
                    
                    {wallet.qr_code_url ? (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg inline-block">
                          <Image
                            src={wallet.qr_code_url}
                            alt="Bitcoin QR Code"
                            width={192}
                            height={192}
                            className="object-contain"
                          />
                        </div>
                        
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={downloadQRCode}
                            disabled={isDownloading}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </Button>
                          
                          <Button
                            onClick={copyQRCode}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copy QR
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          QR code not available. Please contact admin.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Address Section */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Wallet Address</h3>
                      <Badge variant={wallet.is_active ? "default" : "secondary"}>
                        {wallet.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    {wallet.wallet_address ? (
                      <div className="space-y-3">
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="font-mono text-sm break-all">
                            {wallet.wallet_address}
                          </p>
                        </div>
                        
                        <Button
                          onClick={copyWalletAddress}
                          disabled={isCopying}
                          className="w-full flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {isCopying ? 'Copying...' : 'Copy Address'}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          Wallet address not set. Please contact admin.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">How to Receive Bitcoin</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Share your wallet address or QR code with the sender</p>
                    <p>2. Wait for the transaction to be confirmed on the blockchain</p>
                    <p>3. Your balance will be updated automatically</p>
                    <p>4. You&apos;ll receive a notification when the transaction is completed</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Bitcoin wallet not found. Please contact admin to set up your wallet.
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