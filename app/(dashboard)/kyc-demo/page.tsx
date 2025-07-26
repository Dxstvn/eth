import { KYCWorkflowDemo } from "@/components/kyc/kyc-workflow-demo"

export default function KYCDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-teal-900 mb-2">
            KYC Verification Demo
          </h1>
          <p className="text-gray-600">
            Complete identity verification with OCR and document processing
          </p>
        </div>
        
        <KYCWorkflowDemo />
      </div>
    </div>
  )
}