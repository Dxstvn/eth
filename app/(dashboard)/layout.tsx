"use client"

import type React from "react"
import AppShell from "@/components/app-shell"
import { useWalletAuthIntegration } from '@/hooks/use-wallet-auth-integration'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Add wallet auth integration
  useWalletAuthIntegration()

  return (
    <AppShell>{children}</AppShell>
  )
}
