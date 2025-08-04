"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailVerificationLoaderProps {
  message?: string
  className?: string
}

export default function EmailVerificationLoader({
  message = "Verifying your secure link...",
  className
}: EmailVerificationLoaderProps) {
  return (
    <Card className={cn("w-full max-w-md shadow-soft", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-teal-700" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-900 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {message}
          </p>
          <p className="text-sm text-gray-600">
            Please wait while we authenticate your request
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full animate-progress" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}