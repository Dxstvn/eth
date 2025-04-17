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

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, ...props }

    setToasts((prev) => [...prev, newToast])

    if (props.duration !== Number.POSITIVE_INFINITY) {
      setTimeout(() => {
        dismissToast(id)
      }, props.duration || 5000)
    }
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  // Initialize the global toast handler
  React.useEffect(() => {
    window.toast = addToast
    return () => {
      window.toast = undefined
    }
  }, [addToast])

  return <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>{children}</ToastContext.Provider>
}

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
