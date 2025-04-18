"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/context/onboarding-context"
import WelcomeStep from "./steps/welcome-step"
import WalletStep from "./steps/wallet-step"
import TransactionsStep from "./steps/transactions-step"
import DocumentsStep from "./steps/documents-step"
import { X } from "lucide-react"

export default function OnboardingFlow() {
  const { showOnboarding, setShowOnboarding, setHasCompletedOnboarding, currentStep, setCurrentStep, totalSteps } =
    useOnboarding()

  // Reset step when onboarding is shown
  useEffect(() => {
    if (showOnboarding) {
      setCurrentStep(0)
    }
  }, [showOnboarding, setCurrentStep])

  // Handle next step
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle skip/complete
  const handleComplete = () => {
    setShowOnboarding(false)
    setHasCompletedOnboarding(true)
  }

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />
      case 1:
        return <WalletStep />
      case 2:
        return <TransactionsStep />
      case 3:
        return <DocumentsStep />
      default:
        return <WelcomeStep />
    }
  }

  if (!showOnboarding) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl p-8 mx-4"
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700"
            onClick={handleComplete}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full mx-1 ${index === currentStep ? "bg-teal-600" : "bg-neutral-200"}`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <div>
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" onClick={handleComplete}>
                {currentStep === totalSteps - 1 ? "Skip" : "Skip Tour"}
              </Button>
              <Button className="bg-teal-900 hover:bg-teal-800 text-white" onClick={handleNext}>
                {currentStep === totalSteps - 1 ? "Get Started" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
