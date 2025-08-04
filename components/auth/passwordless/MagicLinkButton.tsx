"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MagicLinkButtonProps {
  email: string
  onSuccess?: () => void
  onError?: (error: string) => void
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  disabled?: boolean
}

export default function MagicLinkButton({
  email,
  onSuccess,
  onError,
  variant = "default",
  size = "default",
  className,
  disabled = false
}: MagicLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [rateLimitRemaining, setRateLimitRemaining] = useState(3)

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds])

  const handleSendLink = async () => {
    if (!email || cooldownSeconds > 0 || rateLimitRemaining === 0) return

    setIsLoading(true)
    setIsSuccess(false)

    try {
      // TODO: Replace with actual API call in Phase 2
      // const response = await passwordlessAuthService.sendSignInLink(email)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsSuccess(true)
      setCooldownSeconds(60) // 1 minute cooldown
      setRateLimitRemaining(prev => Math.max(0, prev - 1))
      
      onSuccess?.()
      
      // Reset success indicator after 3 seconds
      setTimeout(() => setIsSuccess(false), 3000)
    } catch (err: any) {
      if (err.status === 429) {
        setRateLimitRemaining(0)
        setCooldownSeconds(3600) // 1 hour for rate limit
      }
      onError?.(err.message || "Failed to send sign-in link")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCooldown = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    } else if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${minutes}m ${secs}s`
    }
    return `${seconds}s`
  }

  const isDisabled = disabled || isLoading || cooldownSeconds > 0 || rateLimitRemaining === 0

  return (
    <Button
      onClick={handleSendLink}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        isSuccess && "bg-green-600 hover:bg-green-700",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Email Sent!
        </>
      ) : cooldownSeconds > 0 ? (
        <>
          <Clock className="mr-2 h-4 w-4" />
          Resend in {formatCooldown(cooldownSeconds)}
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Send Secure Link
        </>
      )}
    </Button>
  )
}