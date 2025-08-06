"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Smartphone, 
  QrCode,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Share2
} from "lucide-react"

interface MobileCrossDevicePromptProps {
  email?: string
  linkUrl?: string
  onEmailEntered?: (email: string) => void
  className?: string
}

export default function MobileCrossDevicePrompt({
  email,
  linkUrl,
  onEmailEntered,
  className
}: MobileCrossDevicePromptProps) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleCopyLink = () => {
    if (linkUrl) {
      navigator.clipboard.writeText(linkUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleShare = async () => {
    if (navigator.share && linkUrl) {
      try {
        await navigator.share({
          title: 'ClearHold Sign-in Link',
          text: 'Continue signing in to ClearHold',
          url: linkUrl
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
    }
  }

  const canShare = typeof navigator !== 'undefined' && navigator.share

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-teal-900" />
          </div>
        </div>
        <CardTitle className="text-xl font-display">Continue on Mobile</CardTitle>
        <CardDescription>
          Sign in seamlessly across your devices
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mobile-specific options */}
        <div className="space-y-3">
          {/* Option 1: Copy Email */}
          {email && (
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-900">Your Email</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="h-8"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-neutral-600 font-mono break-all">{email}</p>
            </div>
          )}

          {/* Option 2: Share Link (if available) */}
          {linkUrl && canShare && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share sign-in link
            </Button>
          )}

          {/* Option 3: Copy Link */}
          {linkUrl && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  <span className="text-green-600">Link copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy sign-in link
                </>
              )}
            </Button>
          )}

          {/* Option 4: QR Code (toggle) */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowQRCode(!showQRCode)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showQRCode ? "Hide QR Code" : "Show QR Code"}
          </Button>
        </div>

        {/* QR Code Display */}
        {showQRCode && linkUrl && (
          <div className="p-4 bg-white border border-neutral-200 rounded-lg text-center">
            <div className="w-48 h-48 mx-auto bg-neutral-100 rounded-lg flex items-center justify-center mb-3">
              {/* Placeholder for QR code - in real implementation, use a QR library */}
              <QrCode className="h-24 w-24 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-600">
              Scan with your mobile device to continue signing in
            </p>
          </div>
        )}

        {/* Mobile Tips */}
        <Alert className="border-teal-200 bg-teal-50">
          <Smartphone className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-teal-800 text-sm">
            <strong>Tip:</strong> Save this link to continue signing in on your mobile device, or use the same browser where you requested the sign-in link.
          </AlertDescription>
        </Alert>

        {/* Alternative Actions */}
        <div className="pt-2 border-t">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => window.open(`mailto:?subject=ClearHold Sign-in Link&body=${encodeURIComponent(linkUrl || '')}`, '_blank')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email link to myself
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}