"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useCallback, useMemo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Info, 
  Shield, 
  FileText,
  Check,
  Upload,
  ClipboardList,
  Lock,
  Clock,
  CheckCircle2
} from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import { DocumentUploadStep, DocumentFile } from "@/components/kyc/steps/DocumentUploadStep"
import { AddressProofStep, AddressProofDocument } from "@/components/kyc/steps/AddressProofStep"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type UploadStep = "identity" | "address" | "review"

interface UploadedDocuments {
  identityDocs: Record<string, DocumentFile>
  addressDoc: AddressProofDocument | null
}

interface StepConfig {
  id: UploadStep
  title: string
  description: string
  icon: React.ElementType
}

const steps: StepConfig[] = [
  {
    id: "identity",
    title: "Identity Document",
    description: "Upload your government-issued ID",
    icon: FileText
  },
  {
    id: "address",
    title: "Address Proof",
    description: "Verify your residential address",
    icon: ClipboardList
  },
  {
    id: "review",
    title: "Review & Submit",
    description: "Review your documents before submission",
    icon: CheckCircle2
  }
]

export default function KYCDocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<UploadStep>("identity")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocuments>({
    identityDocs: {},
    addressDoc: null
  })

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleIdentityComplete = useCallback((docs: Record<string, DocumentFile>) => {
    setUploadedDocs(prev => ({ ...prev, identityDocs: docs }))
    setCurrentStep("address")
    setError(null)
  }, [])

  const handleAddressComplete = useCallback((doc: AddressProofDocument) => {
    setUploadedDocs(prev => ({ ...prev, addressDoc: doc }))
    setCurrentStep("review")
    setError(null)
  }, [])

  const handleBack = useCallback(() => {
    if (currentStep === "address") {
      setCurrentStep("identity")
    } else if (currentStep === "review") {
      setCurrentStep("address")
    }
  }, [currentStep])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate all documents are present
      const hasIdentityDocs = Object.keys(uploadedDocs.identityDocs).length > 0
      const hasAddressDoc = uploadedDocs.addressDoc !== null

      if (!hasIdentityDocs || !hasAddressDoc) {
        throw new Error("Please upload all required documents")
      }

      // Prepare submission data
      const submissionData = {
        identityDocuments: Object.entries(uploadedDocs.identityDocs).map(([key, doc]) => ({
          documentType: doc.type,
          subType: doc.subType,
          fileName: doc.file?.name,
          fileSize: doc.file?.size,
          mimeType: doc.file?.type,
          encrypted: doc.encrypted,
          verificationStatus: doc.verificationStatus
        })),
        addressDocument: uploadedDocs.addressDoc ? {
          documentType: uploadedDocs.addressDoc.type,
          fileName: uploadedDocs.addressDoc.file?.name,
          fileSize: uploadedDocs.addressDoc.file?.size,
          mimeType: uploadedDocs.addressDoc.file?.type,
          encrypted: uploadedDocs.addressDoc.encrypted,
          issueDate: uploadedDocs.addressDoc.issueDate,
          verificationStatus: uploadedDocs.addressDoc.verificationStatus
        } : null,
        submittedAt: new Date().toISOString(),
        userId: user?.uid
      }

      console.log("Submitting KYC documents:", submissionData)

      // TODO: Submit to backend API
      // await apiClient.post('/kyc/documents', submissionData)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Store submission reference
      sessionStorage.setItem('kyc_submission_id', `kyc_${Date.now()}`)

      // Navigate to verification
      router.push("/kyc/verification")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit documents")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDocumentSummary = useMemo(() => {
    const identityCount = Object.keys(uploadedDocs.identityDocs).length
    const addressCount = uploadedDocs.addressDoc ? 1 : 0
    const totalCount = identityCount + addressCount
    const verifiedCount = Object.values(uploadedDocs.identityDocs)
      .filter(doc => doc.verificationStatus === "verified").length +
      (uploadedDocs.addressDoc?.verificationStatus === "verified" ? 1 : 0)

    return {
      total: totalCount,
      verified: verifiedCount,
      pending: totalCount - verifiedCount
    }
  }, [uploadedDocs])

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="shadow-soft border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Document Upload Progress</h2>
              <Badge variant="secondary" className="bg-teal-100 text-teal-800">
                Step {currentStepIndex + 1} of {steps.length}
              </Badge>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="flex justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = step.id === currentStep
                const isCompleted = index < currentStepIndex
                
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex flex-col items-center space-y-2",
                      isActive && "text-teal-600",
                      isCompleted && "text-green-600",
                      !isActive && !isCompleted && "text-gray-400"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      "border-2 transition-colors",
                      isActive && "border-teal-600 bg-teal-50",
                      isCompleted && "border-green-600 bg-green-50",
                      !isActive && !isCompleted && "border-gray-300 bg-white"
                    )}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">{step.title}</p>
                      <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === "identity" && (
        <DocumentUploadStep
          onComplete={handleIdentityComplete}
          initialDocuments={uploadedDocs.identityDocs}
        />
      )}

      {currentStep === "address" && (
        <AddressProofStep
          onComplete={handleAddressComplete}
          onBack={handleBack}
          initialDocument={uploadedDocs.addressDoc || undefined}
        />
      )}

      {currentStep === "review" && (
        <Card className="shadow-soft border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl text-teal-900">Review Your Documents</CardTitle>
            <CardDescription className="text-gray-600">
              Please review all uploaded documents before submission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{getDocumentSummary.total}</p>
                <p className="text-sm text-gray-600">Total Documents</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{getDocumentSummary.verified}</p>
                <p className="text-sm text-gray-600">Verified</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{getDocumentSummary.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>

            {/* Identity Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Identity Documents</h3>
              <div className="space-y-2">
                {Object.entries(uploadedDocs.identityDocs).map(([key, doc]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {doc.type.replace(/_/g, " ").toUpperCase()}
                          {doc.subType && ` - ${doc.subType.toUpperCase()}`}
                        </p>
                        <p className="text-xs text-gray-500">{doc.file?.name}</p>
                      </div>
                    </div>
                    <Badge
                      variant={doc.verificationStatus === "verified" ? "success" : "secondary"}
                      className={cn(
                        doc.verificationStatus === "verified" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      )}
                    >
                      {doc.verificationStatus === "verified" ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Address Document */}
            {uploadedDocs.addressDoc && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Address Proof</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {uploadedDocs.addressDoc.type.replace(/_/g, " ").toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {uploadedDocs.addressDoc.file?.name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={uploadedDocs.addressDoc.verificationStatus === "verified" ? "success" : "secondary"}
                    className={cn(
                      uploadedDocs.addressDoc.verificationStatus === "verified" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    )}
                  >
                    {uploadedDocs.addressDoc.verificationStatus === "verified" ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <Alert className="bg-teal-50 border-teal-200">
              <Lock className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                All documents are encrypted end-to-end and will be permanently deleted after verification.
                Your data is protected in compliance with GDPR and CCPA regulations.
              </AlertDescription>
            </Alert>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Documents
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy & Security Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Bank-Level Security</h4>
        </div>
        <div className="space-y-2 text-xs text-gray-600 max-w-2xl mx-auto">
          <p>
            Your documents are protected with AES-256 encryption, the same standard used by financial institutions.
          </p>
          <p>
            We comply with international data protection regulations including GDPR, CCPA, and SOC 2 Type II.
          </p>
          <p>
            All documents are automatically deleted within 30 days after verification completion.
          </p>
        </div>
      </div>
    </div>
  )
}