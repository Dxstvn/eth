"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Shield, 
  AlertTriangle, 
  ArrowRight, 
  Home,
  RefreshCw,
  Phone,
  Clock,
  FileCheck
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context-v2"
import { useKYC } from "@/context/kyc-context"
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
  const { user, updateProfile } = useAuth()
  const { kycData, refreshKYCStatus } = useKYC()
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  // Trigger confetti animation on mount
  useEffect(() => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    setLoading(false)

    // Clear session storage
    sessionStorage.removeItem("kycBasicInfo")
    sessionStorage.removeItem("kycDocumentType")

    return () => clearInterval(interval)
  }, [])

  // Refresh KYC status on mount
  useEffect(() => {
    refreshKYCStatus()
  }, [])

  const handleContinueToDashboard = async () => {
    setIsUpdating(true)
    
    try {
      // Update user profile to mark onboarding as complete
      await updateProfile({
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date().toISOString()
      })
      
      // Navigate to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to update profile:", error)
      // Still navigate to dashboard even if update fails
      router.push("/dashboard")
    }
  }

  const getVerificationStatus = () => {
    if (kycData.status === 'approved') {
      return {
        title: "Identity Verified",
        description: "Your identity has been successfully verified",
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-100"
      }
    } else if (kycData.status === 'under_review') {
      return {
        title: "Verification In Progress",
        description: "Your documents are being reviewed. This usually takes 1-2 minutes.",
        icon: Clock,
        color: "text-amber-600",
        bgColor: "bg-amber-100"
      }
    } else {
      return {
        title: "Verification Pending",
        description: "Your verification is being processed",
        icon: FileCheck,
        color: "text-blue-600",
        bgColor: "bg-blue-100"
      }
    }
  }

  const status = getVerificationStatus()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-teal-600 rounded-full"></div>
      </div>
    )
  }

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

      <Card className="shadow-soft border-gray-200">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          
          <CardTitle className="text-3xl font-bold text-teal-900 font-display">
            Welcome to ClearHold!
          </CardTitle>
          
          <CardDescription className="text-lg mt-3 text-gray-600 font-sans">
            You've successfully completed the onboarding process
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Account Created</h3>
              <p className="text-xs text-gray-600">Your secure account is ready</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`w-12 h-12 ${status.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <status.icon className={`h-6 w-6 ${status.color}`} />
              </div>
              <h3 className="font-semibold text-sm mb-1">{status.title}</h3>
              <p className="text-xs text-gray-600">{status.description}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Ready to Transact</h3>
              <p className="text-xs text-gray-600">Start creating secure escrows</p>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4 text-teal-900">What you can do now:</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Create your first escrow transaction for crypto or real estate</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Connect your crypto wallets to start transacting</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Invite contacts to join your trusted network</span>
              </li>
              <li className="flex items-start">
                <span className="text-teal-600 mr-2">•</span>
                <span>Explore our secure document storage features</span>
              </li>
            </ul>
          </div>

          {/* Verification Status Note */}
          {kycData.status === 'under_review' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> While your verification is being processed, you can explore the platform. 
                Some features may be limited until verification is complete.
              </p>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinueToDashboard}
            disabled={isUpdating}
            size="lg"
            className="w-full h-14 text-base font-semibold bg-teal-900 hover:bg-teal-800"
          >
            {isUpdating ? (
              "Loading Dashboard..."
            ) : (
              <>
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          {/* Security Footer */}
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Your data is protected with bank-level encryption</p>
            <p className="mt-1">
              Questions? Contact our support team at{" "}
              <a href="mailto:support@clearhold.app" className="text-teal-600 hover:underline">
                support@clearhold.app
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}