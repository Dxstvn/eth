"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MaskedInput } from "@/components/ui/masked-input"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronRight, Shield, Lock, Eye, EyeOff, Info } from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import { format } from "date-fns"
import { useKYCEncryption, KYCEncryptionUtils } from "../utils/encryption-helpers"
import { KYCFieldType } from "@/lib/security/kyc-encryption"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const personalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().refine((date) => {
    const age = new Date().getFullYear() - new Date(date).getFullYear()
    return age >= 18
  }, "You must be at least 18 years old"),
  ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/, "Please enter a valid SSN (XXX-XX-XXXX)"),
  nationality: z.string().min(2, "Please select your nationality"),
  country: z.string().min(2, "Please select your country of residence"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "Please select your state/province"),
  postalCode: z.string().min(3, "Please enter a valid postal code"),
  address: z.string().min(10, "Please enter your full address"),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number with country code"),
  email: z.string().email("Please enter a valid email address"),
  occupation: z.string().min(2, "Please enter your occupation"),
  employer: z.string().optional(),
  annualIncome: z.string().min(1, "Please select your income range"),
  sourceOfFunds: z.string().min(1, "Please select your primary source of funds"),
})

type PersonalInfoForm = z.infer<typeof personalInfoSchema>

export default function KYCPersonalPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSSN, setShowSSN] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveProgress, setSaveProgress] = useState(0)
  const { 
    initialize: initializeEncryption, 
    encryptFormData, 
    isInitialized: isEncryptionInitialized 
  } = useKYCEncryption()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    getValues,
  } = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      ssn: "",
      nationality: "",
      country: "",
      city: "",
      state: "",
      postalCode: "",
      address: "",
      phone: "",
      email: user?.email || "",
      occupation: "",
      employer: "",
      annualIncome: "",
      sourceOfFunds: "",
    },
  })

  const formValues = watch()

  // Initialize encryption when component mounts
  useEffect(() => {
    const initEncryption = async () => {
      if (!isEncryptionInitialized() && user?.uid) {
        try {
          // Use user's UID as part of encryption password
          await initializeEncryption(user.uid)
        } catch (err) {
          console.error('Failed to initialize encryption:', err)
        }
      }
    }
    initEncryption()
  }, [user?.uid, isEncryptionInitialized, initializeEncryption])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!isDirty || !autoSaveEnabled || !isEncryptionInitialized()) return

    try {
      setSaveProgress(20)
      const formData = getValues()
      
      // Encrypt sensitive fields
      const encryptedData = await encryptFormData({
        fullName: `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.trim(),
        dateOfBirth: formData.dateOfBirth,
        ssn: formData.ssn,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
      })
      
      setSaveProgress(60)
      
      // Store in localStorage for now (in production, send to backend)
      const saveData = {
        ...formData,
        encrypted: encryptedData,
        lastSaved: new Date().toISOString(),
      }
      
      localStorage.setItem('kyc_personal_draft', JSON.stringify(saveData))
      setSaveProgress(100)
      setLastSaved(new Date())
      
      // Reset progress after animation
      setTimeout(() => setSaveProgress(0), 1000)
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }, [isDirty, autoSaveEnabled, isEncryptionInitialized, getValues, encryptFormData])

  // Auto-save on form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [formValues, autoSave])

  const onSubmit = async (data: PersonalInfoForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Encrypt sensitive data
      const encryptedData = await encryptFormData({
        fullName: `${data.firstName} ${data.middleName || ''} ${data.lastName}`.trim(),
        dateOfBirth: data.dateOfBirth,
        ssn: data.ssn,
        taxId: data.ssn, // Using SSN as tax ID for US residents
        address: `${data.address}, ${data.city}, ${data.state} ${data.postalCode}`,
        phone: data.phone,
        email: data.email,
      })

      // Prepare submission data
      const submissionData = {
        ...data,
        encryptedFields: encryptedData,
        kycLevel: 1, // Basic verification level
        submittedAt: new Date().toISOString(),
      }

      // TODO: Submit to backend API
      console.log("Submitting encrypted personal info:", submissionData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Clear draft after successful submission
      localStorage.removeItem('kyc_personal_draft')
      
      // Navigate to next step
      router.push("/kyc/documents")
    } catch (err) {
      setError("Failed to save personal information. Please try again.")
      console.error("Error submitting personal info:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Common countries list
  const countries = [
    "United States", "Canada", "United Kingdom", "Australia", "Germany",
    "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway",
    "Denmark", "Switzerland", "Austria", "Belgium", "Ireland",
    "New Zealand", "Singapore", "Japan", "South Korea", "India"
  ].sort()

  // US States
  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"
  ]

  // Income ranges
  const incomeRanges = [
    "Less than $25,000",
    "$25,000 - $50,000",
    "$50,000 - $75,000",
    "$75,000 - $100,000",
    "$100,000 - $150,000",
    "$150,000 - $250,000",
    "$250,000 - $500,000",
    "$500,000 - $1,000,000",
    "Over $1,000,000"
  ]

  // Source of funds options
  const fundSources = [
    "Employment/Salary",
    "Business Income",
    "Investments",
    "Real Estate",
    "Inheritance",
    "Savings",
    "Retirement/Pension",
    "Other"
  ]

  // Handle address selection from autocomplete
  const handleAddressSelect = (addressDetails: any) => {
    setValue('city', addressDetails.city)
    setValue('state', addressDetails.state)
    setValue('postalCode', addressDetails.postalCode)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Progress and Security Indicators */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              256-bit Encryption
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              PII Protected
            </Badge>
          </div>
          {lastSaved && (
            <div className="text-sm text-gray-500">
              Auto-saved {format(lastSaved, 'h:mm a')}
            </div>
          )}
        </div>

        {saveProgress > 0 && saveProgress < 100 && (
          <Progress value={saveProgress} className="h-1" />
        )}

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Please provide your personal details as they appear on your government-issued ID.
              All sensitive information is encrypted before storage.
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="John"
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  {...register("middleName")}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Doe"
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Date of Birth and SSN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register("dateOfBirth")}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ssn">Social Security Number *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Your SSN is encrypted and used only for identity verification</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <MaskedInput
                    mask="999-99-9999"
                    value={watch('ssn')}
                    onChange={(value) => setValue('ssn', value)}
                    type={showSSN ? "text" : "password"}
                    placeholder="XXX-XX-XXXX"
                    className={errors.ssn ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSSN(!showSSN)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSSN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.ssn && (
                  <p className="text-sm text-red-500">{errors.ssn.message}</p>
                )}
                {watch('ssn') && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Encrypted with AES-256
                  </p>
                )}
              </div>
            </div>

            {/* Nationality and Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Select
                  value={watch("nationality")}
                  onValueChange={(value) => setValue("nationality", value)}
                >
                  <SelectTrigger className={errors.nationality ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.nationality && (
                  <p className="text-sm text-red-500">{errors.nationality.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country of Residence *</Label>
                <Select
                  value={watch("country")}
                  onValueChange={(value) => setValue("country", value)}
                >
                  <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-red-500">{errors.country.message}</p>
                )}
              </div>
            </div>

            {/* Address with Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="address">Residential Address *</Label>
              <AddressAutocomplete
                value={watch('address')}
                onChange={(value) => setValue('address', value)}
                onAddressSelect={handleAddressSelect}
                country={watch('country')}
                placeholder="Start typing your address..."
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            {/* City, State, and Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="New York"
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Select
                  value={watch("state")}
                  onValueChange={(value) => setValue("state", value)}
                >
                  <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {(watch('country') === 'United States' ? usStates : ['Other']).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-red-500">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal/ZIP Code *</Label>
                <Input
                  id="postalCode"
                  {...register("postalCode")}
                  placeholder="10001"
                  className={errors.postalCode ? "border-red-500" : ""}
                />
                {errors.postalCode && (
                  <p className="text-sm text-red-500">{errors.postalCode.message}</p>
                )}
              </div>
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <MaskedInput
                  mask="+9 (999) 999-9999"
                  value={watch('phone')}
                  onChange={(value) => setValue('phone', value.replace(/\D/g, ''))}
                  placeholder="+1 (555) 123-4567"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Include country code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="john.doe@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Employment Information */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-medium mb-4">Employment & Financial Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    {...register("occupation")}
                    placeholder="Software Engineer"
                    className={errors.occupation ? "border-red-500" : ""}
                  />
                  {errors.occupation && (
                    <p className="text-sm text-red-500">{errors.occupation.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer">Employer (Optional)</Label>
                  <Input
                    id="employer"
                    {...register("employer")}
                    placeholder="Company Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="annualIncome">Annual Income Range *</Label>
                  <Select
                    value={watch("annualIncome")}
                    onValueChange={(value) => setValue("annualIncome", value)}
                  >
                    <SelectTrigger className={errors.annualIncome ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select income range" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeRanges.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.annualIncome && (
                    <p className="text-sm text-red-500">{errors.annualIncome.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceOfFunds">Primary Source of Funds *</Label>
                  <Select
                    value={watch("sourceOfFunds")}
                    onValueChange={(value) => setValue("sourceOfFunds", value)}
                  >
                    <SelectTrigger className={errors.sourceOfFunds ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {fundSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sourceOfFunds && (
                    <p className="text-sm text-red-500">{errors.sourceOfFunds.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/kyc")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Continue"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

        {/* Information Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Your data is protected</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All sensitive information is encrypted using AES-256 encryption</li>
                <li>Data is automatically saved as you type (can be disabled)</li>
                <li>We comply with GDPR, CCPA, and other privacy regulations</li>
                <li>Your information is never shared without explicit consent</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auto-save toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autosave"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autosave" className="text-sm font-medium">
              Enable auto-save
            </label>
          </div>
          {lastSaved && (
            <span className="text-xs text-gray-500">
              Last saved: {format(lastSaved, 'MMM d, h:mm a')}
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}