"use client"

import { Button } from "@/components/ui/button"
import { Mail, Key } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordlessAuthToggleProps {
  isPasswordless: boolean
  onToggle: (isPasswordless: boolean) => void
  className?: string
}

export default function PasswordlessAuthToggle({
  isPasswordless,
  onToggle,
  className
}: PasswordlessAuthToggleProps) {
  return (
    <div className={cn("flex items-center justify-center space-x-2 p-1 bg-gray-100 rounded-lg", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggle(false)}
        className={cn(
          "flex-1 rounded-md transition-all duration-200",
          !isPasswordless
            ? "bg-white text-teal-900 shadow-sm hover:bg-white"
            : "text-gray-600 hover:text-gray-900 hover:bg-transparent"
        )}
      >
        <Key className="mr-2 h-4 w-4" />
        Password
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggle(true)}
        className={cn(
          "flex-1 rounded-md transition-all duration-200",
          isPasswordless
            ? "bg-white text-teal-900 shadow-sm hover:bg-white"
            : "text-gray-600 hover:text-gray-900 hover:bg-transparent"
        )}
      >
        <Mail className="mr-2 h-4 w-4" />
        Email
      </Button>
    </div>
  )
}