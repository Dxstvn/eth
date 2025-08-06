"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

interface OfflineDetectorProps {
  showWhenOnline?: boolean
  className?: string
  children?: React.ReactNode
}

export default function OfflineDetector({
  showWhenOnline = false,
  className,
  children
}: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (!navigator.onLine) {
        setWasOffline(true)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Clear the "back online" message after a few seconds
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  // Don't show anything if conditions aren't met
  if (isOnline && !showWhenOnline && !wasOffline) {
    return null
  }

  return (
    <div className={cn("fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4", className)}>
      {!isOnline && (
        <Alert className="border-red-200 bg-red-50 shadow-lg animate-in slide-in-from-top-5">
          <WifiOff className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>You're offline</strong> - Sign-in requires an internet connection
          </AlertDescription>
        </Alert>
      )}

      {isOnline && wasOffline && (
        <Alert className="border-green-200 bg-green-50 shadow-lg animate-in slide-in-from-top-5">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Back online</strong> - You can now continue with sign-in
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  )
}

// Hook for using offline detection in components
export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}