'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User, Mail, Phone, Calendar, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const registerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  phone_number: z.string().min(10, 'Please enter a valid phone number'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    required_error: 'Please select your gender',
  }),
  address: z.string().min(1, 'Address is required'),
  state: z.string().min(1, 'Please select your state'),
  city: z.string().min(1, 'Please enter your city'),
  zip_code: z.string().min(5, 'Please enter a valid ZIP code'),
  country: z.string().default('US'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const US_STATES = [
  { name: 'Alabama', abbreviation: 'AL' },
  { name: 'Alaska', abbreviation: 'AK' },
  { name: 'Arizona', abbreviation: 'AZ' },
  { name: 'Arkansas', abbreviation: 'AR' },
  { name: 'California', abbreviation: 'CA' },
  { name: 'Colorado', abbreviation: 'CO' },
  { name: 'Connecticut', abbreviation: 'CT' },
  { name: 'Delaware', abbreviation: 'DE' },
  { name: 'Florida', abbreviation: 'FL' },
  { name: 'Georgia', abbreviation: 'GA' },
  { name: 'Hawaii', abbreviation: 'HI' },
  { name: 'Idaho', abbreviation: 'ID' },
  { name: 'Illinois', abbreviation: 'IL' },
  { name: 'Indiana', abbreviation: 'IN' },
  { name: 'Iowa', abbreviation: 'IA' },
  { name: 'Kansas', abbreviation: 'KS' },
  { name: 'Kentucky', abbreviation: 'KY' },
  { name: 'Louisiana', abbreviation: 'LA' },
  { name: 'Maine', abbreviation: 'ME' },
  { name: 'Maryland', abbreviation: 'MD' },
  { name: 'Massachusetts', abbreviation: 'MA' },
  { name: 'Michigan', abbreviation: 'MI' },
  { name: 'Minnesota', abbreviation: 'MN' },
  { name: 'Mississippi', abbreviation: 'MS' },
  { name: 'Missouri', abbreviation: 'MO' },
  { name: 'Montana', abbreviation: 'MT' },
  { name: 'Nebraska', abbreviation: 'NE' },
  { name: 'Nevada', abbreviation: 'NV' },
  { name: 'New Hampshire', abbreviation: 'NH' },
  { name: 'New Jersey', abbreviation: 'NJ' },
  { name: 'New Mexico', abbreviation: 'NM' },
  { name: 'New York', abbreviation: 'NY' },
  { name: 'North Carolina', abbreviation: 'NC' },
  { name: 'North Dakota', abbreviation: 'ND' },
  { name: 'Ohio', abbreviation: 'OH' },
  { name: 'Oklahoma', abbreviation: 'OK' },
  { name: 'Oregon', abbreviation: 'OR' },
  { name: 'Pennsylvania', abbreviation: 'PA' },
  { name: 'Rhode Island', abbreviation: 'RI' },
  { name: 'South Carolina', abbreviation: 'SC' },
  { name: 'South Dakota', abbreviation: 'SD' },
  { name: 'Tennessee', abbreviation: 'TN' },
  { name: 'Texas', abbreviation: 'TX' },
  { name: 'Utah', abbreviation: 'UT' },
  { name: 'Vermont', abbreviation: 'VT' },
  { name: 'Virginia', abbreviation: 'VA' },
  { name: 'Washington', abbreviation: 'WA' },
  { name: 'West Virginia', abbreviation: 'WV' },
  { name: 'Wisconsin', abbreviation: 'WI' },
  { name: 'Wyoming', abbreviation: 'WY' },
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const { register: registerUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '')
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setValue('phone_number', formatted)
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // Clean phone number for backend
      const cleanPhone = data.phone_number.replace(/\D/g, '')
      const submitData = { 
        ...data, 
        phone_number: cleanPhone,
        country: 'US' // Default to US
      }
      
      await registerUser(submitData)
      router.push('/verify-email')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      // Generic error message to prevent information disclosure
      setError('Registration failed. Please check your information and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left Section - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-8 lg:px-16">
          <div className="animate-in slide-in-from-left-4 duration-500">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
              PRIMETRUST
            </h1>
            <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-6">
              SECURE BANKING
            </h2>
            <p className="text-xl text-white/90 mb-4">
              Where Your Financial Dreams Become Reality
            </p>
            <p className="text-lg text-white/80">
              Experience modern banking with cutting-edge security and seamless transactions.
            </p>
          </div>
        </div>

        {/* Right Section - Registration Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Back to Home */}
            <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
              <Link
                href="/"
                className="inline-flex items-center text-white hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>

            {/* Registration Card */}
            <Card className="animate-in slide-in-from-bottom-4 duration-500 delay-100 backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-white">Create Your Account</CardTitle>
                <CardDescription className="text-lg text-white/80">
                  Join PrimeTrust and start your financial journey today
                </CardDescription>
              </CardHeader>
                             <CardContent className="space-y-4">
             {error && (
               <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                 <AlertDescription>{error}</AlertDescription>
               </Alert>
             )}

             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
               {/* Name and Username */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="first_name" className="text-white text-sm">First Name</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('first_name')}
                       id="first_name"
                       placeholder="First name"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.first_name && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.first_name && (
                     <p className="text-xs text-red-300">{errors.first_name.message}</p>
                   )}
                 </div>

                 <div className="space-y-1">
                   <Label htmlFor="last_name" className="text-white text-sm">Last Name</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('last_name')}
                       id="last_name"
                       placeholder="Last name"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.last_name && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.last_name && (
                     <p className="text-xs text-red-300">{errors.last_name.message}</p>
                   )}
                 </div>
               </div>

               {/* Username and Phone */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="username" className="text-white text-sm">Username</Label>
                   <div className="relative">
                     <User className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('username')}
                       id="username"
                       placeholder="Username"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.username && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.username && (
                     <p className="text-xs text-red-300">{errors.username.message}</p>
                   )}
                 </div>

                 <div className="space-y-1">
                   <Label htmlFor="phone_number" className="text-white text-sm">Phone</Label>
                   <div className="relative">
                     <Phone className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('phone_number')}
                       id="phone_number"
                       placeholder="(555) 123-4567"
                       onChange={handlePhoneChange}
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.phone_number && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.phone_number && (
                     <p className="text-xs text-red-300">{errors.phone_number.message}</p>
                   )}
                 </div>
               </div>

               {/* Email and Date of Birth */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="email" className="text-white text-sm">Email</Label>
                   <div className="relative">
                     <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('email')}
                       type="email"
                       id="email"
                       placeholder="Email address"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.email && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.email && (
                     <p className="text-xs text-red-300">{errors.email.message}</p>
                   )}
                 </div>

                 <div className="space-y-1">
                   <Label htmlFor="date_of_birth" className="text-white text-sm">Date of Birth</Label>
                   <div className="relative">
                     <Calendar className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('date_of_birth')}
                       type="date"
                       id="date_of_birth"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white backdrop-blur-sm h-9",
                         errors.date_of_birth && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.date_of_birth && (
                     <p className="text-xs text-red-300">{errors.date_of_birth.message}</p>
                   )}
                 </div>
               </div>

               {/* Address and Gender */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="address" className="text-white text-sm">Address</Label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('address')}
                       id="address"
                       placeholder="Street address"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.address && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.address && (
                     <p className="text-xs text-red-300">{errors.address.message}</p>
                   )}
                 </div>

                 <div className="space-y-1">
                   <Label htmlFor="gender" className="text-white text-sm">Gender</Label>
                   <Select onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other' | 'prefer_not_to_say')}>
                     <SelectTrigger className={cn(
                       "bg-white/10 border-white/20 text-white backdrop-blur-sm h-9",
                       errors.gender && "border-red-400 focus-visible:ring-red-400"
                     )}>
                       <SelectValue placeholder="Select gender" className="text-white/60" />
                     </SelectTrigger>
                                           <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 z-50">
                        <SelectItem value="male" className="hover:bg-gray-100 text-gray-900">Male</SelectItem>
                        <SelectItem value="female" className="hover:bg-gray-100 text-gray-900">Female</SelectItem>
                        <SelectItem value="other" className="hover:bg-gray-100 text-gray-900">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say" className="hover:bg-gray-100 text-gray-900">Prefer not to say</SelectItem>
                      </SelectContent>
                   </Select>
                   {errors.gender && (
                     <p className="text-xs text-red-300">{errors.gender.message}</p>
                   )}
                 </div>
               </div>

               {/* City, State, ZIP */}
               <div className="grid grid-cols-3 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="city" className="text-white text-sm">City</Label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('city')}
                       id="city"
                       placeholder="City"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.city && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.city && (
                     <p className="text-xs text-red-300">{errors.city.message}</p>
                   )}
                 </div>

                                   <div className="space-y-1">
                    <Label htmlFor="state" className="text-white text-sm">State</Label>
                    <Select onValueChange={(value) => setValue('state', value)}>
                      <SelectTrigger className={cn(
                        "bg-white/10 border-white/20 text-white backdrop-blur-sm h-9",
                        errors.state && "border-red-400 focus-visible:ring-red-400"
                      )}>
                                                 <SelectValue placeholder="State" className="text-white/60" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20 max-h-60 overflow-y-auto z-50">
                        {US_STATES.map((state) => (
                          <SelectItem key={state.abbreviation} value={state.abbreviation} className="hover:bg-gray-100 text-gray-900">
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-xs text-red-300">{errors.state.message}</p>
                    )}
                  </div>

                 <div className="space-y-1">
                   <Label htmlFor="zip_code" className="text-white text-sm">ZIP</Label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                     <Input
                       {...register('zip_code')}
                       id="zip_code"
                       placeholder="ZIP code"
                       className={cn(
                         "pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.zip_code && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                   </div>
                   {errors.zip_code && (
                     <p className="text-xs text-red-300">{errors.zip_code.message}</p>
                   )}
                 </div>
               </div>

               {/* Passwords */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Label htmlFor="password" className="text-white text-sm">Password</Label>
                   <div className="relative">
                     <Input
                       {...register('password')}
                       type={showPassword ? 'text' : 'password'}
                       id="password"
                       placeholder="Password"
                       className={cn(
                         "pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.password && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-3 text-white/60 hover:text-white"
                     >
                       {showPassword ? (
                         <EyeOff className="h-4 w-4" />
                       ) : (
                         <Eye className="h-4 w-4" />
                       )}
                     </button>
                   </div>
                   {errors.password && (
                     <p className="text-xs text-red-300">{errors.password.message}</p>
                   )}
                 </div>

                 <div className="space-y-1">
                   <Label htmlFor="confirm_password" className="text-white text-sm">Confirm</Label>
                   <div className="relative">
                     <Input
                       {...register('confirm_password')}
                       type={showConfirmPassword ? 'text' : 'password'}
                       id="confirm_password"
                       placeholder="Confirm password"
                       className={cn(
                         "pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm h-9",
                         errors.confirm_password && "border-red-400 focus-visible:ring-red-400"
                       )}
                     />
                     <button
                       type="button"
                       onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                       className="absolute right-3 top-3 text-white/60 hover:text-white"
                     >
                       {showConfirmPassword ? (
                         <EyeOff className="h-4 w-4" />
                       ) : (
                         <Eye className="h-4 w-4" />
                       )}
                     </button>
                   </div>
                   {errors.confirm_password && (
                     <p className="text-xs text-red-300">{errors.confirm_password.message}</p>
                   )}
                 </div>
               </div>

               {/* Submit Button */}
               <Button
                 type="submit"
                 className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm h-10"
                 disabled={isLoading}
               >
                 {isLoading ? 'Creating Account...' : 'Create Account'}
               </Button>
             </form>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-white/80">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-white hover:text-white/80 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  )
} 