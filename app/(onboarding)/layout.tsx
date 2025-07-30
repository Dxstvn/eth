import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "KYC Verification - ClearHold",
  description: "Complete your identity verification to access ClearHold's secure escrow services",
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Check if user is authenticated
  // If not, redirect to login
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ClearHold</h1>
            <p className="text-gray-600 mt-2">Secure Crypto Escrow Platform</p>
          </div>
          
          {/* Main Content */}
          {children}
          
          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>© 2025 ClearHold. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
              <span>•</span>
              <a href="/support" className="hover:text-gray-700">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}