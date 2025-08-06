"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  Smartphone, 
  Monitor, 
  ArrowLeftRight,
  Info,
  Copy,
  Check
} from "lucide-react"

interface CrossDeviceHandlerProps {
  email?: string
  onContinue?: () => void
  className?: string
}

export default function CrossDeviceHandler({
  email,
  onContinue,
  className
}: CrossDeviceHandlerProps) {
  const [copied, setCopied] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Show instructions after a brief delay
    const timer = setTimeout(() => setShowInstructions(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={className}>
      {/* Visual Device Transfer */}
      <div className="flex justify-center items-center gap-6 py-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mb-2 shadow-sm">
            <Smartphone className="h-10 w-10 text-neutral-600" />
          </div>
          <p className="text-sm font-medium text-neutral-700">Original Device</p>
          <p className="text-xs text-neutral-500">Where you requested</p>
        </div>
        
        <div className="flex flex-col items-center">
          <ArrowLeftRight className="h-8 w-8 text-teal-600 animate-pulse" />
          <p className="text-xs text-teal-600 mt-2 font-medium">Transferring</p>
        </div>
        
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-teal-100 flex items-center justify-center mb-2 shadow-sm border-2 border-teal-200">
            <Monitor className="h-10 w-10 text-teal-700" />
          </div>
          <p className="text-sm font-medium text-teal-900">Current Device</p>
          <p className="text-xs text-teal-600">Where you are now</p>
        </div>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="space-y-4 animate-fadeIn">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Cross-device sign-in detected.</strong> For security, we need to verify your email address since you're signing in from a different device.
            </AlertDescription>
          </Alert>

          {/* Quick Actions */}
          {email && (
            <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-neutral-900">Your email address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono">
                  {email}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step by Step Guide */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-neutral-900">What happens next:</h4>
            <ol className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">1</span>
                <span className="text-sm text-neutral-600">Enter your email address to verify it's you</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">2</span>
                <span className="text-sm text-neutral-600">We'll confirm the sign-in link matches</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-semibold mr-2">3</span>
                <span className="text-sm text-neutral-600">You'll be securely signed in on this device</span>
              </li>
            </ol>
          </div>

          {/* Continue Button */}
          {onContinue && (
            <Button
              onClick={onContinue}
              className="w-full bg-teal-900 hover:bg-teal-800 text-white"
            >
              Continue with Verification
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

{/* Add animation styles if not already present */}
<style jsx global>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`}</style>