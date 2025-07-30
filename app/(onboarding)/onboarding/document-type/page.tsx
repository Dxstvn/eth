"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, FileText, CreditCard, Globe, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface DocumentType {
  id: string
  name: string
  icon: React.ElementType
  description: string
  requirements: string[]
  recommended?: boolean
}

const documentTypes: DocumentType[] = [
  {
    id: "passport",
    name: "Passport",
    icon: Globe,
    description: "International travel document",
    requirements: [
      "Clear photo of the main page",
      "All text must be readable",
      "No glare or shadows"
    ],
    recommended: true
  },
  {
    id: "drivers_license",
    name: "Driver's License",
    icon: CreditCard,
    description: "Government-issued driving permit",
    requirements: [
      "Photos of both front and back",
      "Must not be expired",
      "All corners visible"
    ]
  },
  {
    id: "national_id",
    name: "National ID Card",
    icon: FileText,
    description: "Government-issued identity card",
    requirements: [
      "Photos of both front and back",
      "Must be currently valid",
      "High resolution images"
    ]
  }
]

export default function DocumentTypePage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!selectedType) return
    
    setLoading(true)
    // Store selection
    sessionStorage.setItem("kycDocumentType", selectedType)
    
    // Navigate to Sumsub SDK page
    router.push("/onboarding/verify")
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Step 3 of 6</span>
          <span>Document Selection</span>
        </div>
        <Progress value={50} className="h-2" />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/onboarding/basic-info")}
            className="w-fit -ml-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <CardTitle className="text-2xl font-bold">Select Your Document Type</CardTitle>
          <CardDescription className="text-base">
            Choose the identification document you'll use for verification
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Options */}
          <div className="space-y-3">
            {documentTypes.map((docType) => (
              <div
                key={docType.id}
                className={cn(
                  "relative border rounded-lg p-4 cursor-pointer transition-all",
                  selectedType === docType.id
                    ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600 ring-offset-2"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                )}
                onClick={() => setSelectedType(docType.id)}
              >
                {docType.recommended && (
                  <div className="absolute -top-2 right-4">
                    <span className="bg-teal-600 text-white text-xs px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <docType.icon className="h-6 w-6 text-gray-700" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{docType.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{docType.description}</p>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Requirements:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {docType.requirements.map((req, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-teal-600 mr-1.5 mt-0.5">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all",
                        selectedType === docType.id
                          ? "border-teal-600 bg-teal-600"
                          : "border-gray-300"
                      )}
                    >
                      {selectedType === docType.id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tips Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips for successful verification:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Use a well-lit area with no shadows</li>
                <li>• Ensure all text is clearly readable</li>
                <li>• Avoid reflections or glare on the document</li>
                <li>• Keep your document flat and capture all edges</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Document Availability Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Don't have these documents?</h4>
            <p className="text-sm text-gray-600">
              Other document types may be available based on your country. You can also contact 
              our support team for alternative verification methods.
            </p>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!selectedType || loading}
            size="lg"
            className="w-full h-14 text-base font-semibold"
          >
            {loading ? (
              "Preparing..."
            ) : (
              <>
                Continue to Document Upload
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}