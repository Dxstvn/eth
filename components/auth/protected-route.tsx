"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context-v2"
import LoadingScreen from "@/components/loading-screen"
import { toast } from "sonner"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireEmailVerified?: boolean
  requireOnboarding?: boolean
  requireKYC?: boolean | 'basic' | 'enhanced' | 'full'
  fallbackPath?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireEmailVerified = false,
  requireOnboarding = false,
  requireKYC = false,
  fallbackPath = "/sign-in"
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAdmin } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return

    // Check authentication
    if (requireAuth && !user) {
      toast.error("Please sign in to continue")
      router.push(`${fallbackPath}?redirect=${encodeURIComponent(pathname)}`)
      setIsAuthorized(false)
      return
    }

    // Check admin status
    if (requireAdmin && !isAdmin) {
      toast.error("Admin access required")
      router.push("/dashboard")
      setIsAuthorized(false)
      return
    }

    // Check email verification
    if (requireEmailVerified && user && !user.emailVerified) {
      toast.warning("Please verify your email to continue")
      router.push("/verify-email")
      setIsAuthorized(false)
      return
    }

    // Check onboarding completion
    if (requireOnboarding && user && !user.hasCompletedOnboarding) {
      toast.info("Please complete onboarding first")
      router.push("/onboarding")
      setIsAuthorized(false)
      return
    }

    // Check KYC requirement
    if (requireKYC && user) {
      const requiredLevel = typeof requireKYC === 'string' ? requireKYC : 'basic'
      const userKYCLevel = user.kycLevel || 'none'
      const levels = ['none', 'basic', 'enhanced', 'full']
      const userLevelIndex = levels.indexOf(userKYCLevel)
      const requiredLevelIndex = levels.indexOf(requiredLevel)
      
      if (userLevelIndex < requiredLevelIndex || 
          user.kycStatus?.status !== 'approved' ||
          (user.kycStatus?.expiryDate && new Date(user.kycStatus.expiryDate) < new Date())) {
        toast.warning("Please complete identity verification to access this feature")
        router.push("/onboarding/kyc-documents")
        setIsAuthorized(false)
        return
      }
      
      // Check facial verification if KYC is required
      if (user.facialVerificationStatus !== 'passed') {
        toast.warning("Please complete facial verification")
        router.push("/onboarding/kyc-selfie")
        setIsAuthorized(false)
        return
      }
    }

    // All checks passed
    setIsAuthorized(true)
  }, [user, loading, isAdmin, requireAuth, requireAdmin, requireEmailVerified, requireOnboarding, requireKYC, router, pathname, fallbackPath])

  // Show loading while checking auth
  if (loading || isAuthorized === null) {
    return <LoadingScreen />
  }

  // Don't render anything if not authorized (router will handle redirect)
  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

// Higher-order component for protecting pages
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, "children"> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}