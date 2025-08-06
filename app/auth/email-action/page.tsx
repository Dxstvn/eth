"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Mail, CheckCircle, AlertCircle, Home, ArrowRight } from "lucide-react"
import { passwordlessAuthService } from "@/services/passwordless-auth-service"
import { useAuth } from "@/context/auth-context-v2"
import CrossDeviceAuthForm from "@/components/auth/passwordless/CrossDeviceAuthForm"
import DeviceVerificationCard from "@/components/auth/passwordless/DeviceVerificationCard"
import { PasswordlessErrorState, ExpiredLinkError, InvalidLinkError } from "@/components/auth/passwordless/PasswordlessErrorStates"
import PasswordlessErrorBoundary from "@/components/auth/passwordless/PasswordlessErrorBoundary"

export default function EmailActionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyPasswordlessLink } = useAuth()
  
  // State management
  const [status, setStatus] = useState<"loading" | "needEmail" | "verifying" | "success" | "error">("loading")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  
  // Get the current URL for verification
  const currentUrl = typeof window !== "undefined" ? window.location.href : ""

  useEffect(() => {
    // Check if this is a valid sign-in link
    if (passwordlessAuthService.isSignInWithEmailLink(currentUrl)) {
      // Try to get stored email
      const storedEmail = passwordlessAuthService.getEmailForSignIn()
      
      if (storedEmail) {
        // Same device - email found
        handleSignIn(storedEmail)
      } else {
        // Cross-device - need email
        setStatus("needEmail")
      }
    } else {
      // Not a valid sign-in link
      setError("Invalid sign-in link. Please request a new one.")
      setStatus("error")
    }
  }, [currentUrl])

  const handleSignIn = async (emailToUse: string) => {
    setStatus("verifying")
    setError(null)

    try {
      // Use auth context to verify the sign-in link
      await verifyPasswordlessLink(emailToUse, currentUrl)
      
      // Set success state - the auth context handles the rest
      setStatus("success")
      setIsNewUser(false) // The auth context handles redirection based on user status
      
      // Auth context handles redirection, but we show success state briefly
    } catch (err: any) {
      console.error("Sign-in error:", err)
      setError(err.message || "Failed to complete sign-in. Please try again.")
      setStatus("error")
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email address")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    handleSignIn(email)
  }

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <Card className="border-0 shadow-lg max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-900 mx-auto mb-4" />
              <p className="text-neutral-600">Verifying your sign-in link...</p>
            </CardContent>
          </Card>
        )

      case "needEmail":
        return (
          <>
            <CrossDeviceAuthForm
              onSubmit={handleSignIn}
              isLoading={false}
              error={error}
              className="border-0 shadow-lg max-w-md mx-auto"
            />
            
            {/* Device verification card for additional context */}
            <div className="mt-6">
              <DeviceVerificationCard
                className="border-0 shadow-lg max-w-md mx-auto"
              />
            </div>
          </>
        )

      case "verifying":
        return (
          <Card className="border-0 shadow-lg max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-900 mx-auto mb-4" />
              <p className="text-neutral-600">Completing your sign-in...</p>
            </CardContent>
          </Card>
        )

      case "success":
        return (
          <Card className="border-0 shadow-lg max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-teal-900 mb-2">
                Sign In Successful!
              </h2>
              <p className="text-neutral-600 mb-6">
                {isNewUser 
                  ? "Welcome to ClearHold! Redirecting to setup..."
                  : "Welcome back! Redirecting to your dashboard..."}
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-teal-900" />
              </div>
            </CardContent>
          </Card>
        )

      case "error":
        // Determine error type based on error message
        const errorType = error?.includes("expired") ? "expired" : 
                         error?.includes("Invalid sign-in link") ? "invalid-link" :
                         error?.includes("email") ? "invalid-email" : "generic"
        
        return (
          <PasswordlessErrorState
            type={errorType}
            message={error || undefined}
            onRetry={() => router.push("/login")}
            className="border-0 shadow-lg max-w-md mx-auto"
          />
        )
    }
  }

  return (
    <PasswordlessErrorBoundary>
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      {/* Gradient header */}
      <div className="w-full bg-gradient-to-b from-teal-900 to-transparent h-32 absolute top-0 left-0 z-0"></div>

      <div className="w-full max-w-lg z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-md bg-teal-900 flex items-center justify-center text-white font-bold mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gold-500"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-2xl font-display font-semibold text-teal-900">
                Clear<span className="text-gold-500">Hold</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Main content */}
        {renderContent()}

        {/* Footer links */}
        {status !== "loading" && status !== "verifying" && status !== "success" && (
          <p className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/" className="text-neutral-600 hover:text-neutral-900">
              <Home className="inline-block h-4 w-4 mr-1" />
              Back to Home
            </Link>
          </p>
        )}
      </div>
    </div>
    </PasswordlessErrorBoundary>
  )
}