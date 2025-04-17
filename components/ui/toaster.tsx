"use client"

import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 max-h-screen overflow-hidden">
      {toasts.map(({ id, title, description, action, ...props }) => (
        <div
          key={id}
          className="bg-white rounded-lg shadow-lg p-4 min-w-[300px] animate-in slide-in-from-right"
          {...props}
        >
          {title && <div className="font-semibold">{title}</div>}
          {description && <div className="text-sm text-gray-500">{description}</div>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      ))}
    </div>
  )
}
