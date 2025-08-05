"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Lock, ArrowRight, Mail, Shield } from "lucide-react"

interface AuthOptionsCardProps {
  title?: string
  description?: string
  showPasswordless?: boolean
  showTraditional?: boolean
  showBenefits?: boolean
  className?: string
}

export default function AuthOptionsCard({
  title = "Sign In to ClearHold",
  description = "Choose your preferred sign-in method",
  showPasswordless = true,
  showTraditional = true,
  showBenefits = true,
  className
}: AuthOptionsCardProps) {
  const [hoveredOption, setHoveredOption] = useState<"passwordless" | "traditional" | null>(null)

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showPasswordless && (
          <Link href="/login" className="block">
            <div
              className="relative p-4 rounded-lg border-2 border-neutral-200 hover:border-teal-500 transition-all cursor-pointer group"
              onMouseEnter={() => setHoveredOption("passwordless")}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                    <Sparkles className="h-5 w-5 text-teal-900" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-1">Passwordless Sign In</h3>
                  <p className="text-sm text-neutral-600 mb-2">
                    Get a secure magic link sent to your email
                  </p>
                  {showBenefits && hoveredOption === "passwordless" && (
                    <div className="mt-3 space-y-1 text-xs text-neutral-500">
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>More secure than passwords</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>Works on all devices</span>
                      </div>
                    </div>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-teal-600 transition-colors" />
              </div>
            </div>
          </Link>
        )}

        {showTraditional && (
          <Link href="/login?method=password" className="block">
            <div
              className="relative p-4 rounded-lg border-2 border-neutral-200 hover:border-neutral-400 transition-all cursor-pointer group"
              onMouseEnter={() => setHoveredOption("traditional")}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                    <Lock className="h-5 w-5 text-neutral-700" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-1">Traditional Sign In</h3>
                  <p className="text-sm text-neutral-600">
                    Use your email and password
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
              </div>
            </div>
          </Link>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-neutral-500">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.href = "/login"}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  )
}