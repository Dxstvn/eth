"use client"

import { useEffect } from "react"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"

interface ToastProps {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  onClose: (id: string) => void
}

export function PasswordlessToast({
  id,
  type,
  title,
  description,
  duration = 5000,
  onClose
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-amber-50 border-amber-200"
      case "info":
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg",
        "animate-in slide-in-from-top-5 fade-in duration-300",
        getStyles()
      )}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium",
          type === "success" && "text-green-900",
          type === "error" && "text-red-900",
          type === "warning" && "text-amber-900",
          type === "info" && "text-blue-900"
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            "mt-1 text-sm",
            type === "success" && "text-green-700",
            type === "error" && "text-red-700",
            type === "warning" && "text-amber-700",
            type === "info" && "text-blue-700"
          )}>
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className={cn(
          "flex-shrink-0 rounded-md p-1 hover:bg-white/50 transition-colors",
          type === "success" && "text-green-600",
          type === "error" && "text-red-600",
          type === "warning" && "text-amber-600",
          type === "info" && "text-blue-600"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Common passwordless authentication toasts
export const passwordlessToasts = {
  linkSent: (email: string) => ({
    type: "success" as ToastType,
    title: "Sign-in link sent!",
    description: `Check ${email} for your secure sign-in link.`
  }),
  
  linkExpired: () => ({
    type: "error" as ToastType,
    title: "Link expired",
    description: "This sign-in link has expired. Please request a new one."
  }),
  
  rateLimited: (timeRemaining: string) => ({
    type: "warning" as ToastType,
    title: "Too many attempts",
    description: `Please wait ${timeRemaining} before trying again.`
  }),
  
  invalidEmail: () => ({
    type: "error" as ToastType,
    title: "Invalid email",
    description: "Please enter a valid email address."
  }),
  
  networkError: () => ({
    type: "error" as ToastType,
    title: "Connection error",
    description: "Please check your internet connection and try again."
  }),
  
  signInSuccess: () => ({
    type: "success" as ToastType,
    title: "Welcome back!",
    description: "You've been successfully signed in."
  }),
  
  linkResent: () => ({
    type: "success" as ToastType,
    title: "Link resent",
    description: "A new sign-in link has been sent to your email."
  }),
  
  crossDevice: () => ({
    type: "info" as ToastType,
    title: "Cross-device sign-in",
    description: "Please enter your email to complete sign-in on this device."
  })
}