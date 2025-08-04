import type React from "react"
import "./globals.css"
import { Montserrat, Open_Sans } from "next/font/google"
import type { Metadata } from "next"
import { AuthProvider } from "@/context/auth-context-v2"
import { WalletProvider } from "@/context/wallet-context"
import FirebaseInitCheck from "@/components/firebase-init-check"
import DebugAuthState from "@/components/debug-auth-state"
import { ToastProvider } from "@/components/ui/toast-provider"
import { Toaster } from "@/components/ui/toaster"
import { OnboardingProvider } from "@/context/onboarding-context"
import { SidebarProvider } from "@/context/sidebar-context"
import { TransactionProvider } from "@/context/transaction-context"
import ErrorBoundary from "@/components/ui/error-boundary"
import { createDynamicComponent } from "@/utils/dynamic-imports"
import { Suspense } from "react"
import { SpeedInsights } from '@vercel/speed-insights/next'

// Dynamically import OnboardingFlow for better performance
const OnboardingFlow = createDynamicComponent(
  () => import("@/components/onboarding/onboarding-flow"),
  { ssr: false }
)

// Load Montserrat font with performance optimizations
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
})

// Load Open Sans font with performance optimizations
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: "CryptoEscrow - Secure Real Estate Transactions with Cryptocurrency",
  description:
    "Our escrow service provides a secure, transparent platform for real estate transactions using cryptocurrency, eliminating fraud and ensuring safe transfers.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className={openSans.className}>
        <ErrorBoundary level="page">
          <FirebaseInitCheck />
          <DebugAuthState />
          <AuthProvider>
            <WalletProvider>
              <ToastProvider>
                <SidebarProvider>
                  <TransactionProvider>
                    <OnboardingProvider>
                      {children}
                      <Toaster />
                      <Suspense fallback={null}>
                        <OnboardingFlow />
                      </Suspense>
                    </OnboardingProvider>
                  </TransactionProvider>
                </SidebarProvider>
              </ToastProvider>
            </WalletProvider>
          </AuthProvider>
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  )
}
