"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import LoadingScreen from "@/components/loading-screen"
import Sidebar from "@/components/sidebar"
import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect to home page if user is not authenticated at all
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}

