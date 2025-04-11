"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"

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

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, ...props }

    setToasts((prev) => [...prev, newToast])

    if (props.duration !== Number.POSITIVE_INFINITY) {
      setTimeout(() => {
        dismissToast(id)
      }, props.duration || 5000)
    }
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}

// Create a simpler API that doesn't require the hook
let toastHandler: ((props: ToastProps) => void) | undefined

export function setToastHandler(handler: (props: ToastProps) => void) {
  toastHandler = handler
}

export const toast = (props: ToastProps) => {
  if (toastHandler) {
    toastHandler(props)
  } else {
    console.warn("Toast handler not set. Make sure ToastProvider is mounted.")
  }
}
