import type React from "react"
import "./globals.css"
import { Inter } from 'next/font/google'
import type { Metadata } from "next"
import Script from "next/script"
import { AuthProvider } from "@/context/auth-context"
import DomainLogger from "@/components/domain-logger"

const inter = Inter({ subsets: ["latin"] })

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
    <html lang="en">
      <body className={inter.className}>
        {/* Firebase scripts moved to body */}
        <Script
          src="https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js"
          strategy="afterInteractive"
          id="firebase-app-script"
        />
        <Script
          src="https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js"
          strategy="afterInteractive"
          id="firebase-auth-script"
        />
        
        <AuthProvider>{children}</AuthProvider>
        <DomainLogger />
        
        <Script id="domain-logger" strategy="afterInteractive">
          {`
            console.log(
              "%c DOMAIN DETECTION SCRIPT ",
              "background: #f43f5e; color: white; font-weight: bold; padding: 4px; border-radius: 4px;"
            );
            console.log("Current domain:", window.location.hostname);
            console.log("Full URL:", window.location.href);
            console.log("Add this domain to Firebase authorized domains!");
          `}
        </Script>
        
        <Script id="firebase-load-logger" strategy="afterInteractive">
          {`
            document.getElementById('firebase-app-script').addEventListener('load', function() {
              console.log("Firebase app script loaded");
            });
            
            document.getElementById('firebase-auth-script').addEventListener('load', function() {
              console.log("Firebase auth script loaded");
              window.firebaseLoaded = true;
            });
          `}
        </Script>
      </body>
    </html>
  )
}



import './globals.css'