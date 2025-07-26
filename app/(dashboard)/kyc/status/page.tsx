"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, FileText, Download } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context-v2"
import { useState, useEffect } from "react"
import { format } from "date-fns"

interface KYCStatusData {
  status: "not_started" | "in_progress" | "under_review" | "approved" | "rejected" | "expired"
  completedSteps: {
    personal: boolean
    documents: boolean
    verification: boolean
  }
  submittedAt?: string
  reviewStartedAt?: string
  completedAt?: string
  expiresAt?: string
  rejectionReason?: string
  documentsSubmitted?: {
    id: boolean
    addressProof: boolean
    selfie: boolean
  }
  reviewer?: string
  referenceNumber?: string
}

export default function KYCStatusPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [kycStatus, setKycStatus] = useState<KYCStatusData>({
    status: "under_review",
    completedSteps: {
      personal: true,
      documents: true,
      verification: true
    },
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    reviewStartedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    documentsSubmitted: {
      id: true,
      addressProof: true,
      selfie: true
    },
    referenceNumber: "KYC-2024-" + Math.random().toString(36).substr(2, 9).toUpperCase()
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // TODO: Fetch actual KYC status from backend
    // For now, using mock data set above
  }, [user])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // TODO: Implement actual refresh from backend
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const handleRetryKYC = () => {
    router.push("/kyc/personal")
  }

  const handleContinueKYC = () => {
    // Determine next step based on completed steps
    if (!kycStatus.completedSteps.personal) {
      router.push("/kyc/personal")
    } else if (!kycStatus.completedSteps.documents) {
      router.push("/kyc/documents")
    } else if (!kycStatus.completedSteps.verification) {
      router.push("/kyc/verification")
    }
  }

  const getStatusIcon = () => {
    switch (kycStatus.status) {
      case "approved":
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case "rejected":
      case "expired":
        return <XCircle className="h-8 w-8 text-red-600" />
      case "under_review":
        return <Clock className="h-8 w-8 text-yellow-600" />
      case "in_progress":
        return <AlertCircle className="h-8 w-8 text-blue-600" />
      default:
        return <AlertCircle className="h-8 w-8 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (kycStatus.status) {
      case "approved":
        return "success"
      case "rejected":
      case "expired":
        return "destructive"
      case "under_review":
        return "warning"
      case "in_progress":
        return "default"
      default:
        return "secondary"
    }
  }

  const getStatusText = () => {
    switch (kycStatus.status) {
      case "approved":
        return "Verified"
      case "rejected":
        return "Rejected"
      case "expired":
        return "Expired"
      case "under_review":
        return "Under Review"
      case "in_progress":
        return "In Progress"
      default:
        return "Not Started"
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {kycStatus.status === "under_review" && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Review in Progress</AlertTitle>
          <AlertDescription>
            Your KYC application is being reviewed. This typically takes 24-48 hours.
          </AlertDescription>
        </Alert>
      )}

      {kycStatus.status === "approved" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Verification Complete</AlertTitle>
          <AlertDescription className="text-green-700">
            Your identity has been verified. You now have access to all ClearHold features.
          </AlertDescription>
        </Alert>
      )}

      {kycStatus.status === "rejected" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>
            {kycStatus.rejectionReason || "Your KYC application was rejected. Please try again with valid documents."}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Status Card */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gray-100 rounded-full">
                {getStatusIcon()}
              </div>
              <div>
                <CardTitle className="text-2xl">KYC Verification Status</CardTitle>
                <CardDescription>
                  Reference: {kycStatus.referenceNumber}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor() as any} className="text-sm px-3 py-1">
                {getStatusText()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Verification Timeline</h3>
            <div className="space-y-4">
              {kycStatus.submittedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-teal-900 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Application Submitted</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(kycStatus.submittedAt), "PPpp")}
                    </p>
                  </div>
                </div>
              )}
              
              {kycStatus.reviewStartedAt && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Review Started</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(kycStatus.reviewStartedAt), "PPpp")}
                    </p>
                  </div>
                </div>
              )}

              {kycStatus.completedAt && (
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    kycStatus.status === "approved" ? "bg-green-600" : "bg-red-600"
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {kycStatus.status === "approved" ? "Verification Completed" : "Review Completed"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(kycStatus.completedAt), "PPpp")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Completed Steps */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Verification Steps</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {kycStatus.completedSteps.personal ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className="font-medium">Personal Information</span>
                </div>
                {kycStatus.completedSteps.personal && (
                  <Badge variant="success" className="text-xs">Completed</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {kycStatus.completedSteps.documents ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className="font-medium">Document Upload</span>
                </div>
                {kycStatus.completedSteps.documents && (
                  <Badge variant="success" className="text-xs">Completed</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {kycStatus.completedSteps.verification ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                  <span className="font-medium">Identity Verification</span>
                </div>
                {kycStatus.completedSteps.verification && (
                  <Badge variant="success" className="text-xs">Completed</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Documents Submitted */}
          {kycStatus.documentsSubmitted && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Documents Submitted</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm">Government ID</span>
                  {kycStatus.documentsSubmitted.id && (
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  )}
                </div>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm">Address Proof</span>
                  {kycStatus.documentsSubmitted.addressProof && (
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  )}
                </div>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm">Selfie</span>
                  {kycStatus.documentsSubmitted.selfie && (
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            {kycStatus.status === "approved" && (
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download Certificate
              </Button>
            )}
            
            {kycStatus.status === "rejected" && (
              <Button onClick={handleRetryKYC} className="flex-1">
                Retry Verification
              </Button>
            )}

            {kycStatus.status === "in_progress" && (
              <Button onClick={handleContinueKYC} className="flex-1">
                Continue Verification
              </Button>
            )}

            {kycStatus.status === "expired" && (
              <Button onClick={handleRetryKYC} className="flex-1">
                Renew Verification
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={() => router.push("/support")}
              className="flex-1"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}