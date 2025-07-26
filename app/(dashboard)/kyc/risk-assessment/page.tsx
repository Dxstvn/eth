"use client"

import { KYCProvider } from "@/context/kyc-context"
import { RiskAssessmentStep } from "@/components/kyc/steps"
import { useRouter } from "next/navigation"

function RiskAssessmentContent() {
  const router = useRouter()

  const handleNext = () => {
    router.push("/kyc/review")
  }

  const handleBack = () => {
    router.push("/kyc/documents")
  }

  return (
    <div className="max-w-4xl mx-auto">
      <RiskAssessmentStep onNext={handleNext} onBack={handleBack} />
    </div>
  )
}

export default function RiskAssessmentPage() {
  return (
    <KYCProvider>
      <RiskAssessmentContent />
    </KYCProvider>
  )
}