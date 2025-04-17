"use client"

import * as React from "react"
import { ToastContext } from "./use-toast"

type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

type Toast = ToastProps & {
  id: string
}

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
