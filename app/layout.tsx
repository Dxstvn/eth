import type React from "react"
import "./globals.css"
import { Montserrat, Open_Sans } from "next/font/google"
import type { Metadata } from "next"
import { AuthProvider } from "@/context/auth-context"
import { WalletProvider } from "@/context/wallet-context"
import FirebaseInitCheck from "@/components/firebase-init-check"
import { ToastProvider } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Load Montserrat font
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

// Load Open Sans font
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
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
        <FirebaseInitCheck />
        <AuthProvider>
          <WalletProvider>
            <ToastProvider>
              {children}
              <Toaster />
            </ToastProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}


import './globals.css'