'use client'

import { useState } from 'react'
import { Upload, Camera, DollarSign, FileText, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bankingAPI } from '@/lib/api'
import { CheckDepositCreate, OCRExtractResponse } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface CheckDepositFormProps {
  onSuccess?: () => void
}

export default function CheckDepositForm({ onSuccess }: CheckDepositFormProps) {
  const { toast } = useToast()
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string>('')
  const [backPreview, setBackPreview] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [payerName, setPayerName] = useState('')
  const [memo, setMemo] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageChange = async (file: File, side: 'front' | 'back') => {
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      if (side === 'front') {
        setFrontImage(file)
        setFrontPreview(reader.result as string)
        extractCheckData(file)
      } else {
        setBackImage(file)
        setBackPreview(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const extractCheckData = async (file: File) => {
    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('front_image', file)
      
      const response = await bankingAPI.extractCheckData(formData)
      
      if (response.amount) {
        setAmount(response.amount.toString())
      }
      if (response.check_number) {
        setCheckNumber(response.check_number)
      }
      
      if (response.message) {
        toast({
          title: 'OCR Extraction',
          description: response.message,
          variant: response.amount ? 'default' : 'destructive'
        })
      }
    } catch (error) {
      console.error('OCR extraction failed:', error)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!frontImage) {
      toast({
        title: 'Missing Front Image',
        description: 'Please upload the front image of the check',
        variant: 'destructive'
      })
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid check amount',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('front_image', frontImage)
      if (backImage) {
        formData.append('back_image', backImage)
      }
      formData.append('amount', amount)
      formData.append('check_number', checkNumber)
      formData.append('payer_name', payerName)
      formData.append('memo', memo)

      await bankingAPI.createCheckDeposit(formData)

      toast({
        title: 'Check Deposit Submitted',
        description: 'Your check deposit is being reviewed. You will be notified once approved.',
      })

      // Reset form
      setFrontImage(null)
      setBackImage(null)
      setFrontPreview('')
      setBackPreview('')
      setAmount('')
      setCheckNumber('')
      setPayerName('')
      setMemo('')

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Deposit Failed',
        description: error.response?.data?.error || 'Failed to submit check deposit',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Image */}
        <div className="space-y-2">
          <Label htmlFor="front-image">Check Front *</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
            {frontPreview ? (
              <div className="relative">
                <img src={frontPreview} alt="Check front" className="w-full h-48 object-contain rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFrontImage(null)
                    setFrontPreview('')
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label htmlFor="front-image" className="cursor-pointer block">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload front image</p>
                <input
                  id="front-image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0], 'front')}
                />
              </label>
            )}
          </div>
          {isExtracting && (
            <div className="flex items-center gap-2 text-sm text-blue-500">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Reading check details...</span>
            </div>
          )}
        </div>

        {/* Back Image */}
        <div className="space-y-2">
          <Label htmlFor="back-image">Check Back (Optional)</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
            {backPreview ? (
              <div className="relative">
                <img src={backPreview} alt="Check back" className="w-full h-48 object-contain rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setBackImage(null)
                    setBackPreview('')
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label htmlFor="back-image" className="cursor-pointer block">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload back image</p>
                <input
                  id="back-image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0], 'back')}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="check-number">Check Number</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="check-number"
              type="text"
              placeholder="Optional"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payer-name">Payer Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="payer-name"
            type="text"
            placeholder="Who wrote the check?"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">Memo</Label>
        <Textarea
          id="memo"
          placeholder="Optional note about this deposit"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
        />
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Your check deposit will be reviewed by our team. Funds typically become available within 1-5 business days after approval.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !frontImage}>
        {isSubmitting ? 'Submitting...' : 'Submit Check Deposit'}
      </Button>
    </form>
  )
}
