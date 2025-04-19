"use client"

import type React from "react"
import { useAuth } from "@/context/auth-context"
import { AuthProvider } from "@/context/auth-context"
import { WalletProvider } from "@/context/wallet-context"
import { OnboardingProvider } from "@/context/onboarding-context"
import { SidebarProvider } from "@/context/sidebar-context"
import { Toaster } from "@/components/ui/toaster"
import UserEmailTracker from "@/components/user-email-tracker"

interface AppShellProps {
  children: React.ReactNode
}

function AppShellContent({ children }: AppShellProps) {
  const { user, loading } = useAuth()

  return (
    <>
      {children}
      <Toaster />
      <UserEmailTracker />
    </>
  )
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <WalletProvider>
        <OnboardingProvider>
          <SidebarProvider>
            <AppShellContent>{children}</AppShellContent>
          </SidebarProvider>
        </OnboardingProvider>
      </WalletProvider>
    </AuthProvider>
  )
}
