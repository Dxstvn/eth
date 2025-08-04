"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ExternalLink, RefreshCw, Smartphone, CheckCircle } from "lucide-react"
import MagicLinkButton from "./MagicLinkButton"
import { cn } from "@/lib/utils"

interface EmailSentCardProps {
  email: string
  onResendSuccess?: () => void
  onOpenEmailApp?: () => void
  className?: string
}

export default function EmailSentCard({
  email,
  onResendSuccess,
  onOpenEmailApp,
  className
}: EmailSentCardProps) {
  const [showResendSuccess, setShowResendSuccess] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(3600) // 1 hour in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const detectEmailProvider = (email: string): { name: string; url: string } | null => {
    const domain = email.split('@')[1]?.toLowerCase()
    
    const providers: Record<string, { name: string; url: string }> = {
      'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
      'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com' },
      'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com' },
      'yahoo.com': { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
      'icloud.com': { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
      'protonmail.com': { name: 'ProtonMail', url: 'https://mail.protonmail.com' },
    }

    return providers[domain] || null
  }

  const emailProvider = detectEmailProvider(email)

  const handleOpenEmail = () => {
    if (emailProvider) {
      window.open(emailProvider.url, '_blank')
    }
    onOpenEmailApp?.()
  }

  const handleResendSuccess = () => {
    setShowResendSuccess(true)
    setTimeout(() => setShowResendSuccess(false), 3000)
    onResendSuccess?.()
  }

  return (
    <Card className={cn("w-full max-w-md shadow-soft", className)}>
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
          <Mail className="h-6 w-6 text-teal-700" />
        </div>
        <CardTitle className="text-2xl font-bold text-teal-900 font-display">
          Check your email
        </CardTitle>
        <CardDescription className="text-gray-600">
          We've sent a secure sign-in link to:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="font-medium text-gray-900">{email}</p>
        </div>

        {showResendSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              A new sign-in link has been sent to your email
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Click the link in your email to securely sign in to ClearHold.</p>
            <p className="flex items-center justify-center gap-2">
              <span>Link expires in:</span>
              <span className="font-mono font-medium text-teal-900">
                {formatTime(timeRemaining)}
              </span>
            </p>
          </div>

          {emailProvider && (
            <Button
              onClick={handleOpenEmail}
              variant="default"
              className="w-full bg-teal-900 hover:bg-teal-800 text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open {emailProvider.name}
            </Button>
          )}

          <MagicLinkButton
            email={email}
            onSuccess={handleResendSuccess}
            variant="outline"
            className="w-full border-teal-200 text-teal-700 hover:bg-teal-50"
          />
        </div>

        <div className="border-t pt-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Didn't receive the email?</p>
            <ul className="space-y-1 ml-4">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Add noreply@clearhold.app to your contacts</li>
            </ul>
          </div>
        </div>

        {/* Mobile-specific helper */}
        <div className="md:hidden">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => window.location.href = 'mailto:'}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Open Email App
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}