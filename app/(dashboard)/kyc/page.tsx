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
  const [isTouch, setIsTouch] = useState(false)

  // Detect touch device
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

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
    <main className="space-y-6" role="main">
      {/* Skip navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-teal-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      {/* Status Alert */}
      {kycStatus.status === "not_started" && (
        <Alert role="status" aria-live="polite">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <strong>Account Status:</strong> Your account is not yet verified. Complete KYC to unlock all features.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card className="shadow-soft" id="main-content">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4" role="img" aria-label="Security shield icon">
            <Shield className="h-8 w-8 text-teal-900" aria-hidden="true" />
          </div>
          <CardTitle as="h1" className="text-2xl">Welcome to KYC Verification</CardTitle>
          <CardDescription className="text-base mt-2">
            Verify your identity to unlock the full potential of ClearHold's secure escrow services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <section aria-labelledby="benefits-heading">
            <h2 id="benefits-heading" className="text-lg font-semibold mb-4">Why Complete KYC?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg touch-manipulation" role="listitem">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4" role="img" aria-label={`${benefit.title} icon`}>
                    <benefit.icon className="h-8 w-8 text-teal-900" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold mb-2 text-base">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Requirements */}
          <section aria-labelledby="requirements-heading">
            <h2 id="requirements-heading" className="text-lg font-semibold mb-4">What You'll Need</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2" role="list">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start" role="listitem">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Process Timeline */}
          <section aria-labelledby="process-heading">
            <h2 id="process-heading" className="text-lg font-semibold mb-4">Verification Process</h2>
            <ol className="space-y-4 sm:space-y-3" role="list">
              <li className="flex items-start sm:items-center" role="listitem">
                <div className="w-12 h-12 bg-teal-900 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 touch-manipulation" aria-label="Step 1">
                  <span aria-hidden="true">1</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-base">Personal Information</h3>
                  <p className="text-sm text-gray-600 mt-1">Provide your basic details (approximately 2 minutes)</p>
                </div>
              </li>
              <li className="flex items-start sm:items-center" role="listitem">
                <div className="w-12 h-12 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 touch-manipulation" aria-label="Step 2">
                  <span aria-hidden="true">2</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-base">Document Upload</h3>
                  <p className="text-sm text-gray-600 mt-1">Upload required identification documents (approximately 3 minutes)</p>
                </div>
              </li>
              <li className="flex items-start sm:items-center" role="listitem">
                <div className="w-12 h-12 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 touch-manipulation" aria-label="Step 3">
                  <span aria-hidden="true">3</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-base">Risk Assessment</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete compliance questionnaire (approximately 3 minutes)</p>
                </div>
              </li>
              <li className="flex items-start sm:items-center" role="listitem">
                <div className="w-12 h-12 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 touch-manipulation" aria-label="Step 4">
                  <span aria-hidden="true">4</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-base">Identity Verification</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete selfie verification (approximately 1 minute)</p>
                </div>
              </li>
              <li className="flex items-start sm:items-center" role="listitem">
                <div className="w-12 h-12 bg-gray-300 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0 touch-manipulation" aria-label="Step 5">
                  <span aria-hidden="true">5</span>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-base">Review & Approval</h3>
                  <p className="text-sm text-gray-600 mt-1">We'll review your application (24-48 hours)</p>
                </div>
              </li>
            </ol>
          </section>

          {/* Action Buttons */}
          <nav className="flex flex-col gap-4 pt-6" role="navigation" aria-label="KYC actions">
            {kycStatus.status === "not_started" ? (
              <Button 
                onClick={handleStartKYC} 
                size="lg" 
                className="w-full h-14 text-base font-semibold touch-manipulation active:scale-98 transition-transform"
                aria-describedby="start-kyc-help"
              >
                Start KYC Verification
                <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleStartKYC} 
                  size="lg" 
                  className="w-full h-14 text-base font-semibold touch-manipulation active:scale-98 transition-transform mb-3"
                  aria-describedby="continue-kyc-help"
                >
                  Continue KYC Process
                  <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
                <Button 
                  onClick={handleCheckStatus} 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-12 text-base touch-manipulation active:scale-98 transition-transform"
                  aria-describedby="check-status-help"
                >
                  Check Application Status
                </Button>
              </>
            )}
            
            {/* Hidden help text for screen readers */}
            <div className="sr-only">
              <div id="start-kyc-help">Begin the identity verification process to unlock all ClearHold features</div>
              <div id="continue-kyc-help">Resume your partially completed KYC application</div>
              <div id="check-status-help">View the current status of your KYC application</div>
            </div>
          </nav>

          {/* Privacy Notice */}
          <footer className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Your information is securely encrypted and will only be used for verification purposes.
              Read our <a 
                href="/privacy" 
                className="text-teal-900 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded"
                aria-label="Privacy Policy - opens in same window"
              >
                Privacy Policy
              </a> for more details.
            </p>
          </footer>
        </CardContent>
      </Card>
    </main>
  )
}