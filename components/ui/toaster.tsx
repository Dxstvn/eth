"use client"

import { useToast } from "@/components/ui/toast-provider"

export function Toaster() {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 max-h-screen overflow-hidden">
      {toasts.map(({ id, title, description, action, variant }) => (
        <div
          key={id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[300px] animate-in slide-in-from-right ${
            variant === "destructive" ? "border-l-4 border-red-500" : ""
          }`}
        >
          {title && <div className="font-semibold">{title}</div>}
          {description && <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>}
          {action && <div className="mt-2">{action}</div>}
          <button
            onClick={() => dismissToast(id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
