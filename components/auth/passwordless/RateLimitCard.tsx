"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Clock, 
  AlertTriangle, 
  Shield, 
  RefreshCw,
  Lock,
  ChevronRight,
  Info
} from "lucide-react"
import Link from "next/link"

interface RateLimitCardProps {
  resetTime: Date | number
  attemptsRemaining?: number
  maxAttempts?: number
  onRetry?: () => void
  showAlternatives?: boolean
  className?: string
}

export default function RateLimitCard({
  resetTime,
  attemptsRemaining = 0,
  maxAttempts = 3,
  onRetry,
  showAlternatives = true,
  className
}: RateLimitCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const reset = typeof resetTime === 'number' ? resetTime : resetTime.getTime()
      const diff = reset - now

      if (diff <= 0) {
        setTimeRemaining("0s")
        setCanRetry(true)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      let timeStr = ""
      if (hours > 0) timeStr += `${hours}h `
      if (minutes > 0 || hours > 0) timeStr += `${minutes}m `
      timeStr += `${seconds}s`

      setTimeRemaining(timeStr.trim())
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [resetTime])

  const getProgressPercentage = () => {
    return ((maxAttempts - attemptsRemaining) / maxAttempts) * 100
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-700" />
          </div>
        </div>
        <CardTitle className="text-2xl font-display">Rate Limit Reached</CardTitle>
        <CardDescription className="text-base">
          Too many sign-in attempts. Please wait before trying again.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rate Limit Status */}
        <div className="space-y-4">
          {/* Rate limit notice */}
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Rate limit will reset in approximately 1 hour
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This limit helps protect your account from unauthorized access attempts.
                </p>
              </div>
            </div>
          </div>

          {/* Attempts Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Attempts used</span>
              <span className="font-medium text-neutral-900">
                {maxAttempts - attemptsRemaining} / {maxAttempts}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Security Message */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Why this limit?</strong> We limit sign-in attempts to protect your account from unauthorized access attempts.
          </AlertDescription>
        </Alert>

        {/* Alternative Sign-in Methods */}
        {showAlternatives && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-neutral-900">Try another method:</h4>
            
            <Link href="/login?method=password" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <span className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Sign in with password
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
              </Button>
            </Link>

            <Link href="/forgot-password" className="block">
              <Button variant="outline" className="w-full justify-between group">
                <span className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset your password
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
              </Button>
            </Link>
          </div>
        )}

        {/* Retry Button (when available) */}
        {canRetry && onRetry && (
          <Button
            onClick={onRetry}
            className="w-full bg-teal-900 hover:bg-teal-800 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}

        {/* Additional Help */}
        <div className="pt-4 border-t">
          <Alert className="border-neutral-200">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Need immediate access?</strong>{" "}
              <Link href="/support" className="text-teal-700 hover:text-teal-900">
                Contact support
              </Link>{" "}
              if you're locked out of your account.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}