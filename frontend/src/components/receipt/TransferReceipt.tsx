'use client'

import { motion } from 'framer-motion'
import { Check, X, Clock, Copy, Share2, Download, ArrowLeft, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ReceiptData } from '@/types'

interface TransferReceiptProps extends ReceiptData {
  onClose: () => void
  onShare?: () => void
}

export default function TransferReceipt({
  type,
  status,
  amount,
  currency = 'USD',
  btcAmount,
  usdAmount,
  sender,
  recipient,
  recipientWallet,
  senderWallet,
  transferType,
  date,
  referenceId,
  networkFee,
  transactionHash,
  onClose,
  onShare,
}: TransferReceiptProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const isBitcoin = type === 'bitcoin'
  const isCompleted = status === 'completed'
  const isPending = status === 'pending'
  const isFailed = status === 'failed'

  const getStatusConfig = () => {
    if (isCompleted) {
      return {
        icon: Check,
        title: isBitcoin ? 'Transfer Complete' : 'Transfer Successful',
        iconBg: isBitcoin ? 'bg-orange-500' : 'bg-green-500',
        iconRing: isBitcoin ? 'bg-orange-500/20' : 'bg-green-500/20',
        statusBg: isBitcoin ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700',
        statusText: isBitcoin ? 'Confirmed' : 'Completed',
      }
    }
    if (isPending) {
      return {
        icon: Clock,
        title: 'Transfer Pending',
        iconBg: 'bg-yellow-500',
        iconRing: 'bg-yellow-500/20',
        statusBg: 'bg-yellow-100 text-yellow-700',
        statusText: 'Pending',
      }
    }
    return {
      icon: X,
      title: 'Transfer Failed',
      iconBg: 'bg-red-500',
      iconRing: 'bg-red-500/20',
      statusBg: 'bg-red-100 text-red-700',
      statusText: 'Failed',
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownload = async () => {
    const element = document.getElementById('receipt-content')
    if (!element) return

    try {
      // Import html2canvas dynamically to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(element, {
        backgroundColor: isBitcoin ? '#1a1d29' : '#ffffff',
        scale: 3, // High quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `receipt-${referenceId}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error generating receipt image:', error)

      // Fallback to text receipt
      const receiptText = `
═══════════════════════════════════════
           TRANSFER RECEIPT
═══════════════════════════════════════

Status: ${statusConfig.statusText}
Date: ${date}

${isBitcoin ? `Amount: ${btcAmount?.toFixed(5)} BTC (~${formatCurrency(usdAmount || 0)})` : `Amount: ${formatCurrency(amount)} ${currency}`}

From: ${sender}
${isBitcoin && senderWallet ? `Wallet: ${senderWallet}` : ''}

To: ${recipient}
${isBitcoin && recipientWallet ? `Wallet: ${recipientWallet}` : ''}

${!isBitcoin && transferType ? `Transfer Type: ${transferType}` : ''}
${isBitcoin && networkFee ? `Network Fee: ${networkFee.toFixed(5)} BTC` : ''}

Reference ID: ${referenceId}
${isBitcoin && transactionHash ? `Transaction Hash: ${transactionHash}` : ''}

═══════════════════════════════════════
      `

      const blob = new Blob([receiptText], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `receipt-${referenceId}.txt`
      link.href = url
      link.click()
      window.URL.revokeObjectURL(url)
    }
  }

  const handleShare = async () => {
    if (onShare) {
      onShare()
    } else {
      // Fallback to download
      await handleDownload()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[360px] my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative"
        >
          <div
            id="receipt-content"
            className={cn(
              'relative w-full rounded-[24px] overflow-hidden shadow-2xl border',
              isBitcoin
                ? 'bg-[#0a0c14] border-white/5'
                : 'bg-white border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]'
            )}
          >
            {/* Close Button (Integrated into Header) - Hidden on Print */}
            <button
              onClick={onClose}
              className={cn(
                "absolute top-4 right-4 z-20 p-2 rounded-full transition-colors print:hidden",
                isBitcoin ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Watermark Circle Element */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden select-none">
              <div className={cn(
                "relative w-[320px] h-[320px] rounded-full border flex items-center justify-center",
                isBitcoin ? "border-white/[0.02]" : "border-gray-100"
              )}>
                <div className={cn(
                  "text-[24px] font-black tracking-[0.4em] opacity-[0.02] uppercase",
                  isBitcoin ? "text-white" : "text-black"
                )}>
                  PRIMETRUST
                </div>
              </div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 p-5 pt-8 flex flex-col items-center">

              {/* Status Icon with Glow */}
              <div className="mb-3">
                <div className="relative">
                  <div className={cn(
                    'absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse',
                    statusConfig.iconBg
                  )} />
                  <div className={cn(
                    'relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg',
                    statusConfig.iconBg
                  )}>
                    <StatusIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="text-center mb-4">
                <h3 className={cn(
                  'text-lg font-bold mb-0.5',
                  isBitcoin ? 'text-white' : 'text-gray-900'
                )}>
                  {statusConfig.title}
                </h3>
                <p className={cn(
                  'text-[9px] font-mono tracking-widest opacity-40 uppercase',
                  isBitcoin ? 'text-white' : 'text-gray-500'
                )}>
                  ID: #{referenceId}
                </p>
              </div>

              {/* Amount Section */}
              <div className="text-center mb-6">
                <span className={cn(
                  'text-[8px] font-bold tracking-[0.2em] uppercase opacity-40 block mb-1',
                  isBitcoin ? 'text-white' : 'text-gray-600'
                )}>
                  Amount Transferred
                </span>
                <div className="flex flex-col items-center">
                  {isBitcoin ? (
                    <>
                      <div className="text-3xl font-black text-white mb-1.5 tracking-tight">
                        {btcAmount?.toFixed(5)} <span className="text-lg font-medium text-white/40">BTC</span>
                      </div>
                      <div className="px-2.5 py-1 bg-white/5 rounded-full backdrop-blur-sm">
                        <span className="text-white/60 text-[10px] font-medium">
                          ≈ {formatCurrency(usdAmount || 0)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className={cn(
                      'text-4xl font-black tracking-tight',
                      isBitcoin ? 'text-white' : 'text-gray-900'
                    )}>
                      {formatCurrency(amount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Details List */}
              <div className="w-full space-y-3 mb-5">
                {/* Date Row */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05] dark:border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", isBitcoin ? "bg-white/5" : "bg-gray-50")}>
                      <Clock className={cn("w-3.5 h-3.5", isBitcoin ? "text-white/40" : "text-gray-400")} />
                    </div>
                    <span className={cn("text-xs font-medium", isBitcoin ? "text-white/40" : "text-gray-500")}>Date</span>
                  </div>
                  <span className={cn("text-xs font-semibold", isBitcoin ? "text-white" : "text-gray-900")}>
                    {date}
                  </span>
                </div>

                {/* Sender Row */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05] dark:border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", isBitcoin ? "bg-white/5" : "bg-gray-50")}>
                      <Check className={cn("w-3.5 h-3.5", isBitcoin ? "text-white/40" : "text-gray-400")} />
                    </div>
                    <span className={cn("text-xs font-medium", isBitcoin ? "text-white/40" : "text-gray-500")}>From</span>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xs font-semibold", isBitcoin ? "text-white" : "text-gray-900")}>{sender}</div>
                    {isBitcoin && senderWallet ? (
                      <div className="text-[9px] font-mono text-white/30 truncate max-w-[120px]">{senderWallet}</div>
                    ) : (
                      <div className={cn("text-[8px] font-mono opacity-30", isBitcoin ? "text-white" : "text-gray-500")}>
                        Personal Account
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient Row */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05] dark:border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", isBitcoin ? "bg-white/5" : "bg-gray-50")}>
                      <Share2 className={cn("w-3.5 h-3.5", isBitcoin ? "text-white/40" : "text-gray-400")} />
                    </div>
                    <span className={cn("text-xs font-medium", isBitcoin ? "text-white/40" : "text-gray-500")}>To</span>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xs font-semibold", isBitcoin ? "text-white" : "text-gray-900")}>{recipient}</div>
                    {isBitcoin && recipientWallet ? (
                      <div className="text-[9px] font-mono text-white/30 truncate max-w-[120px]">{recipientWallet}</div>
                    ) : (
                      <div className={cn("text-[8px] font-mono opacity-30 uppercase", isBitcoin ? "text-white" : "text-gray-500")}>
                        Ref: {referenceId.slice(-8)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Network Fee Row (Bitcoin Only) */}
                {isBitcoin && networkFee !== undefined && (
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/5 rounded-lg">
                        <DollarSign className="w-3.5 h-3.5 text-white/40" />
                      </div>
                      <span className="text-xs font-medium text-white/40">Network Fee</span>
                    </div>
                    <div className="text-right text-xs font-semibold text-white">
                      {networkFee.toFixed(5)} BTC
                    </div>
                  </div>
                )}

                {/* Transaction Hash Row (Bitcoin Only) */}
                {isBitcoin && transactionHash && (
                  <div className="flex flex-col pb-2.5 border-b border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 bg-white/5 rounded-lg">
                        <Copy className="w-3.5 h-3.5 text-white/40" />
                      </div>
                      <span className="text-xs font-medium text-white/40">Hash</span>
                    </div>
                    <div className="text-[8px] font-mono text-blue-400 break-all bg-white/5 p-1.5 rounded-lg">
                      {transactionHash}
                    </div>
                  </div>
                )}

                {/* Transfer Type Row */}
                <div className="flex flex-col pb-2.5 border-b border-white/[0.05] dark:border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", isBitcoin ? "bg-white/5" : "bg-gray-50")}>
                        <Share2 className={cn("w-3.5 h-3.5", isBitcoin ? "text-white/40" : "text-gray-400")} />
                      </div>
                      <span className={cn("text-xs font-medium", isBitcoin ? "text-white/40" : "text-gray-500")}>Type</span>
                    </div>
                    <span className={cn("text-[10px] font-bold tracking-widest uppercase opacity-60", isBitcoin ? "text-white" : "text-gray-700")}>
                      {transferType || (isBitcoin ? 'Bitcoin' : 'Transfer')}
                    </span>
                  </div>
                </div>

                {/* Status Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", isBitcoin ? "bg-white/5" : "bg-gray-50")}>
                      <Check className={cn("w-3.5 h-3.5", isBitcoin ? "text-white/40" : "text-gray-400")} />
                    </div>
                    <span className={cn("text-xs font-medium", isBitcoin ? "text-white/40" : "text-gray-500")}>Status</span>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter',
                    statusConfig.statusBg
                  )}>
                    • {statusConfig.statusText}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Hidden during Export/Print */}
              <div className="w-full space-y-2.5 print:hidden" data-html2canvas-ignore="true">
                <button
                  onClick={handleDownload}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99]",
                    isBitcoin
                      ? "bg-orange-500 text-white shadow-[0_4px_16px_-4px_rgba(249,115,22,0.4)]"
                      : "bg-[#00ff84] text-[#0a0c14] shadow-[0_4px_16px_-4px_rgba(0,255,132,0.4)]"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShare}
                    className={cn(
                      "py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all",
                      isBitcoin
                        ? "bg-white/5 text-white hover:bg-white/10"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    )}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <button
                    onClick={() => window.print()}
                    className={cn(
                      "py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all text-sm",
                      isBitcoin
                        ? "bg-white/5 text-white hover:bg-white/10"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    )}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>

              {/* Encryption Footer */}
              <div className="mt-6 flex items-center gap-1.5 opacity-25">
                <div className={cn("w-2 h-2 border rounded-sm flex items-center justify-center", isBitcoin ? "border-white" : "border-black")}>
                  <div className={cn("w-1 h-1 rounded-[1px]", isBitcoin ? "bg-white" : "bg-black")} />
                </div>
                <span className={cn("text-[7px] font-bold tracking-[0.2em] uppercase", isBitcoin ? "text-white" : "text-black")}>
                  End-to-End Encrypted
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
