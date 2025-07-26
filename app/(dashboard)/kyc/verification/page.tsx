"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LivenessCheckStep, type LivenessCheckData } from "@/components/kyc/steps/LivenessCheckStep"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Shield,
  FileCheck,
  ScanFace
} from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"

export default function KYCVerificationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [livenessData, setLivenessData] = useState<LivenessCheckData | null>(null)
  const [verificationComplete, setVerificationComplete] = useState(false)

  const handleLivenessComplete = (data: LivenessCheckData) => {
    setLivenessData(data)
    setVerificationComplete(true)
  }

  const handleBack = () => {
    router.push("/kyc/documents")
  }

  const onSubmit = async () => {
    if (!livenessData || !livenessData.capturedImage) {
      setError("Please complete the facial verification before proceeding")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // TODO: Submit liveness data and complete KYC to backend
      console.log("Submitting KYC verification with liveness data:", {
        timestamp: livenessData.timestamp,
        deviceType: livenessData.deviceType,
        livenessScore: livenessData.livenessScore,
        detectionSteps: livenessData.detectionSteps.length
      })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Navigate to status page
      router.push("/kyc/status")
    } catch (err) {
      setError("Failed to complete verification. Please try again.")
      console.error("Error submitting verification:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">KYC Progress</h3>
          <Badge variant="secondary">Step 3 of 3</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="ml-2 text-sm text-gray-600">Personal Info</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            <span className="ml-2 text-sm text-gray-600">Documents</span>
          </div>
          <div className="flex-1 h-1 bg-gray-200 mx-2" />
          <div className="flex items-center">
            <div className={`w-8 h-8 ${verificationComplete ? 'bg-green-100' : 'bg-teal-100'} rounded-full flex items-center justify-center`}>
              <ScanFace className={`h-5 w-5 ${verificationComplete ? 'text-green-600' : 'text-teal-600'}`} />
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">Facial Verification</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!verificationComplete ? (
        <LivenessCheckStep
          onComplete={handleLivenessComplete}
          onBack={handleBack}
          initialData={livenessData || undefined}
        />
      ) : (
        <>
          {/* Verification Success */}
          <Card className="shadow-soft border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl text-teal-900">Verification Complete</CardTitle>
              <CardDescription className="text-gray-600">
                Your facial verification has been successfully completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Success Alert */}
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong> Your identity has been verified. You can now proceed to complete your KYC application.
                </AlertDescription>
              </Alert>

              {/* Verification Details */}
              {livenessData && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Verification Details</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Device Type:</span>
                        <Badge variant="outline" className="capitalize">
                          {livenessData.deviceType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Liveness Score:</span>
                        <Badge className="bg-green-100 text-green-800">
                          {Math.round(livenessData.livenessScore * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Verification Time:</span>
                        <span className="text-gray-900">
                          {new Date(livenessData.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </div>

                    {/* Captured Image Preview */}
                    {livenessData.capturedImage && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Captured Image:</p>
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={livenessData.capturedImage}
                            alt="Verification selfie"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Steps */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <p className="font-medium text-blue-900 mb-1">What happens next?</p>
                      <p className="text-sm text-blue-800">
                        Your KYC application will be reviewed by our verification team. 
                        This typically takes 1-2 business days. You'll receive an email 
                        notification once the review is complete.
                      </p>
                    </AlertDescription>
                  </Alert>
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
                <Button
                  variant="outline"
                  onClick={() => setVerificationComplete(false)}
                  disabled={isSubmitting}
                >
                  Retake Verification
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? "Submitting..." : "Complete KYC Application"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <div className="text-sm text-teal-800">
                <p className="font-medium mb-1">Your Data is Secure</p>
                <p className="text-xs">
                  All biometric data is encrypted and processed in compliance with GDPR 
                  and privacy regulations. Facial data is automatically deleted after 
                  verification is complete.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}