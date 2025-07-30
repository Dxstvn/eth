"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  AlertTriangle, 
  ArrowRight, 
  Home,
  RefreshCw,
  Phone,
  Clock
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import confetti from "canvas-confetti"

type VerificationStatus = "GREEN" | "YELLOW" | "RED" | null

interface StatusConfig {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  showConfetti: boolean
}

const statusConfigs: Record<string, StatusConfig> = {
  GREEN: {
    icon: CheckCircle,
    iconColor: "text-green-700",
    iconBg: "bg-green-100",
    title: "Verification Complete!",
    description: "Your identity has been successfully verified. You now have full access to all ClearHold features.",
    showConfetti: true
  },
  YELLOW: {
    icon: AlertTriangle,
    iconColor: "text-yellow-700",
    iconBg: "bg-yellow-100",
    title: "Additional Review Required",
    description: "Your application requires additional review. We'll contact you within 24-48 hours with next steps.",
    showConfetti: false
  },
  RED: {
    icon: XCircle,
    iconColor: "text-red-700",
    iconBg: "bg-red-100",
    title: "Verification Unsuccessful",
    description: "We were unable to verify your identity with the provided information. Please review the requirements and try again.",
    showConfetti: false
  }
}

export default function CompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<VerificationStatus>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get status from URL params
    const statusParam = searchParams.get("status") as VerificationStatus
    
    if (!statusParam || !["GREEN", "YELLOW", "RED"].includes(statusParam)) {
      // If no valid status, redirect to welcome
      router.push("/onboarding/welcome")
      return
    }

    setStatus(statusParam)
    setLoading(false)

    // Trigger confetti for successful verification
    if (statusParam === "GREEN") {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }, 500)
    }

    // Clear session storage
    sessionStorage.removeItem("kycBasicInfo")
    sessionStorage.removeItem("kycDocumentType")
  }, [router, searchParams])

  const handleContinue = () => {
    if (status === "GREEN") {
      router.push("/dashboard")
    } else {
      router.push("/dashboard?kyc=pending")
    }
  }

  const handleRetry = () => {
    router.push("/onboarding/welcome")
  }

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-teal-600 rounded-full"></div>
      </div>
    )
  }

  const config = statusConfigs[status]

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step 6 of 6</span>
          <span>Complete</span>
        </div>
        <Progress value={100} className="h-2" />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="text-center pb-8">
          <div className={`mx-auto w-24 h-24 ${config.iconBg} rounded-full flex items-center justify-center mb-6`}>
            <config.icon className={`h-12 w-12 ${config.iconColor}`} />
          </div>
          
          <CardTitle className="text-3xl font-bold">
            {config.title}
          </CardTitle>
          
          <CardDescription className="text-base mt-3 max-w-lg mx-auto">
            {config.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status-specific content */}
          {status === "GREEN" && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3">What's Next?</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Create your first escrow transaction</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Connect your crypto wallet</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Explore our secure escrow features</span>
                  </li>
                </ul>
              </div>

              <Alert className="bg-teal-50 border-teal-200">
                <Shield className="h-4 w-4 text-teal-700" />
                <AlertDescription className="text-teal-800">
                  <strong>Enhanced Security Enabled</strong>
                  <p className="mt-1">Your account now has access to high-value transactions and advanced escrow features.</p>
                </AlertDescription>
              </Alert>
            </>
          )}

          {status === "YELLOW" && (
            <>
              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-700" />
                <AlertDescription className="text-yellow-800">
                  <strong>What happens next?</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Our compliance team will review your application</li>
                    <li>• You'll receive an email within 24-48 hours</li>
                    <li>• You may be asked to provide additional documentation</li>
                    <li>• Limited platform access is available while we review</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Need help?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Contact our support team at support@clearhold.app or call +1 (555) 123-4567
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === "RED" && (
            <>
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-700" />
                <AlertDescription className="text-red-800">
                  <strong>Common reasons for verification failure:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Document was unclear or partially obscured</li>
                    <li>• Information didn't match your application</li>
                    <li>• Document has expired</li>
                    <li>• Technical issues during capture</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Before trying again:
                </p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Ensure your document is valid and not expired</li>
                  <li>• Use good lighting with no shadows or glare</li>
                  <li>• Make sure all text is clearly readable</li>
                  <li>• Check that your information matches your document exactly</li>
                </ul>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {status === "GREEN" ? (
              <Button
                onClick={handleContinue}
                size="lg"
                className="w-full h-14 text-base font-semibold"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : status === "YELLOW" ? (
              <>
                <Button
                  onClick={handleContinue}
                  size="lg"
                  className="w-full h-14 text-base font-semibold"
                >
                  Continue with Limited Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-base"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Return to Homepage
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleRetry}
                  size="lg"
                  className="w-full h-14 text-base font-semibold"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Try Again
                </Button>
                <Button
                  onClick={() => router.push("/support")}
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-base"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Contact Support
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="ghost"
                  size="lg"
                  className="w-full h-14 text-base"
                >
                  Return to Homepage
                </Button>
              </>
            )}
          </div>

          {/* Security Footer */}
          <div className="text-center pt-6 border-t">
            <p className="text-xs text-gray-500">
              Your verification data is encrypted and stored securely in compliance with GDPR and data protection regulations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}