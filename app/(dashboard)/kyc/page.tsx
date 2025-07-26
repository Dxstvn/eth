"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Shield, FileText, Clock, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context-v2"
import { useState, useEffect } from "react"

interface KYCStatus {
  status: "not_started" | "in_progress" | "under_review" | "approved" | "rejected"
  completedSteps: string[]
  rejectionReason?: string
  submittedAt?: string
  approvedAt?: string
}

export default function KYCPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [kycStatus, setKycStatus] = useState<KYCStatus>({
    status: "not_started",
    completedSteps: []
  })

  useEffect(() => {
    // TODO: Fetch actual KYC status from backend
    // For now, using mock data
    const mockStatus: KYCStatus = {
      status: "not_started",
      completedSteps: []
    }
    setKycStatus(mockStatus)
  }, [user])

  const benefits = [
    {
      icon: Shield,
      title: "Enhanced Security",
      description: "Protect your account and transactions with verified identity"
    },
    {
      icon: FileText,
      title: "Higher Transaction Limits",
      description: "Unlock unlimited transaction amounts for your escrow deals"
    },
    {
      icon: Clock,
      title: "Faster Processing",
      description: "Enjoy priority processing for all your transactions"
    }
  ]

  const requirements = [
    "Valid government-issued ID (passport, driver's license, or national ID)",
    "Proof of address (utility bill, bank statement, or rental agreement)",
    "Clear selfie for identity verification",
    "Basic personal information (name, date of birth, address)"
  ]

  const handleStartKYC = () => {
    router.push("/kyc/personal")
  }

  const handleCheckStatus = () => {
    router.push("/kyc/status")
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {kycStatus.status === "not_started" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account is not yet verified. Complete KYC to unlock all features.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card className="shadow-soft">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-teal-900" />
          </div>
          <CardTitle className="text-2xl">Welcome to KYC Verification</CardTitle>
          <CardDescription className="text-base mt-2">
            Verify your identity to unlock the full potential of ClearHold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Why Complete KYC?</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                    <benefit.icon className="h-6 w-6 text-teal-900" />
                  </div>
                  <h4 className="font-medium mb-1">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-lg font-semibold mb-4">What You'll Need</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Process Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Verification Process</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-teal-900 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div className="ml-4">
                  <p className="font-medium">Personal Information</p>
                  <p className="text-sm text-gray-600">Provide your basic details (2 minutes)</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div className="ml-4">
                  <p className="font-medium">Document Upload</p>
                  <p className="text-sm text-gray-600">Upload required documents (3 minutes)</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div className="ml-4">
                  <p className="font-medium">Risk Assessment</p>
                  <p className="text-sm text-gray-600">Complete compliance questionnaire (3 minutes)</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div className="ml-4">
                  <p className="font-medium">Identity Verification</p>
                  <p className="text-sm text-gray-600">Complete selfie verification (1 minute)</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold">
                  5
                </div>
                <div className="ml-4">
                  <p className="font-medium">Review & Approval</p>
                  <p className="text-sm text-gray-600">We'll review your application (24-48 hours)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {kycStatus.status === "not_started" ? (
              <Button onClick={handleStartKYC} size="lg" className="flex-1">
                Start KYC Verification
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button onClick={handleStartKYC} size="lg" className="flex-1">
                  Continue KYC Process
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={handleCheckStatus} variant="outline" size="lg" className="flex-1">
                  Check Status
                </Button>
              </>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Your information is securely encrypted and will only be used for verification purposes.
              Read our <a href="/privacy" className="text-teal-900 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}