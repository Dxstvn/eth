"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Fingerprint,
  Globe,
  Clock
} from "lucide-react"

interface DeviceInfo {
  type: "mobile" | "tablet" | "desktop"
  browser: string
  os: string
  location?: string
}

interface DeviceVerificationCardProps {
  requestedDevice?: DeviceInfo
  currentDevice?: DeviceInfo
  onVerified?: () => void
  className?: string
}

export default function DeviceVerificationCard({
  requestedDevice,
  currentDevice,
  onVerified,
  className
}: DeviceVerificationCardProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{
    requested: DeviceInfo
    current: DeviceInfo
  }>({
    requested: requestedDevice || detectDevice("requested"),
    current: currentDevice || detectDevice("current")
  })

  // Detect device information
  function detectDevice(type: "requested" | "current"): DeviceInfo {
    if (typeof window === "undefined") {
      return { type: "desktop", browser: "Unknown", os: "Unknown" }
    }

    const userAgent = navigator.userAgent
    let deviceType: "mobile" | "tablet" | "desktop" = "desktop"
    let browser = "Unknown"
    let os = "Unknown"

    // Detect device type
    if (/Mobile|Android|iPhone/i.test(userAgent)) {
      deviceType = "mobile"
    } else if (/iPad|Tablet/i.test(userAgent)) {
      deviceType = "tablet"
    }

    // Detect browser
    if (userAgent.includes("Chrome")) browser = "Chrome"
    else if (userAgent.includes("Safari")) browser = "Safari"
    else if (userAgent.includes("Firefox")) browser = "Firefox"
    else if (userAgent.includes("Edge")) browser = "Edge"

    // Detect OS
    if (userAgent.includes("Windows")) os = "Windows"
    else if (userAgent.includes("Mac")) os = "macOS"
    else if (userAgent.includes("Linux")) os = "Linux"
    else if (userAgent.includes("Android")) os = "Android"
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS"

    // For demo purposes, simulate different devices
    if (type === "requested") {
      return { type: "mobile", browser: "Safari", os: "iOS" }
    }

    return { type: deviceType, browser, os }
  }

  const getDeviceIcon = (type: "mobile" | "tablet" | "desktop") => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-6 w-6" />
      case "tablet":
        return <Tablet className="h-6 w-6" />
      default:
        return <Monitor className="h-6 w-6" />
    }
  }

  const handleVerification = async () => {
    setIsVerifying(true)
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsVerifying(false)
    onVerified?.()
  }

  const isSameDevice = deviceInfo.requested.type === deviceInfo.current.type && 
                      deviceInfo.requested.browser === deviceInfo.current.browser

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-amber-700" />
          </div>
        </div>
        <CardTitle className="text-2xl font-display">Device Verification</CardTitle>
        <CardDescription>
          Confirming your device for secure sign-in
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Device Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Requested Device */}
          <div className="text-center p-4 rounded-lg bg-neutral-50 border border-neutral-200">
            <div className="flex justify-center mb-2 text-neutral-600">
              {getDeviceIcon(deviceInfo.requested.type)}
            </div>
            <h4 className="font-semibold text-sm text-neutral-900 mb-1">Requested From</h4>
            <p className="text-xs text-neutral-600">{deviceInfo.requested.browser}</p>
            <p className="text-xs text-neutral-500">{deviceInfo.requested.os}</p>
            <div className="mt-2 flex items-center justify-center text-xs text-neutral-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>2 minutes ago</span>
            </div>
          </div>

          {/* Current Device */}
          <div className="text-center p-4 rounded-lg bg-teal-50 border border-teal-200">
            <div className="flex justify-center mb-2 text-teal-700">
              {getDeviceIcon(deviceInfo.current.type)}
            </div>
            <h4 className="font-semibold text-sm text-teal-900 mb-1">Current Device</h4>
            <p className="text-xs text-teal-700">{deviceInfo.current.browser}</p>
            <p className="text-xs text-teal-600">{deviceInfo.current.os}</p>
            <div className="mt-2 flex items-center justify-center text-xs text-teal-600">
              <Globe className="h-3 w-3 mr-1" />
              <span>This device</span>
            </div>
          </div>
        </div>

        {/* Security Status */}
        {!isSameDevice && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You're signing in from a different device than where you requested the link. This requires additional verification for your security.
            </AlertDescription>
          </Alert>
        )}

        {isSameDevice && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Device verified! You're signing in from the same device where you requested the link.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Features */}
        <div className="space-y-3 p-4 bg-neutral-50 rounded-lg">
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center">
            <Fingerprint className="h-4 w-4 mr-2 text-teal-700" />
            Security Features Active
          </h4>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Encrypted connection (HTTPS)</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Device fingerprint verification</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>Time-limited sign-in link</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
              <span>IP address validation</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        {!isSameDevice && (
          <Button
            onClick={handleVerification}
            disabled={isVerifying}
            className="w-full bg-teal-900 hover:bg-teal-800 text-white"
          >
            {isVerifying ? "Verifying Device..." : "Verify & Continue"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}