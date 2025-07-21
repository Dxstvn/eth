"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context-v2"
import { toast } from "sonner"

interface AuthGuardOptions {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireEmailVerified?: boolean
  redirectTo?: string
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const {
    requireAuth = true,
    requireAdmin = false,
    requireEmailVerified = false,
    redirectTo = "/sign-in"
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, isAdmin, authToken } = useAuth()

  useEffect(() => {
    if (loading) return

    // Check if token exists and is valid
    if (requireAuth && !authToken) {
      toast.error("Your session has expired. Please sign in again.")
      router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // Check authentication
    if (requireAuth && !user) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // Check admin status
    if (requireAdmin && !isAdmin) {
      toast.error("Admin access required")
      router.push("/dashboard")
      return
    }

    // Check email verification
    if (requireEmailVerified && user && !user.emailVerified) {
      toast.warning("Please verify your email to continue")
      router.push("/verify-email")
      return
    }
  }, [user, loading, isAdmin, authToken, requireAuth, requireAdmin, requireEmailVerified, router, pathname, redirectTo])

  return {
    user,
    loading,
    isAdmin,
    isAuthenticated: !!user && !!authToken,
    isAuthorized: requireAdmin ? isAdmin : true
  }
}