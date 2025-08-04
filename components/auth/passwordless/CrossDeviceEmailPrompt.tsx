"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, Monitor, Mail, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CrossDeviceEmailPromptProps {
  onSubmit: (email: string) => Promise<void>
  onCancel?: () => void
  className?: string
}

export default function CrossDeviceEmailPrompt({
  onSubmit,
  onCancel,
  className
}: CrossDeviceEmailPromptProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await onSubmit(email)
    } catch (err: any) {
      setError(err.message || "Email verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("w-full max-w-md shadow-soft", className)}>
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Monitor className="h-6 w-6 text-gray-600" />
          </div>
          <div className="h-px w-8 bg-gray-300" />
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-teal-700" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-teal-900 font-display">
            Complete sign-in
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            It looks like you're signing in from a different device. 
            Please enter your email to continue.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cross-device-email" className="text-teal-900 font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="cross-device-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "pl-9",
                  error ? "border-red-500 focus:ring-red-500" : "focus:ring-teal-500"
                )}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Security tip:</strong> Make sure you're using the same email 
              address you used to request the sign-in link.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-teal-900 hover:bg-teal-800 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="border-gray-300"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}