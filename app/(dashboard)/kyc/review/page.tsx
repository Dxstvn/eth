"use client"

import { KYCProvider } from "@/context/kyc-context"
import KYCReviewSummary from "@/components/kyc/review/KYCReviewSummary"

export default function KYCReviewPage() {
  return (
    <KYCProvider>
      <div className="container mx-auto py-6">
        <KYCReviewSummary />
      </div>
    </KYCProvider>
  )
}