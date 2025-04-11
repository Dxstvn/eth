"use client"

import type React from "react"
import { AuthProvider } from "@/context/auth-context"
import AppShell from "@/components/app-shell"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
