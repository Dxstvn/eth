"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronRight, Info, Shield } from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"
import { SecureFileUpload } from "@/components/kyc/secure-file-upload"
import { KYCFieldType } from "@/lib/security/kyc-encryption"

interface Document {
  type: "id_front" | "id_back" | "address_proof"
  file: File | null
  preview: string | null
  uploaded: boolean
  encrypted?: any // Store encrypted data if needed
}

export default function KYCDocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [encryptionPassword] = useState(() => {
    // Generate a secure password for this session
    // In production, this could be derived from user's master password
    return `kyc_${user?.uid}_${Date.now()}`
  })
  const [documents, setDocuments] = useState<Record<string, Document>>({
    id_front: { type: "id_front", file: null, preview: null, uploaded: false },
    id_back: { type: "id_back", file: null, preview: null, uploaded: false },
    address_proof: { type: "address_proof", file: null, preview: null, uploaded: false },
  })

  const handleFileSelect = (type: keyof typeof documents, file: File | null, encrypted?: any) => {
    if (!file) {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file: null,
          preview: null,
          uploaded: false,
          encrypted: null
        }
      }))
      return
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            file,
            preview: reader.result as string,
            uploaded: true,
            encrypted
          }
        }))
      }
      reader.readAsDataURL(file)
    } else {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file,
          preview: null,
          uploaded: true,
          encrypted
        }
      }))
    }
    setError(null)
  }

  const onSubmit = async () => {
    // Validate all documents are uploaded
    const allUploaded = Object.values(documents).every(doc => doc.uploaded)
    if (!allUploaded) {
      setError("Please upload all required documents")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare encrypted document data for backend
      const encryptedDocuments = Object.entries(documents).map(([type, doc]) => ({
        type,
        fileName: doc.file?.name,
        fileSize: doc.file?.size,
        mimeType: doc.file?.type,
        encrypted: doc.encrypted,
        timestamp: Date.now()
      }))

      console.log("Uploading encrypted documents:", encryptedDocuments)
      
      // TODO: Upload encrypted documents to backend
      // In production, this would:
      // 1. Upload encrypted file data to secure storage
      // 2. Store encryption metadata in database
      // 3. Trigger verification workflow
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Store encryption key reference (in production, this would be managed securely)
      sessionStorage.setItem('kyc_encryption_ref', encryptionPassword)
      
      // Navigate to next step
      router.push("/kyc/verification")
    } catch (err) {
      setError("Failed to upload documents. Please try again.")
      console.error("Error uploading documents:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const documentRequirements = [
    "Documents must be clear and readable",
    "All corners of the document must be visible",
    "No glare or shadows on the document",
    "File size must be less than 10MB",
    "Accepted formats: JPG, PNG, PDF",
  ]

  const acceptedDocuments = {
    id: [
      "Passport",
      "Driver's License",
      "National ID Card",
      "Government-issued ID",
    ],
    address: [
      "Utility Bill (within last 3 months)",
      "Bank Statement (within last 3 months)",
      "Rental Agreement",
      "Government Letter",
    ],
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>
            Upload clear photos or scans of your identification documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Document Requirements */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Document Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {documentRequirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          {/* ID Front */}
          <SecureFileUpload
            id="id_front"
            label="Government-Issued ID (Front)"
            description={`Accepted: ${acceptedDocuments.id.join(", ")}`}
            fieldType={KYCFieldType.DRIVERS_LICENSE}
            onFileSelect={(file, encrypted) => handleFileSelect("id_front", file, encrypted)}
            onRemove={() => handleFileSelect("id_front", null)}
            value={documents.id_front.file}
            preview={documents.id_front.preview}
            required
            showSecurityIndicators
            enableEncryption
            encryptionPassword={encryptionPassword}
            enableWatermark
          />

          {/* ID Back */}
          <SecureFileUpload
            id="id_back"
            label="Government-Issued ID (Back)"
            description="Required for driver's license and national ID cards"
            fieldType={KYCFieldType.DRIVERS_LICENSE}
            onFileSelect={(file, encrypted) => handleFileSelect("id_back", file, encrypted)}
            onRemove={() => handleFileSelect("id_back", null)}
            value={documents.id_back.file}
            preview={documents.id_back.preview}
            required
            showSecurityIndicators
            enableEncryption
            encryptionPassword={encryptionPassword}
            enableWatermark
          />

          {/* Address Proof */}
          <SecureFileUpload
            id="address_proof"
            label="Proof of Address"
            description={`Accepted: ${acceptedDocuments.address.join(", ")}`}
            fieldType={KYCFieldType.ADDRESS}
            onFileSelect={(file, encrypted) => handleFileSelect("address_proof", file, encrypted)}
            onRemove={() => handleFileSelect("address_proof", null)}
            value={documents.address_proof.file}
            preview={documents.address_proof.preview}
            required
            showSecurityIndicators
            enableEncryption
            encryptionPassword={encryptionPassword}
            enableWatermark
          />

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/kyc/personal")}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !Object.values(documents).every(doc => doc.uploaded)}
            >
              {isSubmitting ? "Uploading..." : "Continue"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security Notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-teal-600" />
          <h4 className="text-sm font-semibold text-teal-900">Security & Privacy</h4>
        </div>
        <div className="space-y-2 text-xs text-teal-700">
          <p>
            All documents are encrypted end-to-end using AES-256 encryption before upload.
          </p>
          <p>
            Your files are watermarked for security and deleted immediately after verification.
          </p>
          <p>
            We comply with GDPR, CCPA, and international data protection regulations.
          </p>
        </div>
      </div>
    </div>
  )
}