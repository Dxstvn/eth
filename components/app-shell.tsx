"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import { useMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/context/auth-context"
import { useFirebase } from "@/components/firebase-provider"
import LoadingScreen from "@/components/loading-screen"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading: authLoading, isAdmin } = useAuth()
  const { initialized, initializing } = useFirebase()
  const router = useRouter()

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname, isMobile])

  // Determine if we're on the landing page
  const isLandingPage = pathname === "/"

  // Redirect to home if not admin and trying to access dashboard
  useEffect(() => {
    if (initialized && !authLoading && !isAdmin && pathname.startsWith("/dashboard")) {
      router.push("/")
    }
  }, [isAdmin, authLoading, pathname, router, initialized])

  // Show loading screen while Firebase is initializing or auth state is loading
  if (initializing || (!initialized && authLoading)) {
    return <LoadingScreen />
  }

  if (isLandingPage) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isLandingPage={true} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header isLandingPage={false} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="relative flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

