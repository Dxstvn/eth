"use client"

import React, { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  FileText,
  Home,
  CreditCard,
  Building,
  Receipt,
  AlertCircle,
  Info,
  Shield,
  Calendar,
  Check,
  X,
  Clock
} from "lucide-react"
import { SecureFileUpload } from "@/components/kyc/secure-file-upload"
import { KYCFieldType } from "@/lib/security/kyc-encryption"
import { useAuth } from "@/context/auth-context-v2"
import { format, isAfter, subMonths } from "date-fns"

export interface AddressProofDocument {
  type: AddressProofType
  file: File | null
  preview: string | null
  uploaded: boolean
  encrypted?: any
  issueDate?: Date
  verificationStatus?: "pending" | "verified" | "rejected"
  rejectionReason?: string
}

export type AddressProofType = "utility_bill" | "bank_statement" | "lease_agreement" | "government_letter"

interface AddressProofStepProps {
  onComplete: (document: AddressProofDocument) => void
  onBack?: () => void
  initialDocument?: AddressProofDocument
  className?: string
}

const addressProofConfig = {
  utility_bill: {
    label: "Utility Bill",
    icon: Receipt,
    description: "Electricity, water, gas, or internet bill",
    requiresRecency: true,
    maxAgeMonths: 3,
    tips: [
      "Must be issued within the last 3 months",
      "Your full name must be clearly visible",
      "Complete address must match your profile",
      "Issue date must be clearly shown"
    ],
    examples: ["Electricity bill", "Water bill", "Gas bill", "Internet/Cable bill"]
  },
  bank_statement: {
    label: "Bank Statement",
    icon: CreditCard,
    description: "Official bank or credit card statement",
    requiresRecency: true,
    maxAgeMonths: 3,
    tips: [
      "Must be dated within the last 3 months",
      "Bank letterhead must be visible",
      "Your name and address must be clear",
      "Can black out sensitive transaction details"
    ],
    examples: ["Monthly bank statement", "Credit card statement", "Mortgage statement"]
  },
  lease_agreement: {
    label: "Lease Agreement",
    icon: Home,
    description: "Current rental or lease agreement",
    requiresRecency: false,
    maxAgeMonths: 12,
    tips: [
      "Must be currently valid",
      "All parties' signatures must be visible",
      "Property address must be clear",
      "Your name must be on the agreement"
    ],
    examples: ["Apartment lease", "House rental agreement", "Property lease contract"]
  },
  government_letter: {
    label: "Government Letter",
    icon: Building,
    description: "Official government correspondence",
    requiresRecency: true,
    maxAgeMonths: 12,
    tips: [
      "Must be from official government agency",
      "Government letterhead required",
      "Your current address must be shown",
      "Must be dated within the last year"
    ],
    examples: ["Tax document", "Social security letter", "Voter registration", "DMV correspondence"]
  }
}

export function AddressProofStep({
  onComplete,
  onBack,
  initialDocument,
  className
}: AddressProofStepProps) {
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<AddressProofType>("utility_bill")
  const [document, setDocument] = useState<AddressProofDocument | null>(initialDocument || null)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showDateWarning, setShowDateWarning] = useState(false)
  
  const encryptionPassword = `kyc_address_${user?.uid}_${Date.now()}`
  const currentConfig = addressProofConfig[selectedType]
  
  // Check if document is within required date range
  const isDocumentRecent = useCallback((issueDate: Date): boolean => {
    const maxAge = currentConfig.maxAgeMonths
    const cutoffDate = subMonths(new Date(), maxAge)
    return isAfter(issueDate, cutoffDate)
  }, [currentConfig])
  
  // Reset document when type changes
  useEffect(() => {
    setDocument(null)
    setError(null)
    setShowDateWarning(false)
  }, [selectedType])
  
  const handleFileSelect = useCallback((
    file: File | null,
    encrypted?: any
  ) => {
    if (!file) {
      setDocument(null)
      setShowDateWarning(false)
      return
    }
    
    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocument({
          type: selectedType,
          file,
          preview: reader.result as string,
          uploaded: true,
          encrypted,
          verificationStatus: "pending"
        })
      }
      reader.readAsDataURL(file)
    } else {
      setDocument({
        type: selectedType,
        file,
        preview: null,
        uploaded: true,
        encrypted,
        verificationStatus: "pending"
      })
    }
    
    // Show date warning for documents requiring recency
    if (currentConfig.requiresRecency) {
      setShowDateWarning(true)
    }
    
    setError(null)
  }, [selectedType, currentConfig])
  
  const validateDocument = useCallback(async () => {
    if (!document) {
      setError("Please upload a document")
      return
    }
    
    setIsValidating(true)
    setError(null)
    
    try {
      // Simulate OCR and validation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For demo purposes, assume document passes validation
      const validatedDoc: AddressProofDocument = {
        ...document,
        issueDate: new Date(), // In production, this would be extracted via OCR
        verificationStatus: "verified"
      }
      
      // Check recency if required
      if (currentConfig.requiresRecency && validatedDoc.issueDate) {
        if (!isDocumentRecent(validatedDoc.issueDate)) {
          throw new Error(
            `Document must be issued within the last ${currentConfig.maxAgeMonths} months`
          )
        }
      }
      
      setDocument(validatedDoc)
      onComplete(validatedDoc)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document validation failed")
      if (document) {
        setDocument({
          ...document,
          verificationStatus: "rejected",
          rejectionReason: err instanceof Error ? err.message : "Validation failed"
        })
      }
    } finally {
      setIsValidating(false)
    }
  }, [document, currentConfig, isDocumentRecent, onComplete])
  
  const getStatusBadge = () => {
    if (!document) return null
    
    switch (document.verificationStatus) {
      case "verified":
        return (
          <Badge variant="success" className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }
  
  return (
    <div className={cn("space-y-6", className)}>
      <Card className="shadow-soft border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl text-teal-900">Proof of Address</CardTitle>
          <CardDescription className="text-gray-600">
            Upload a document that shows your current residential address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold text-gray-900">
              Select Document Type
            </Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as AddressProofType)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {Object.entries(addressProofConfig).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <div key={key}>
                    <RadioGroupItem
                      value={key}
                      id={key}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={key}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-4",
                        "hover:border-teal-300 cursor-pointer transition-colors",
                        "peer-checked:border-teal-600 peer-checked:bg-teal-50"
                      )}
                    >
                      <Icon className="h-8 w-8 mb-2 text-gray-600 peer-checked:text-teal-600" />
                      <span className="font-medium text-gray-900">{config.label}</span>
                      <span className="text-xs text-gray-500 text-center mt-1">
                        {config.description}
                      </span>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
          
          {/* Document Requirements */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <p className="font-medium text-blue-900 mb-2">
                Requirements for {currentConfig.label}:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                {currentConfig.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
              {currentConfig.examples.length > 0 && (
                <p className="mt-2 text-xs text-blue-700">
                  <span className="font-medium">Examples:</span> {currentConfig.examples.join(", ")}
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Date Warning */}
          {showDateWarning && currentConfig.requiresRecency && (
            <Alert className="bg-amber-50 border-amber-200">
              <Calendar className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <p className="text-sm text-amber-800">
                  This document must be dated within the last{" "}
                  <span className="font-semibold">{currentConfig.maxAgeMonths} months</span>.
                  Documents dated before{" "}
                  <span className="font-semibold">
                    {format(subMonths(new Date(), currentConfig.maxAgeMonths), "MMMM yyyy")}
                  </span>{" "}
                  will be rejected.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          {/* File Upload */}
          <div className="space-y-2">
            <SecureFileUpload
              id="address_proof"
              label={`Upload ${currentConfig.label}`}
              description={`Accepted formats: JPEG, PNG, PDF (max 10MB)`}
              fieldType={KYCFieldType.ADDRESS}
              onFileSelect={handleFileSelect}
              onRemove={() => handleFileSelect(null)}
              value={document?.file || null}
              preview={document?.preview || null}
              required
              showSecurityIndicators
              enableEncryption
              encryptionPassword={encryptionPassword}
              enableWatermark
              watermarkText="CLEARHOLD KYC"
            />
            
            {/* Verification Status */}
            {document && (
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {document.rejectionReason && (
                  <span className="text-sm text-red-600">
                    {document.rejectionReason}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Upload Progress */}
          {document && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Upload Progress</span>
                <span className="font-medium text-teal-900">
                  {document.uploaded ? "100%" : "0%"}
                </span>
              </div>
              <Progress value={document.uploaded ? 100 : 0} className="h-2" />
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isValidating}
              >
                Back
              </Button>
            )}
            <Button
              onClick={validateDocument}
              disabled={isValidating || !document?.uploaded}
              className={cn(
                "bg-teal-600 hover:bg-teal-700 text-white",
                !onBack && "ml-auto"
              )}
            >
              {isValidating ? "Validating..." : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Security & Privacy Notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800 space-y-1">
            <p className="font-medium">Your Privacy is Protected</p>
            <p className="text-xs">
              • Documents are encrypted with AES-256 encryption
            </p>
            <p className="text-xs">
              • Automatic deletion after verification
            </p>
            <p className="text-xs">
              • GDPR and CCPA compliant storage
            </p>
            <p className="text-xs">
              • No third-party access to your documents
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}