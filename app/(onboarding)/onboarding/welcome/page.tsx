"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Shield, Clock, Lock, ArrowRight, Globe, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function OnboardingWelcomePage() {
  const router = useRouter()
  const [consentGiven, setConsentGiven] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!consentGiven) return
    
    setLoading(true)
    // TODO: Save consent status to backend
    await new Promise(resolve => setTimeout(resolve, 500))
    router.push("/onboarding/basic-info")
  }

  const features = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your identity data is encrypted and protected with industry-leading security standards"
    },
    {
      icon: Clock,
      title: "Quick Verification",
      description: "Complete the entire process in just 5-10 minutes with instant verification"
    },
    {
      icon: Globe,
      title: "Global Compliance",
      description: "Meet regulatory requirements for secure crypto and real estate transactions worldwide"
    },
    {
      icon: DollarSign,
      title: "Unlock Full Access",
      description: "Access unlimited transaction limits and all ClearHold escrow features"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step 1 of 6</span>
          <span>Welcome</span>
        </div>
        <Progress value={16.67} className="h-2" />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-teal-900" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to ClearHold</CardTitle>
          <CardDescription className="text-lg mt-3">
            Let's verify your identity to unlock secure escrow services
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Why KYC Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3">Why is verification required?</h3>
            <p className="text-gray-700">
              As a regulated escrow platform handling high-value transactions, we're required to verify 
              the identity of our users. This helps us:
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Prevent fraud and money laundering</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Comply with global financial regulations</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Protect your transactions and assets</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Build trust in our escrow ecosystem</span>
              </li>
            </ul>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{feature.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Process Overview */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">What to expect</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-teal-900 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <span className="ml-3 text-sm">Basic information (2 min)</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="ml-3 text-sm">Choose document type (1 min)</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <span className="ml-3 text-sm">Document & selfie capture (3 min)</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <span className="ml-3 text-sm">Instant verification (1 min)</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your data is protected by bank-level encryption and will only be used for verification 
              purposes. We partner with Sumsub, a leading identity verification provider trusted by 
              thousands of companies worldwide.
            </AlertDescription>
          </Alert>

          {/* Consent Checkbox */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="consent" 
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                className="mt-1"
              />
              <label 
                htmlFor="consent" 
                className="text-sm text-gray-700 cursor-pointer select-none"
              >
                I consent to the collection and processing of my personal data for identity 
                verification purposes. I understand that my data will be handled according to 
                ClearHold's{" "}
                <a href="/privacy" className="text-teal-900 underline hover:no-underline">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a href="/terms" className="text-teal-900 underline hover:no-underline">
                  Terms of Service
                </a>.
              </label>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleContinue}
            disabled={!consentGiven || loading}
            size="lg"
            className="w-full h-14 text-base font-semibold"
          >
            {loading ? (
              "Starting..."
            ) : (
              <>
                Begin Verification
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}