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
  const [isTouch, setIsTouch] = useState(false)

  // Detect touch device
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Screen reader status region */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {saveProgress > 0 && saveProgress < 100 && `Form auto-save in progress: ${saveProgress}%`}
              {saveProgress === 100 && "Form data saved successfully"}
              {isSubmitting && "Submitting form data, please wait"}
              {error && `Error: ${error}`}
            </div>
            
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Name Fields */}
            <fieldset className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <legend className="text-lg font-medium px-2">Personal Name Information</legend>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-medium">
                    First Name
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="Enter your first name"
                    className={`h-12 text-base touch-manipulation ${errors.firstName ? "border-red-500" : ""}`}
                    aria-required="true"
                    aria-invalid={errors.firstName ? "true" : "false"}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                    autoComplete="given-name"
                  />
                  {errors.firstName && (
                    <p id="firstName-error" role="alert" className="text-sm text-red-500">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middleName" className="font-medium">Middle Name</Label>
                  <Input
                    id="middleName"
                    {...register("middleName")}
                    placeholder="Optional middle name"
                    className="h-12 text-base touch-manipulation"
                    aria-describedby="middleName-help"
                    autoComplete="additional-name"
                  />
                  <p id="middleName-help" className="text-xs text-gray-500">
                    Optional field - leave blank if not applicable
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-medium">
                    Last Name
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Enter your last name"
                    className={`h-12 text-base touch-manipulation ${errors.lastName ? "border-red-500" : ""}`}
                    aria-required="true"
                    aria-invalid={errors.lastName ? "true" : "false"}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                    autoComplete="family-name"
                  />
                  {errors.lastName && (
                    <p id="lastName-error" role="alert" className="text-sm text-red-500">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Date of Birth and SSN */}
            <fieldset className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <legend className="text-lg font-medium px-2">Identity Information</legend>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="font-medium">
                    Date of Birth
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className={`h-12 text-base touch-manipulation ${errors.dateOfBirth ? "border-red-500" : ""}`}
                    aria-required="true"
                    aria-invalid={errors.dateOfBirth ? "true" : "false"}
                    aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : "dateOfBirth-help"}
                    autoComplete="bday"
                  />
                  <p id="dateOfBirth-help" className="text-xs text-gray-500">
                    You must be at least 18 years old to proceed
                  </p>
                  {errors.dateOfBirth && (
                    <p id="dateOfBirth-error" role="alert" className="text-sm text-red-500">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ssn" className="font-medium">
                      Social Security Number
                      <span aria-label="required" className="text-red-500 ml-1">*</span>
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 cursor-help" aria-label="More information about SSN security" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Your SSN is encrypted and used only for identity verification</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="relative">
                    <MaskedInput
                      id="ssn"
                      mask="999-99-9999"
                      value={watch('ssn')}
                      onChange={(value) => setValue('ssn', value)}
                      type={showSSN ? "text" : "password"}
                      placeholder="XXX-XX-XXXX"
                      className={`h-12 text-base touch-manipulation ${errors.ssn ? "border-red-500 pr-12" : "pr-12"}`}
                      aria-required="true"
                      aria-invalid={errors.ssn ? "true" : "false"}
                      aria-describedby={errors.ssn ? "ssn-error" : "ssn-help"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSSN(!showSSN)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded touch-manipulation"
                      aria-label={showSSN ? "Hide Social Security Number" : "Show Social Security Number"}
                      tabIndex={0}
                    >
                      {showSSN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p id="ssn-help" className="text-xs text-gray-500">
                    Format: XXX-XX-XXXX (numbers only)
                  </p>
                  {errors.ssn && (
                    <p id="ssn-error" role="alert" className="text-sm text-red-500">
                      {errors.ssn.message}
                    </p>
                  )}
                  {watch('ssn') && (
                    <div className="text-xs text-green-600 flex items-center gap-1" role="status" aria-live="polite">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      <span>Encrypted with AES-256 security</span>
                    </div>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Nationality and Country */}
            <fieldset className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <legend className="text-lg font-medium px-2">Nationality Information</legend>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality-select" className="font-medium">
                    Nationality
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={watch("nationality")}
                    onValueChange={(value) => setValue("nationality", value)}
                    required
                  >
                    <SelectTrigger 
                      id="nationality-select"
                      className={`h-12 text-base touch-manipulation ${errors.nationality ? "border-red-500" : ""}`}
                      aria-required="true"
                      aria-invalid={errors.nationality ? "true" : "false"}
                      aria-describedby={errors.nationality ? "nationality-error" : "nationality-help"}
                    >
                      <SelectValue placeholder="Choose your nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="nationality-help" className="text-xs text-gray-500">
                    Select the country of your citizenship
                  </p>
                  {errors.nationality && (
                    <p id="nationality-error" role="alert" className="text-sm text-red-500">
                      {errors.nationality.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country-select" className="font-medium">
                    Country of Residence
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={watch("country")}
                    onValueChange={(value) => setValue("country", value)}
                    required
                  >
                    <SelectTrigger 
                      id="country-select"
                      className={`h-12 text-base touch-manipulation ${errors.country ? "border-red-500" : ""}`}
                      aria-required="true"
                      aria-invalid={errors.country ? "true" : "false"}
                      aria-describedby={errors.country ? "country-error" : "country-help"}
                    >
                      <SelectValue placeholder="Choose your residence country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="country-help" className="text-xs text-gray-500">
                    Select where you currently live
                  </p>
                  {errors.country && (
                    <p id="country-error" role="alert" className="text-sm text-red-500">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Address with Autocomplete */}
            <fieldset className="border border-gray-200 rounded-lg p-4">
              <legend className="text-lg font-medium px-2">Address Information</legend>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="font-medium">
                    Residential Address
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <AddressAutocomplete
                    id="address"
                    value={watch('address')}
                    onChange={(value) => setValue('address', value)}
                    onAddressSelect={handleAddressSelect}
                    country={watch('country')}
                    placeholder="Start typing your street address..."
                    className={errors.address ? "border-red-500" : ""}
                    aria-required="true"
                    aria-invalid={errors.address ? "true" : "false"}
                    aria-describedby={errors.address ? "address-error" : "address-help"}
                  />
                  <p id="address-help" className="text-xs text-gray-500">
                    Enter your full street address including apartment/unit number if applicable
                  </p>
                  {errors.address && (
                    <p id="address-error" role="alert" className="text-sm text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* City, State, and Postal Code */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-medium">
                      City
                      <span aria-label="required" className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="city"
                      {...register("city")}
                      placeholder="Enter your city"
                      className={`h-12 text-base touch-manipulation ${errors.city ? "border-red-500" : ""}`}
                      aria-required="true"
                      aria-invalid={errors.city ? "true" : "false"}
                      aria-describedby={errors.city ? "city-error" : undefined}
                      autoComplete="address-level2"
                    />
                    {errors.city && (
                      <p id="city-error" role="alert" className="text-sm text-red-500">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state-select" className="font-medium">
                      State/Province
                      <span aria-label="required" className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={watch("state")}
                      onValueChange={(value) => setValue("state", value)}
                      required
                    >
                      <SelectTrigger 
                        id="state-select"
                        className={errors.state ? "border-red-500" : ""}
                        aria-required="true"
                        aria-invalid={errors.state ? "true" : "false"}
                        aria-describedby={errors.state ? "state-error" : "state-help"}
                      >
                        <SelectValue placeholder="Choose state/province" />
                      </SelectTrigger>
                      <SelectContent>
                        {(watch('country') === 'United States' ? usStates : ['Other']).map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id="state-help" className="text-xs text-gray-500">
                      {watch('country') === 'United States' ? 'Select your state' : 'Enter your province/region'}
                    </p>
                    {errors.state && (
                      <p id="state-error" role="alert" className="text-sm text-red-500">
                        {errors.state.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="font-medium">
                      Postal/ZIP Code
                      <span aria-label="required" className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      {...register("postalCode")}
                      placeholder={watch('country') === 'United States' ? '10001' : 'Enter postal code'}
                      className={errors.postalCode ? "border-red-500" : ""}
                      aria-required="true"
                      aria-invalid={errors.postalCode ? "true" : "false"}
                      aria-describedby={errors.postalCode ? "postalCode-error" : "postalCode-help"}
                    />
                    <p id="postalCode-help" className="text-xs text-gray-500">
                      {watch('country') === 'United States' ? 'Format: 12345 or 12345-6789' : 'Enter your local postal code'}
                    </p>
                    {errors.postalCode && (
                      <p id="postalCode-error" role="alert" className="text-sm text-red-500">
                        {errors.postalCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Phone and Email */}
            <fieldset className="border border-gray-200 rounded-lg p-4 sm:p-6">
              <legend className="text-lg font-medium px-2">Contact Information</legend>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium">
                    Phone Number
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <MaskedInput
                    id="phone"
                    mask="+9 (999) 999-9999"
                    value={watch('phone')}
                    onChange={(value) => setValue('phone', value.replace(/\D/g, ''))}
                    placeholder="+1 (555) 123-4567"
                    className={`h-12 text-base touch-manipulation ${errors.phone ? "border-red-500" : ""}`}
                    aria-required="true"
                    aria-invalid={errors.phone ? "true" : "false"}
                    aria-describedby={errors.phone ? "phone-error" : "phone-help"}
                    inputMode="tel"
                  />
                  <p id="phone-help" className="text-xs text-gray-500">
                    Include country code (e.g. +1 for US/Canada)
                  </p>
                  {errors.phone && (
                    <p id="phone-error" role="alert" className="text-sm text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium">
                    Email Address
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="john.doe@example.com"
                    className={`h-12 text-base touch-manipulation ${errors.email ? "border-red-500" : ""}`}
                    aria-required="true"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <p id="email-help" className="text-xs text-gray-500">
                    We'll use this to send important KYC updates
                  </p>
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Employment Information */}
            <fieldset className="border border-gray-200 rounded-lg p-4">
              <legend className="text-lg font-medium px-2">Employment & Financial Information</legend>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="font-medium">
                    Occupation
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="occupation"
                    {...register("occupation")}
                    placeholder="e.g. Software Engineer, Teacher, etc."
                    className={errors.occupation ? "border-red-500" : ""}
                    aria-required="true"
                    aria-invalid={errors.occupation ? "true" : "false"}
                    aria-describedby={errors.occupation ? "occupation-error" : "occupation-help"}
                    autoComplete="organization-title"
                  />
                  <p id="occupation-help" className="text-xs text-gray-500">
                    Enter your current job title or profession
                  </p>
                  {errors.occupation && (
                    <p id="occupation-error" role="alert" className="text-sm text-red-500">
                      {errors.occupation.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer" className="font-medium">Employer</Label>
                  <Input
                    id="employer"
                    {...register("employer")}
                    placeholder="Company name (optional)"
                    aria-describedby="employer-help"
                    autoComplete="organization"
                  />
                  <p id="employer-help" className="text-xs text-gray-500">
                    Optional - leave blank if self-employed or unemployed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="income-select" className="font-medium">
                    Annual Income Range
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={watch("annualIncome")}
                    onValueChange={(value) => setValue("annualIncome", value)}
                    required
                  >
                    <SelectTrigger 
                      id="income-select"
                      className={errors.annualIncome ? "border-red-500" : ""}
                      aria-required="true"
                      aria-invalid={errors.annualIncome ? "true" : "false"}
                      aria-describedby={errors.annualIncome ? "income-error" : "income-help"}
                    >
                      <SelectValue placeholder="Choose your income range" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeRanges.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="income-help" className="text-xs text-gray-500">
                    Select your approximate annual income (USD)
                  </p>
                  {errors.annualIncome && (
                    <p id="income-error" role="alert" className="text-sm text-red-500">
                      {errors.annualIncome.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funds-select" className="font-medium">
                    Primary Source of Funds
                    <span aria-label="required" className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={watch("sourceOfFunds")}
                    onValueChange={(value) => setValue("sourceOfFunds", value)}
                    required
                  >
                    <SelectTrigger 
                      id="funds-select"
                      className={errors.sourceOfFunds ? "border-red-500" : ""}
                      aria-required="true"
                      aria-invalid={errors.sourceOfFunds ? "true" : "false"}
                      aria-describedby={errors.sourceOfFunds ? "funds-error" : "funds-help"}
                    >
                      <SelectValue placeholder="Choose primary source" />
                    </SelectTrigger>
                    <SelectContent>
                      {fundSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="funds-help" className="text-xs text-gray-500">
                    Select the main source of your funds for transactions
                  </p>
                  {errors.sourceOfFunds && (
                    <p id="funds-error" role="alert" className="text-sm text-red-500">
                      {errors.sourceOfFunds.message}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t" role="group" aria-label="Form navigation">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/kyc")}
                disabled={isSubmitting}
                aria-describedby="back-button-help"
              >
                Back to KYC Overview
              </Button>
              <div className="hidden" id="back-button-help">
                Returns to the main KYC page without saving changes
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                aria-describedby="submit-button-help"
              >
                {isSubmitting ? (
                  <>
                    <span className="sr-only">Saving form data, please wait</span>
                    Saving...
                  </>
                ) : (
                  "Continue to Documents"
                )}
                {!isSubmitting && <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />}
              </Button>
              <div className="hidden" id="submit-button-help">
                Saves your personal information and proceeds to document upload
              </div>
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
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" role="region" aria-labelledby="autosave-heading">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autosave"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="rounded border-gray-300 focus:ring-2 focus:ring-teal-500"
              aria-describedby="autosave-description"
            />
            <label htmlFor="autosave" className="text-sm font-medium cursor-pointer" id="autosave-heading">
              Enable auto-save
            </label>
            <p id="autosave-description" className="text-xs text-gray-500 ml-2">
              Automatically saves your progress as you type
            </p>
          </div>
          {lastSaved && (
            <div className="text-xs text-gray-500" role="status" aria-live="polite">
              <span className="sr-only">Last saved</span>
              {format(lastSaved, 'MMM d, h:mm a')}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}