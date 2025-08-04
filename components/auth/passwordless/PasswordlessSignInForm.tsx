"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordlessSignInFormProps {
  onSuccess?: (email: string) => void
  onError?: (error: string) => void
  className?: string
}

export default function PasswordlessSignInForm({
  onSuccess,
  onError,
  className
}: PasswordlessSignInFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const [rateLimitResetTime, setRateLimitResetTime] = useState<Date | null>(null)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset states
    setError(null)
    setSuccess(false)

    // Validate email
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call in Phase 2
      // const response = await passwordlessAuthService.sendSignInLink(email)
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Store email for verification
      localStorage.setItem("clearhold_email_for_signin", email)
      
      setSuccess(true)
      onSuccess?.(email)
    } catch (err: any) {
      if (err.status === 429) {
        // Rate limit error
        setError("Too many attempts. Please try again in 1 hour.")
        setRateLimitRemaining(0)
        setRateLimitResetTime(new Date(Date.now() + 60 * 60 * 1000))
      } else {
        const errorMessage = err.message || "Failed to send sign-in link. Please try again."
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (resetTime: Date): string => {
    const now = new Date()
    const diff = resetTime.getTime() - now.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  return (
    <Card className={cn("w-full max-w-md shadow-soft", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-teal-900 font-display">
          Sign in to ClearHold
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter your email to receive a secure sign-in link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                We've sent a sign-in link to <strong>{email}</strong>
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Please check your email and click the secure link to sign in.</p>
              <p>The link will expire in 1 hour for your security.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-teal-900 font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "pl-9",
                    error ? "border-red-500 focus:ring-red-500" : "focus:ring-teal-500"
                  )}
                  disabled={isLoading || rateLimitRemaining === 0}
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {rateLimitRemaining === 0 && rateLimitResetTime && (
              <Alert className="border-amber-200 bg-amber-50">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Rate limit reached. Try again in {formatTimeRemaining(rateLimitResetTime)}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || rateLimitRemaining === 0}
              className={cn(
                "w-full bg-teal-900 hover:bg-teal-800 text-white",
                "transition-all duration-200 transform hover:scale-[0.99]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending secure link...
                </>
              ) : (
                "Continue with Email"
              )}
            </Button>

            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}