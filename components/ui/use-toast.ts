"use client"

import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

type Toast = ToastProps & {
  id: string
}

type ToastContextType = {
  toasts: Toast[]
  addToast: (props: ToastProps) => void
  dismissToast: (id: string) => void
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}

// Create a simpler API that doesn't require the hook
export const toast = (props: ToastProps) => {
  if (typeof window !== "undefined" && window.toast) {
    window.toast(props)
  } else {
    console.warn("Toast handler not set. Make sure ToastProvider is mounted.")
  }
}

// Add the toast function to the window object
declare global {
  interface Window {
    toast?: (props: ToastProps) => void
  }
}
