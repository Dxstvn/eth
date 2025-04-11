"use client"

import { useEffect } from "react"
import { useToast, setToastHandler } from "./use-toast"

export function Toaster() {
  const { toasts, addToast, dismissToast } = useToast()

  // Set up the toast handler for the global toast function
  useEffect(() => {
    setToastHandler(addToast)

    return () => {
      setToastHandler(undefined)
    }
  }, [addToast])

  if (!toasts.length) return null

  return (
    <div className="fixed top-0 right-0 p-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="bg-white rounded-lg shadow-lg p-4 min-w-[300px] animate-in slide-in-from-right">
          {toast.title && <div className="font-semibold">{toast.title}</div>}
          {toast.description && <div className="text-sm text-gray-500">{toast.description}</div>}
          {toast.action && <div className="mt-2">{toast.action}</div>}
          <button
            onClick={() => dismissToast(toast.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
