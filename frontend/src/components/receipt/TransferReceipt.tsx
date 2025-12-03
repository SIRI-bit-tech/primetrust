'use client'

import { motion } from 'framer-motion'
import { Check, X, Clock, Copy, Share2, Download, ArrowLeft } from 'lucide-react'
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

  const handleDownload = () => {
    // Create a simple text receipt
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

  const handleShare = async () => {
    if (onShare) {
      onShare()
    } else {
      // Fallback to download
      await handleDownload()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
        <div
          className={cn(
            'w-full rounded-2xl shadow-2xl overflow-hidden',
            isBitcoin ? 'bg-[#1a1d29]' : 'bg-white'
          )}
        >
        {/* Header */}
        <div className={cn('px-6 py-4 flex items-center justify-between', isBitcoin ? 'bg-[#1a1d29]' : 'bg-white')}>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-full transition-colors',
              isBitcoin ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className={cn('text-lg font-semibold', isBitcoin ? 'text-white' : 'text-gray-900')}>Receipt</h2>
          <button
            onClick={handleShare}
            className={cn(
              'p-2 rounded-full transition-colors',
              isBitcoin ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'
            )}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="receipt-content" className={cn('px-8 pb-8', isBitcoin ? 'bg-[#1a1d29]' : 'bg-white')}>
          {/* Top Section: Status Icon, Title, and Amount in a row */}
          <div className="grid grid-cols-3 gap-6 items-center mb-8">
            {/* Status Icon */}
            <div className="flex justify-center">
              <div className={cn('relative')}>
                <div className={cn('absolute inset-0 rounded-full animate-ping', statusConfig.iconRing)} />
                <div className={cn('relative w-20 h-20 rounded-full flex items-center justify-center', statusConfig.iconBg)}>
                  <StatusIcon className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Title & Date */}
            <div className="text-center">
              <h3 className={cn('text-2xl font-bold mb-2', isBitcoin ? 'text-white' : 'text-gray-900')}>
                {statusConfig.title}
              </h3>
              <p className={cn('text-sm', isBitcoin ? 'text-gray-400' : 'text-gray-500')}>{date}</p>
              {isPending && !isBitcoin && (
                <p className={cn('text-xs mt-2', 'text-yellow-600 dark:text-yellow-500')}>
                  Your account has been debited. Transfer will complete in 3-5 minutes.
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="text-center">
              {isBitcoin ? (
                <>
                  <div className="text-4xl font-bold text-white mb-1">{btcAmount?.toFixed(5)} BTC</div>
                  <div className="text-gray-400 text-sm">~{formatCurrency(usdAmount || 0)}</div>
                </>
              ) : (
                <>
                  <div className={cn('text-4xl font-bold mb-1', isBitcoin ? 'text-white' : 'text-gray-900')}>
                    {formatCurrency(amount)}
                  </div>
                  <div className={cn('text-sm', isBitcoin ? 'text-gray-400' : 'text-gray-500')}>{currency}</div>
                </>
              )}
            </div>
          </div>

          {/* Details - Two Column Layout */}
          <div className={cn('rounded-xl p-6 mb-6', isBitcoin ? 'bg-[#252936]' : 'bg-gray-50')}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Sender */}
                <div>
                  <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>
                    {isBitcoin ? 'From' : 'Sender'}
                  </span>
                  <div className={cn('font-medium', isBitcoin ? 'text-white' : 'text-gray-900')}>{sender}</div>
                  {isBitcoin && senderWallet && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-mono">{senderWallet}</span>
                      <button
                        onClick={() => copyToClipboard(senderWallet, 'sender')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Transfer Type (Non-Bitcoin) */}
                {!isBitcoin && transferType && (
                  <div>
                    <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>Transfer Type</span>
                    <span className={cn('font-medium', isBitcoin ? 'text-white' : 'text-gray-900')}>{transferType}</span>
                  </div>
                )}

                {/* Network Fee (Bitcoin only) */}
                {isBitcoin && networkFee !== undefined && (
                  <div>
                    <span className="text-sm block mb-1 text-gray-400">Network Fee</span>
                    <div className="text-white font-medium">{networkFee.toFixed(5)} BTC</div>
                    <div className="text-xs text-gray-400">~{formatCurrency(networkFee * (usdAmount || 0) / (btcAmount || 1))}</div>
                  </div>
                )}

                {/* Reference ID */}
                <div>
                  <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>Reference ID</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium font-mono', isBitcoin ? 'text-white' : 'text-gray-900')}>
                      #{referenceId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(referenceId, 'reference')}
                      className={cn('transition-colors', isBitcoin ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Recipient */}
                <div>
                  <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>
                    {isBitcoin ? 'To' : 'Recipient'}
                  </span>
                  <div className={cn('font-medium', isBitcoin ? 'text-white' : 'text-gray-900')}>{recipient}</div>
                  {isBitcoin && recipientWallet && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-mono">{recipientWallet}</span>
                      <button
                        onClick={() => copyToClipboard(recipientWallet, 'recipient')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>Date</span>
                  <span className={cn('font-medium', isBitcoin ? 'text-white' : 'text-gray-900')}>{date}</span>
                </div>

                {/* Status */}
                <div>
                  <span className={cn('text-sm block mb-1', isBitcoin ? 'text-gray-400' : 'text-gray-600')}>Status</span>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium inline-block', statusConfig.statusBg)}>
                    {statusConfig.statusText}
                  </span>
                </div>

                {/* Transaction Hash (Bitcoin only) */}
                {isBitcoin && transactionHash && (
                  <div>
                    <span className="text-sm block mb-1 text-gray-400">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-400 font-mono">{transactionHash}</span>
                      <button
                        onClick={() => copyToClipboard(transactionHash, 'hash')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copy notification */}
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center mb-4">
                <span className={cn('text-sm', isBitcoin ? 'text-green-400' : 'text-green-600')}>
                  Copied to clipboard!
                </span>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className={cn(
                'flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                isBitcoin
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              )}
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <button
              onClick={onClose}
              className={cn(
                'flex-1 py-3 px-4 rounded-xl font-semibold transition-all',
                isBitcoin
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              Done
            </button>
          </div>
        </div>
        </div>
        </motion.div>
      </div>
    </div>
  )
}
