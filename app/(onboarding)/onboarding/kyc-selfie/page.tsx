"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Shield, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { LivenessCheckStep, LivenessCheckData } from "@/components/kyc/steps/LivenessCheckStep"
import { useKYC } from "@/context/kyc-context"
import { useAuth } from "@/context/auth-context-v2"
import { toast } from "sonner"

export default function KYCSelfie() {
  const router = useRouter()
  const { user } = useAuth()
  const { kycData, performLivenessCheck, completeKYCSession, isLoading } = useKYC()
  const [livenessData, setLivenessData] = useState<LivenessCheckData | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleLivenessComplete = async (data: LivenessCheckData) => {
    setLivenessData(data)
    
    // Send to backend for verification
    try {
      if (data.capturedImage) {
        await performLivenessCheck(data.capturedImage)
        toast.success("Facial verification completed")
        
        // Complete the KYC session
        setIsCompleting(true)
        await completeKYCSession()
        
        // Update user profile to reflect completed onboarding
        // This would be done through the auth service
        router.push("/onboarding/complete")
      }
    } catch (error) {
      console.error('Failed to perform liveness check:', error)
      toast.error('Facial verification failed. Please try again.')
      setIsCompleting(false)
    }
  }

  const handleBack = () => {
    router.push("/onboarding/kyc-documents")
  }

  const handleSkip = () => {
    toast.info("You can complete verification later from your settings")
    router.push("/dashboard")
  }

  return (
    <div className="container max-w-7xl mx-auto p-8">
      <div className="space-y-6">
        {/* Progress indicator with brand colors */}
        <div className="w-full">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step 4 of 5</span>
            <span>Facial Verification</span>
          </div>
          <Progress value={80} className="h-2 bg-gray-200 [&>div]:bg-purple-600" />
        </div>
        
        {/* Main card with brand shadow */}
        <Card className="shadow-soft border-gray-200">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <Camera className="h-10 w-10 text-purple-900" />
            </div>
            <CardTitle className="text-3xl font-bold text-purple-900 font-display">
              Facial Verification
            </CardTitle>
            <CardDescription className="text-lg mt-3 text-gray-600 font-sans">
              Complete a quick liveness check to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isCompleting ? (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Processing Verification</h3>
                <p className="text-gray-600">Please wait while we complete your verification...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : (
              <LivenessCheckStep 
                onComplete={handleLivenessComplete}
                onBack={handleBack}
                initialData={livenessData}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Security notice with brand styling */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <div className="text-sm text-purple-800 font-sans">
              <p className="font-medium mb-1">Biometric Data Protection</p>
              <p className="text-xs">
                Your facial data is processed locally and encrypted before transmission. 
                We do not store biometric data - only verification results are retained.
                All processing complies with GDPR and privacy regulations.
              </p>
            </div>
          </div>
        </div>
        
        {/* Skip option for existing users */}
        {!isCompleting && !livenessData && (
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip for now (limited features)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}