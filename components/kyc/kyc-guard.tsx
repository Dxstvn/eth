"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Shield, 
  AlertTriangle, 
  ArrowRight, 
  Lock,
  FileText,
  CheckCircle,
  X
} from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import { useKYC } from "@/context/kyc-context"

interface KYCGuardProps {
  children: React.ReactNode
  requiredLevel?: 'basic' | 'enhanced' | 'full'
  blockingMode?: 'modal' | 'banner' | 'full'
  customMessage?: string
  onSkip?: () => void
}

export function KYCGuard({ 
  children, 
  requiredLevel = 'basic',
  blockingMode = 'modal',
  customMessage,
  onSkip
}: KYCGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { kycData, refreshKYCStatus } = useKYC()
  const [showGuard, setShowGuard] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkKYCRequirement = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      // Refresh KYC status to ensure we have latest data
      await refreshKYCStatus()

      const userKYCLevel = user.kycLevel || 'none'
      const levels = ['none', 'basic', 'enhanced', 'full']
      const userLevelIndex = levels.indexOf(userKYCLevel)
      const requiredLevelIndex = levels.indexOf(requiredLevel)
      
      // Check if user meets KYC requirements
      const needsKYC = userLevelIndex < requiredLevelIndex || 
                       user.kycStatus?.status !== 'approved' ||
                       (user.kycStatus?.expiryDate && new Date(user.kycStatus.expiryDate) < new Date()) ||
                       user.facialVerificationStatus !== 'passed'

      setShowGuard(needsKYC)
      setIsLoading(false)
    }

    checkKYCRequirement()
  }, [user, requiredLevel, refreshKYCStatus])

  const handleStartVerification = () => {
    // Store the current path to redirect back after KYC
    sessionStorage.setItem('kycRedirectPath', pathname)
    router.push('/onboarding/welcome')
  }

  const handleDismiss = () => {
    if (onSkip) {
      onSkip()
    }
    setShowGuard(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-teal-600 rounded-full"></div>
      </div>
    )
  }

  if (!showGuard) {
    return <>{children}</>
  }

  // Full page blocking mode
  if (blockingMode === 'full') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-teal-900">
              Identity Verification Required
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {customMessage || `This feature requires ${requiredLevel} identity verification to ensure secure transactions`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-teal-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-teal-900 mb-2">Why is this required?</h4>
              <ul className="space-y-1 text-sm text-teal-700">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Comply with financial regulations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Protect against fraud and money laundering</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Enable secure high-value transactions</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleStartVerification}
                className="w-full bg-teal-900 hover:bg-teal-800"
                size="lg"
              >
                Start Verification
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              {onSkip && (
                <Button 
                  onClick={handleDismiss}
                  variant="outline"
                  className="w-full"
                >
                  Skip for Now
                </Button>
              )}
            </div>

            <p className="text-xs text-center text-gray-500">
              Verification typically takes 5-10 minutes
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Banner mode
  if (blockingMode === 'banner') {
    return (
      <>
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900">Identity Verification Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-amber-800 mb-3">
              {customMessage || `Complete ${requiredLevel} identity verification to access all features.`}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleStartVerification}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                Verify Now
              </Button>
              {onSkip && (
                <Button 
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </>
    )
  }

  // Modal mode (default)
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-soft animate-in fade-in slide-in-from-bottom-5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Verification Required</CardTitle>
                  <CardDescription className="text-sm">
                    Complete identity verification to continue
                  </CardDescription>
                </div>
              </div>
              {onSkip && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {customMessage || `This action requires ${requiredLevel} identity verification. The process takes about 5-10 minutes.`}
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <FileText className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-xs text-gray-600">Upload ID</p>
              </div>
              <div className="space-y-1">
                <Shield className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-xs text-gray-600">Verify Identity</p>
              </div>
              <div className="space-y-1">
                <CheckCircle className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-xs text-gray-600">Get Approved</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleStartVerification}
                className="flex-1 bg-teal-900 hover:bg-teal-800"
              >
                Start Verification
              </Button>
              {onSkip && (
                <Button 
                  onClick={handleDismiss}
                  variant="outline"
                  className="flex-1"
                >
                  Not Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="blur-sm pointer-events-none">
        {children}
      </div>
    </>
  )
}

// Higher-order component for protecting components with KYC
export function withKYCGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<KYCGuardProps, 'children'> = {}
) {
  return function KYCProtectedComponent(props: P) {
    return (
      <KYCGuard {...options}>
        <Component {...props} />
      </KYCGuard>
    )
  }
}

// Hook for checking KYC status programmatically
export function useKYCGuard(requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic') {
  const { user } = useAuth()
  const { kycData } = useKYC()
  
  const checkKYCStatus = () => {
    if (!user) return { isAllowed: false, reason: 'Not authenticated' }
    
    const userKYCLevel = user.kycLevel || 'none'
    const levels = ['none', 'basic', 'enhanced', 'full']
    const userLevelIndex = levels.indexOf(userKYCLevel)
    const requiredLevelIndex = levels.indexOf(requiredLevel)
    
    if (userLevelIndex < requiredLevelIndex) {
      return { isAllowed: false, reason: `Requires ${requiredLevel} KYC level` }
    }
    
    if (user.kycStatus?.status !== 'approved') {
      return { isAllowed: false, reason: 'KYC not approved' }
    }
    
    if (user.kycStatus?.expiryDate && new Date(user.kycStatus.expiryDate) < new Date()) {
      return { isAllowed: false, reason: 'KYC expired' }
    }
    
    if (user.facialVerificationStatus !== 'passed') {
      return { isAllowed: false, reason: 'Facial verification required' }
    }
    
    return { isAllowed: true, reason: null }
  }
  
  return {
    ...checkKYCStatus(),
    kycData,
    user
  }
}