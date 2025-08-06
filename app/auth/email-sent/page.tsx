"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowLeft, 
  Mail, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  CheckCircle,
  Info
} from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import CheckYourEmailComponent from "@/components/auth/CheckYourEmailComponent"
import RateLimitCard from "@/components/auth/passwordless/RateLimitCard"

export default function EmailSentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { sendPasswordlessLink } = useAuth()
  
  const email = searchParams.get("email") || ""
  const [canResend, setCanResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitResetTime, setRateLimitResetTime] = useState<Date | null>(null)


  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendCooldown])


  const handleResend = async () => {
    if (!canResend || !email) return

    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      await sendPasswordlessLink(email)
      setResendSuccess(true)
      setCanResend(false)
      setResendCooldown(60) // 1 minute cooldown
      
      // Reset success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error: any) {
      setResendError(error.message || "Failed to resend email")
      
      // Check if it's a rate limit error
      if (error.message?.includes("Too many attempts")) {
        setIsRateLimited(true)
        setRateLimitResetTime(new Date(Date.now() + 3600 * 1000)) // 1 hour from now
        setCanResend(false)
        setResendCooldown(3600) // 1 hour cooldown for rate limit
      }
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    // Redirect to login if no email provided
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      {/* Gradient header */}
      <div className="w-full bg-gradient-to-b from-teal-900 to-transparent h-32 absolute top-0 left-0 z-0"></div>

      <Link
        href="/login"
        className="absolute top-8 left-8 z-10 flex items-center text-white hover:text-gold-300 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
      </Link>

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

        {/* Show rate limit card if rate limited */}
        {isRateLimited && rateLimitResetTime ? (
          <RateLimitCard
            resetTime={rateLimitResetTime}
            attemptsRemaining={0}
            maxAttempts={3}
            onRetry={() => {
              setIsRateLimited(false)
              setRateLimitResetTime(null)
              handleResend()
            }}
            className="border-0 shadow-lg"
          />
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-display">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a sign-in link to <span className="font-medium text-neutral-900">{email}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-neutral-900">Next steps:</h3>
              <ol className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">1</span>
                  <span>Check your email inbox for a message from ClearHold</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">2</span>
                  <span>Click the secure sign-in link in the email</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">3</span>
                  <span>You'll be securely signed in to your account</span>
                </li>
              </ol>
            </div>

            {/* Email provider detection */}
            <CheckYourEmailComponent email={email} />

            {/* Link expiration notice */}
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                For your security, this sign-in link will expire in 1 hour.
              </AlertDescription>
            </Alert>

            {/* Resend section */}
            <div className="border-t pt-4">
              <p className="text-sm text-neutral-600 mb-3">
                Didn't receive the email? Check your spam folder or request a new link.
              </p>
              
              {resendError && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}
              
              {resendSuccess && (
                <Alert className="mb-3 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    New sign-in link sent successfully!
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={handleResend}
                disabled={!canResend || isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : !canResend ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Please wait before resending
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Email
                  </>
                )}
              </Button>
            </div>

            {/* Additional help */}
            <Alert className="border-neutral-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> If you're signing in from a different device, you'll need to enter your email address when you click the link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        )}

        {/* Alternative sign-in options */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600">
            Having trouble?{" "}
            <Link href="/login?method=password" className="text-teal-700 hover:text-teal-900">
              Use password sign-in
            </Link>
            {" or "}
            <Link href="/support" className="text-teal-700 hover:text-teal-900">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}