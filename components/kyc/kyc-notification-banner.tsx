"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Shield, 
  Clock,
  CheckCircle,
  X,
  ArrowRight,
  Info
} from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import { useKYC } from "@/context/kyc-context"
import { cn } from "@/lib/utils"

interface KYCNotificationBannerProps {
  className?: string
  dismissible?: boolean
  position?: 'top' | 'bottom'
  variant?: 'inline' | 'floating'
}

export function KYCNotificationBanner({ 
  className,
  dismissible = true,
  position = 'top',
  variant = 'inline'
}: KYCNotificationBannerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { kycData, refreshKYCStatus } = useKYC()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if we should show the banner
  useEffect(() => {
    if (!user || isDismissed) {
      setIsVisible(false)
      return
    }

    // Don't show on auth pages or onboarding pages
    if (pathname.includes('/sign-in') || 
        pathname.includes('/sign-up') || 
        pathname.includes('/onboarding')) {
      setIsVisible(false)
      return
    }

    // Check if user has completed onboarding but not KYC
    const hasCompletedOnboarding = user.hasCompletedOnboarding
    const needsKYC = !user.kycLevel || user.kycLevel === 'none' || 
                     user.kycStatus?.status !== 'approved' ||
                     user.facialVerificationStatus !== 'passed'

    setIsVisible(hasCompletedOnboarding && needsKYC)

    // Refresh KYC status periodically if needed
    if (needsKYC) {
      const interval = setInterval(() => {
        refreshKYCStatus()
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }, [user, pathname, isDismissed, refreshKYCStatus])

  const handleStartVerification = () => {
    sessionStorage.setItem('kycRedirectPath', pathname)
    router.push('/onboarding/welcome')
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    // Store dismissal in sessionStorage so it persists during the session
    sessionStorage.setItem('kycBannerDismissed', 'true')
  }

  // Check sessionStorage on mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem('kycBannerDismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  if (!isVisible) return null

  const getBannerConfig = () => {
    if (kycData.status === 'under_review') {
      return {
        icon: Clock,
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-900',
        message: 'Your identity verification is under review. This usually takes 1-2 minutes.',
        showAction: false
      }
    } else if (kycData.status === 'rejected') {
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        message: 'Your verification was unsuccessful. Please try again with valid documents.',
        showAction: true,
        actionText: 'Retry Verification'
      }
    } else if (kycData.status === 'additional_info_required') {
      return {
        icon: Info,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        message: 'Additional information is required to complete your verification.',
        showAction: true,
        actionText: 'Provide Information'
      }
    } else {
      return {
        icon: Shield,
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        textColor: 'text-teal-900',
        message: 'Complete identity verification to unlock all ClearHold features and transaction limits.',
        showAction: true,
        actionText: 'Verify Identity'
      }
    }
  }

  const config = getBannerConfig()

  if (variant === 'floating') {
    return (
      <div 
        className={cn(
          "fixed z-50 left-0 right-0 mx-auto max-w-4xl px-4",
          position === 'top' ? 'top-4' : 'bottom-4',
          className
        )}
      >
        <Alert className={cn(
          "shadow-soft",
          config.bgColor,
          config.borderColor
        )}>
          <div className="flex items-start gap-3">
            <config.icon className={cn("h-5 w-5 mt-0.5", config.iconColor)} />
            <div className="flex-1">
              <AlertDescription className={config.textColor}>
                {config.message}
              </AlertDescription>
            </div>
            <div className="flex items-center gap-2">
              {config.showAction && (
                <Button 
                  onClick={handleStartVerification}
                  size="sm"
                  className="bg-teal-900 hover:bg-teal-800"
                >
                  {config.actionText}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className={cn(
                    "text-gray-400 hover:text-gray-600 transition-colors",
                    config.textColor
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  // Inline variant
  return (
    <Alert className={cn(
      "rounded-none border-x-0",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className="container max-w-7xl mx-auto">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <config.icon className={cn("h-5 w-5", config.iconColor)} />
            <AlertDescription className={cn("text-sm", config.textColor)}>
              {config.message}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-3">
            {config.showAction && (
              <Button 
                onClick={handleStartVerification}
                size="sm"
                variant="default"
                className="h-8 bg-teal-900 hover:bg-teal-800"
              >
                {config.actionText}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  )
}

// Compact version for use in sidebars or smaller spaces
export function KYCNotificationCard({ className }: { className?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { kycData } = useKYC()
  
  if (!user || user.kycLevel !== 'none') return null

  const handleVerify = () => {
    router.push('/onboarding/welcome')
  }

  return (
    <div className={cn(
      "bg-amber-50 border border-amber-200 rounded-lg p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-medium text-sm text-amber-900">
              Verify Your Identity
            </h4>
            <p className="text-xs text-amber-700 mt-1">
              Complete KYC to access all features
            </p>
          </div>
          <Button 
            onClick={handleVerify}
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Start Verification
          </Button>
        </div>
      </div>
    </div>
  )
}