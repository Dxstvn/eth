"use client"

import React, { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Upload,
  FileText,
  Image,
  Check,
  X,
  AlertCircle,
  Info,
  Shield,
  CreditCard,
  Car,
  Passport,
  Loader2,
  Edit3,
  Eye,
  EyeOff
} from "lucide-react"
import { SecureFileUpload } from "@/components/kyc/secure-file-upload"
import { KYCFieldType } from "@/lib/security/kyc-encryption"
import { useAuth } from "@/context/auth-context-v2"
import { performOCR, ExtractedDocumentData, OCRResult, validateOCRResult } from "@/lib/services/mock-ocr-service"

export interface DocumentFile {
  type: DocumentType
  subType?: string
  file: File | null
  preview: string | null
  uploaded: boolean
  encrypted?: any
  verificationStatus?: "pending" | "verified" | "rejected"
  rejectionReason?: string
  ocrResult?: OCRResult
  extractedData?: ExtractedDocumentData
}

export type DocumentType = "passport" | "drivers_license" | "id_card"

interface DocumentUploadStepProps {
  onComplete: (documents: Record<string, DocumentFile>) => void
  onBack?: () => void
  initialDocuments?: Record<string, DocumentFile>
  className?: string
}

const documentConfig = {
  passport: {
    label: "Passport",
    icon: Passport,
    description: "International passport with photo page",
    fieldType: KYCFieldType.PASSPORT,
    requiresBack: false,
    tips: [
      "Ensure photo page is clearly visible",
      "All four corners must be in frame",
      "Machine-readable zone must be legible",
      "No glare on the photo or text"
    ]
  },
  drivers_license: {
    label: "Driver's License",
    icon: Car,
    description: "Valid driver's license from any country",
    fieldType: KYCFieldType.DRIVERS_LICENSE,
    requiresBack: true,
    tips: [
      "Both front and back required",
      "Ensure license is not expired",
      "All text must be clearly readable",
      "Photo must match your appearance"
    ]
  },
  id_card: {
    label: "National ID Card",
    icon: CreditCard,
    description: "Government-issued national identity card",
    fieldType: KYCFieldType.DRIVERS_LICENSE,
    requiresBack: true,
    tips: [
      "Both sides of the card required",
      "Card must be valid and not expired",
      "Ensure security features are visible",
      "All personal details must be clear"
    ]
  }
}

export function DocumentUploadStep({
  onComplete,
  onBack,
  initialDocuments,
  className
}: DocumentUploadStepProps) {
  const { user } = useAuth()
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("passport")
  const [documents, setDocuments] = useState<Record<string, DocumentFile>>(
    initialDocuments || {}
  )
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [showExtractedData, setShowExtractedData] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [extractedDataOverrides, setExtractedDataOverrides] = useState<Partial<ExtractedDocumentData>>({})
  
  const encryptionPassword = `kyc_${user?.uid}_${Date.now()}`
  
  const currentConfig = documentConfig[selectedDocType]
  const frontDoc = documents[`${selectedDocType}_front`]
  const backDoc = documents[`${selectedDocType}_back`]
  
  const handleFileSelect = useCallback(async (
    docKey: string,
    file: File | null,
    encrypted?: any
  ) => {
    if (!file) {
      setDocuments(prev => {
        const updated = { ...prev }
        delete updated[docKey]
        return updated
      })
      setShowExtractedData(false)
      setExtractedDataOverrides({})
      return
    }
    
    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const preview = reader.result as string
        
        // Create the document entry first
        setDocuments(prev => ({
          ...prev,
          [docKey]: {
            type: selectedDocType,
            subType: docKey.includes("front") ? "front" : "back",
            file,
            preview,
            uploaded: true,
            encrypted,
            verificationStatus: "pending"
          }
        }))
        
        // Perform OCR if it's the front of the document
        if (docKey.includes("front")) {
          setIsProcessingOCR(true)
          setError(null)
          
          try {
            const ocrResult = await performOCR(selectedDocType, file)
            
            setDocuments(prev => ({
              ...prev,
              [docKey]: {
                ...prev[docKey],
                ocrResult,
                extractedData: ocrResult.extractedData || undefined
              }
            }))
            
            if (ocrResult.success && ocrResult.extractedData) {
              const validation = validateOCRResult(ocrResult)
              
              if (!validation.isValid) {
                setError(`OCR validation issues: ${validation.issues.join(", ")}`)
              } else if (ocrResult.requiresManualReview) {
                setError("Image quality is low. Please review and correct the extracted information.")
              }
              
              setShowExtractedData(true)
            } else {
              setError("Failed to extract document information. Please ensure the image is clear and try again.")
            }
          } catch (err) {
            setError("An error occurred while processing the document. Please try again.")
            console.error("OCR Error:", err)
          } finally {
            setIsProcessingOCR(false)
          }
        }
      }
      reader.readAsDataURL(file)
    } else {
      setDocuments(prev => ({
        ...prev,
        [docKey]: {
          type: selectedDocType,
          subType: docKey.includes("front") ? "front" : "back",
          file,
          preview: null,
          uploaded: true,
          encrypted,
          verificationStatus: "pending"
        }
      }))
    }
    
    setError(null)
  }, [selectedDocType])
  
  const validateDocuments = useCallback(async () => {
    setIsValidating(true)
    setError(null)
    
    try {
      // Check if at least one document type is uploaded
      const hasValidDocument = Object.values(documentConfig).some(config => {
        const frontKey = `${config.label.toLowerCase().replace(" ", "_")}_front`
        const backKey = `${config.label.toLowerCase().replace(" ", "_")}_back`
        const hasFront = documents[frontKey]?.uploaded
        const hasBack = !config.requiresBack || documents[backKey]?.uploaded
        return hasFront && hasBack
      })
      
      if (!hasValidDocument) {
        throw new Error("Please upload at least one valid identification document")
      }
      
      // Simulate document validation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update verification status and apply any data overrides
      const updatedDocs = { ...documents }
      Object.keys(updatedDocs).forEach(key => {
        if (updatedDocs[key]) {
          updatedDocs[key].verificationStatus = "verified"
          
          // Apply any extracted data overrides
          if (key.includes("front") && updatedDocs[key].extractedData && Object.keys(extractedDataOverrides).length > 0) {
            updatedDocs[key].extractedData = {
              ...updatedDocs[key].extractedData,
              ...extractedDataOverrides
            }
          }
        }
      })
      
      setDocuments(updatedDocs)
      onComplete(updatedDocs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document validation failed")
    } finally {
      setIsValidating(false)
    }
  }, [documents, onComplete])
  
  const getUploadProgress = useCallback(() => {
    const totalRequired = Object.values(documentConfig).reduce((acc, config) => {
      return acc + (config.requiresBack ? 2 : 1)
    }, 0)
    
    const uploaded = Object.values(documents).filter(doc => doc?.uploaded).length
    return Math.round((uploaded / totalRequired) * 100)
  }, [documents])
  
  const progress = getUploadProgress()
  
  return (
    <div className={cn("space-y-6", className)}>
      <Card className="shadow-soft border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl text-teal-900">Identity Verification</CardTitle>
          <CardDescription className="text-gray-600">
            Upload a government-issued ID to verify your identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Upload Progress</span>
              <span className="font-medium text-teal-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Document Type Selection */}
          <Tabs value={selectedDocType} onValueChange={(v) => setSelectedDocType(v as DocumentType)}>
            <TabsList className="grid grid-cols-3 w-full">
              {Object.entries(documentConfig).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
            
            {Object.entries(documentConfig).map(([key, config]) => (
              <TabsContent key={key} value={key} className="space-y-6 mt-6">
                {/* Document Tips */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <p className="font-medium text-blue-900 mb-2">Tips for {config.label}:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                      {config.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                
                {/* Front Upload */}
                <div>
                  <SecureFileUpload
                    id={`${key}_front`}
                    label={`${config.label} (Front)`}
                    description={config.description}
                    fieldType={config.fieldType}
                    onFileSelect={(file, encrypted) => 
                      handleFileSelect(`${key}_front`, file, encrypted)
                    }
                    onRemove={() => handleFileSelect(`${key}_front`, null)}
                    value={documents[`${key}_front`]?.file || null}
                    preview={documents[`${key}_front`]?.preview || null}
                    required
                    showSecurityIndicators
                    enableEncryption
                    encryptionPassword={encryptionPassword}
                    enableWatermark
                    watermarkText="CLEARHOLD KYC"
                  />
                  
                  {/* Verification Status */}
                  {documents[`${key}_front`]?.verificationStatus && (
                    <div className="mt-2 flex items-center gap-2">
                      {documents[`${key}_front`]?.verificationStatus === "verified" && (
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {documents[`${key}_front`]?.verificationStatus === "pending" && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Pending Verification
                        </Badge>
                      )}
                      {documents[`${key}_front`]?.verificationStatus === "rejected" && (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* OCR Processing Indicator */}
                  {isProcessingOCR && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Extracting document information...</span>
                    </div>
                  )}
                  
                  {/* Extracted Data Display */}
                  {showExtractedData && documents[`${key}_front`]?.extractedData && key === selectedDocType && (
                    <Card className="mt-4 border-teal-200 bg-teal-50/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base text-teal-900">Extracted Information</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowExtractedData(!showExtractedData)}
                          >
                            {showExtractedData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {documents[`${key}_front`]?.ocrResult?.requiresManualReview && (
                          <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-sm text-yellow-800">
                              Please review and correct any errors in the extracted information
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Personal Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">First Name</Label>
                            {editingField === 'firstName' ? (
                              <div className="flex gap-2">
                                <Input
                                  value={extractedDataOverrides.firstName || documents[`${key}_front`]?.extractedData?.firstName || ''}
                                  onChange={(e) => setExtractedDataOverrides(prev => ({ ...prev, firstName: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingField(null)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {extractedDataOverrides.firstName || documents[`${key}_front`]?.extractedData?.firstName || '-'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingField('firstName')}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Last Name</Label>
                            {editingField === 'lastName' ? (
                              <div className="flex gap-2">
                                <Input
                                  value={extractedDataOverrides.lastName || documents[`${key}_front`]?.extractedData?.lastName || ''}
                                  onChange={(e) => setExtractedDataOverrides(prev => ({ ...prev, lastName: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingField(null)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {extractedDataOverrides.lastName || documents[`${key}_front`]?.extractedData?.lastName || '-'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingField('lastName')}
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Date of Birth</Label>
                            <p className="text-sm font-medium">
                              {documents[`${key}_front`]?.extractedData?.dateOfBirth || '-'}
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Document Number</Label>
                            <p className="text-sm font-medium">
                              {documents[`${key}_front`]?.extractedData?.documentNumber || '-'}
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Expiry Date</Label>
                            <p className="text-sm font-medium">
                              {documents[`${key}_front`]?.extractedData?.expiryDate || '-'}
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Nationality</Label>
                            <p className="text-sm font-medium">
                              {documents[`${key}_front`]?.extractedData?.nationality || '-'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Address Information (for driver's license and ID cards) */}
                        {documents[`${key}_front`]?.extractedData?.address && (
                          <div>
                            <Label className="text-xs text-gray-600">Address</Label>
                            <p className="text-sm font-medium">
                              {documents[`${key}_front`]?.extractedData?.address?.fullAddress || '-'}
                            </p>
                          </div>
                        )}
                        
                        {/* OCR Confidence */}
                        {documents[`${key}_front`]?.ocrResult && (
                          <div className="pt-2 border-t border-teal-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">OCR Confidence</span>
                              <Badge 
                                variant={documents[`${key}_front`]?.ocrResult.confidence > 80 ? "success" : "secondary"}
                                className="text-xs"
                              >
                                {documents[`${key}_front`]?.ocrResult.confidence}%
                              </Badge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {/* Back Upload (if required) */}
                {config.requiresBack && (
                  <div>
                    <SecureFileUpload
                      id={`${key}_back`}
                      label={`${config.label} (Back)`}
                      description="Upload the back side of your document"
                      fieldType={config.fieldType}
                      onFileSelect={(file, encrypted) => 
                        handleFileSelect(`${key}_back`, file, encrypted)
                      }
                      onRemove={() => handleFileSelect(`${key}_back`, null)}
                      value={documents[`${key}_back`]?.file || null}
                      preview={documents[`${key}_back`]?.preview || null}
                      required
                      showSecurityIndicators
                      enableEncryption
                      encryptionPassword={encryptionPassword}
                      enableWatermark
                      watermarkText="CLEARHOLD KYC"
                    />
                    
                    {/* Verification Status */}
                    {documents[`${key}_back`]?.verificationStatus && (
                      <div className="mt-2 flex items-center gap-2">
                        {documents[`${key}_back`]?.verificationStatus === "verified" && (
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {documents[`${key}_back`]?.verificationStatus === "pending" && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending Verification
                          </Badge>
                        )}
                        {documents[`${key}_back`]?.verificationStatus === "rejected" && (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
          
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
              onClick={validateDocuments}
              disabled={isValidating || Object.keys(documents).length === 0}
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
      
      {/* Security Notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <div className="text-sm text-teal-800">
            <p className="font-medium mb-1">Bank-Level Security</p>
            <p className="text-xs">
              Your documents are encrypted end-to-end using AES-256 encryption. 
              Files are watermarked and securely deleted after verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}