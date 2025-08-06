"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Shield, ArrowRight, ArrowLeft } from "lucide-react"
import { DocumentUploadStep } from "@/components/kyc/steps/DocumentUploadStep"
import { useKYC } from "@/context/kyc-context"
import { useAuth } from "@/context/auth-context-v2"
import { toast } from "sonner"

export default function KYCDocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { kycData, uploadDocument, startKYCSession, isLoading } = useKYC()
  const [documents, setDocuments] = useState<any>({})
  const [isStartingSession, setIsStartingSession] = useState(false)

  // Start KYC session if not already started
  useState(() => {
    const initSession = async () => {
      if (!kycData.sessionId && user) {
        setIsStartingSession(true)
        try {
          await startKYCSession('basic')
        } catch (error) {
          console.error('Failed to start KYC session:', error)
          toast.error('Failed to start verification session. Please try again.')
        } finally {
          setIsStartingSession(false)
        }
      }
    }
    initSession()
  })

  const handleDocumentComplete = async (uploadedDocuments: any) => {
    setDocuments(uploadedDocuments)
    
    // Upload the primary document to backend
    try {
      const primaryDoc = Object.entries(uploadedDocuments).find(
        ([key, doc]: [string, any]) => doc?.file && key.includes('_front')
      )
      
      if (primaryDoc) {
        const [docKey, docData] = primaryDoc as [string, any]
        const documentType = docKey.includes('passport') ? 'passport' : 
                           docKey.includes('drivers_license') ? 'drivers_license' : 
                           'national_id'
        
        await uploadDocument(documentType, docData.file)
        toast.success("Documents uploaded successfully")
        router.push("/onboarding/kyc-selfie")
      }
    } catch (error) {
      console.error('Failed to upload documents:', error)
      toast.error('Failed to upload documents. Please try again.')
    }
  }

  const handleBack = () => {
    router.push("/onboarding/basic-info")
  }

  return (
    <div className="container max-w-7xl mx-auto p-8">
      <div className="space-y-6">
        {/* Progress indicator with brand colors */}
        <div className="w-full">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step 3 of 5</span>
            <span>Document Verification</span>
          </div>
          <Progress value={60} className="h-2 bg-gray-200 [&>div]:bg-purple-600" />
        </div>
        
        {/* Main card with brand shadow */}
        <Card className="shadow-soft border-gray-200">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-purple-900" />
            </div>
            <CardTitle className="text-3xl font-bold text-purple-900 font-display">
              Document Verification
            </CardTitle>
            <CardDescription className="text-lg mt-3 text-gray-600 font-sans">
              Upload your identity document for verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isStartingSession || isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Initializing verification session...</p>
              </div>
            ) : (
              <>
                <DocumentUploadStep 
                  onComplete={handleDocumentComplete}
                  onBack={handleBack}
                  initialDocuments={documents}
                />
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Security notice with brand styling */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <div className="text-sm text-purple-800 font-sans">
              <p className="font-medium mb-1">Bank-Level Security</p>
              <p className="text-xs">
                Your documents are encrypted end-to-end using AES-256 encryption. 
                Files are watermarked and securely deleted after verification.
              </p>
            </div>
          </div>
        </div>
        
        {/* Skip notice */}
        {!user?.kycLevel || user.kycLevel === 'none' && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              Identity verification is required to access all ClearHold features. 
              You can skip this step now, but you'll have limited functionality until completed.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}