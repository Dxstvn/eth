"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Shield, Camera, FileCheck, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SumsubWebSDK } from "@/components/kyc/sumsub-sdk"

export default function VerifyPage() {
  const router = useRouter()
  const [sdkReady, setSdkReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user has completed previous steps
    const basicInfo = sessionStorage.getItem("kycBasicInfo")
    const documentType = sessionStorage.getItem("kycDocumentType")
    
    if (!basicInfo || !documentType) {
      router.push("/onboarding/welcome")
      return
    }

    setSdkReady(true)
  }, [router])

  const handleComplete = (success: boolean) => {
    if (success) {
      router.push("/onboarding/processing")
    } else {
      setError("Verification was not completed. Please try again.")
    }
  }

  const handleError = (error: any) => {
    console.error("Sumsub SDK error:", error)
    setError("An error occurred during verification. Please try again.")
  }

  const handleBack = () => {
    router.push("/onboarding/document-type")
  }

  if (!sdkReady) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step 4 of 6</span>
          <span>Identity Verification</span>
        </div>
        <Progress value={66.67} className="h-2" />
      </div>

      {error ? (
        <Card className="shadow-lg">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-fit -ml-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <CardTitle className="text-2xl font-bold text-red-600">Verification Error</CardTitle>
            <CardDescription className="text-base">
              {error}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                setError(null)
                setSdkReady(true)
              }}
              size="lg"
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Instructions Card */}
          <Card className="shadow-lg mb-6">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="w-fit -ml-2 mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-teal-900" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Identity Verification</CardTitle>
                  <CardDescription className="text-base">
                    Follow the on-screen instructions to complete verification
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>What to expect:</strong>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-start space-x-2">
                      <Camera className="h-4 w-4 mt-0.5 text-gray-600" />
                      <span className="text-sm">Take photos of your selected document</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <FileCheck className="h-4 w-4 mt-0.5 text-gray-600" />
                      <span className="text-sm">Capture a selfie for identity matching</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Shield className="h-4 w-4 mt-0.5 text-gray-600" />
                      <span className="text-sm">Complete liveness detection</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-gray-600">
                <p>The verification process typically takes 2-3 minutes.</p>
                <p className="mt-1">Ensure you're in a well-lit area with a stable internet connection.</p>
              </div>
            </CardContent>
          </Card>

          {/* Sumsub SDK Container */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <SumsubWebSDK
                onComplete={handleComplete}
                onError={handleError}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}