"use client"

import type React from "react"
import { Card } from "@/components/ui/card"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { useAuth } from "@/context/auth-context-v2"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Shield, CheckCircle, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface KYCStep {
  id: string
  title: string
  description: string
  href: string
  icon: React.ElementType
  status?: "completed" | "current" | "upcoming"
}

const kycSteps: KYCStep[] = [
  {
    id: "start",
    title: "Get Started",
    description: "Begin your KYC verification process",
    href: "/kyc",
    icon: Shield,
  },
  {
    id: "personal",
    title: "Personal Information",
    description: "Provide your personal details",
    href: "/kyc/personal",
    icon: AlertCircle,
  },
  {
    id: "documents",
    title: "Documents",
    description: "Upload required identification documents",
    href: "/kyc/documents",
    icon: AlertCircle,
  },
  {
    id: "verification",
    title: "Verification",
    description: "Complete identity verification",
    href: "/kyc/verification",
    icon: AlertCircle,
  },
  {
    id: "status",
    title: "Status",
    description: "Check your verification status",
    href: "/kyc/status",
    icon: Clock,
  },
]

export default function KYCLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin")
    }
  }, [user, loading, router])

  // Show loading state
  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-teal-900">Loading...</div>
        </div>
      </ResponsiveContainer>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  // Update step statuses based on current path
  const updatedSteps = kycSteps.map((step, index) => {
    const currentIndex = kycSteps.findIndex(s => pathname === s.href)
    
    if (index < currentIndex) {
      return { ...step, status: "completed" as const, icon: CheckCircle }
    } else if (index === currentIndex) {
      return { ...step, status: "current" as const }
    } else {
      return { ...step, status: "upcoming" as const }
    }
  })

  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-display text-3xl md:text-4xl font-bold text-teal-900 tracking-tight">
              KYC Verification
            </h1>
            <p className="text-body text-gray-600 mt-2">
              Complete your identity verification to unlock all features
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="shadow-soft p-6">
          <nav aria-label="KYC Progress">
            <ol className="flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
              {updatedSteps.map((step, index) => (
                <li key={step.id} className="flex-1">
                  <Link
                    href={step.href}
                    className={cn(
                      "group flex flex-col items-center text-center transition-colors",
                      step.status === "completed" && "cursor-pointer",
                      step.status === "current" && "cursor-pointer",
                      step.status === "upcoming" && "cursor-not-allowed opacity-50"
                    )}
                    onClick={(e) => {
                      if (step.status === "upcoming") {
                        e.preventDefault()
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                        step.status === "completed" && "border-green-600 bg-green-600 text-white",
                        step.status === "current" && "border-teal-900 bg-teal-900 text-white",
                        step.status === "upcoming" && "border-gray-300 bg-white text-gray-400"
                      )}
                    >
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="mt-2 text-sm font-medium text-gray-900">
                      {step.title}
                    </span>
                    <span className="mt-1 text-xs text-gray-500 max-w-[150px]">
                      {step.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </Card>

        {/* Page Content */}
        <div className="min-h-[400px]">
          {children}
        </div>
      </div>
    </ResponsiveContainer>
  )
}