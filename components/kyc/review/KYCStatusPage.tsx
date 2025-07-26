"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Upload, 
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  ChevronRight,
  FileCheck,
  User,
  Shield
} from "lucide-react"
import { useKYC } from "@/context/kyc-context"
import { useRouter } from "next/navigation"

interface TimelineItem {
  title: string
  description: string
  timestamp: string
  status: "completed" | "current" | "pending"
  icon: React.ReactNode
}

interface DocumentStatus {
  name: string
  status: "verified" | "reviewing" | "rejected" | "pending"
  rejectionReason?: string
  uploadedAt?: string
  verifiedAt?: string
}

export default function KYCStatusPage() {
  const router = useRouter()
  const { kycData } = useKYC()
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([])
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>("")

  useEffect(() => {
    // Generate timeline based on KYC status
    const items: TimelineItem[] = []
    
    // Application submitted
    if (kycData.submittedAt) {
      items.push({
        title: "Application Submitted",
        description: "Your KYC application has been received",
        timestamp: new Date(kycData.submittedAt).toLocaleString(),
        status: "completed",
        icon: <FileText className="h-4 w-4" />
      })
    }

    // Under review
    if (kycData.status === "under_review" || kycData.status === "approved" || kycData.status === "rejected") {
      items.push({
        title: "Under Review",
        description: "Our compliance team is reviewing your application",
        timestamp: kycData.submittedAt ? new Date(new Date(kycData.submittedAt).getTime() + 30 * 60000).toLocaleString() : "",
        status: kycData.status === "under_review" ? "current" : "completed",
        icon: <Shield className="h-4 w-4" />
      })
    }

    // Final decision
    if (kycData.status === "approved") {
      items.push({
        title: "Approved",
        description: "Your KYC verification is complete",
        timestamp: kycData.reviewedAt ? new Date(kycData.reviewedAt).toLocaleString() : "",
        status: "completed",
        icon: <CheckCircle2 className="h-4 w-4" />
      })
    } else if (kycData.status === "rejected") {
      items.push({
        title: "Additional Information Required",
        description: kycData.rejectionReason || "Please review the requirements below",
        timestamp: kycData.reviewedAt ? new Date(kycData.reviewedAt).toLocaleString() : "",
        status: "completed",
        icon: <AlertCircle className="h-4 w-4" />
      })
    } else if (kycData.status === "additional_info_required") {
      items.push({
        title: "Additional Information Required",
        description: "Please provide the requested information",
        timestamp: new Date().toLocaleString(),
        status: "current",
        icon: <AlertCircle className="h-4 w-4" />
      })
    } else {
      items.push({
        title: "Pending Review",
        description: "Waiting for compliance team review",
        timestamp: "",
        status: "pending",
        icon: <Clock className="h-4 w-4" />
      })
    }

    setTimelineItems(items)

    // Generate document statuses
    const docs: DocumentStatus[] = []
    
    if (kycData.documentInfo) {
      docs.push({
        name: "Government ID",
        status: kycData.status === "approved" ? "verified" : 
                kycData.status === "under_review" ? "reviewing" : 
                kycData.additionalInfoRequested?.includes("id") ? "rejected" : "pending",
        uploadedAt: kycData.submittedAt,
        verifiedAt: kycData.status === "approved" ? kycData.reviewedAt : undefined,
        rejectionReason: kycData.additionalInfoRequested?.includes("id") ? "ID image unclear, please re-upload" : undefined
      })

      docs.push({
        name: "Address Proof",
        status: kycData.status === "approved" ? "verified" : 
                kycData.status === "under_review" ? "reviewing" : 
                kycData.additionalInfoRequested?.includes("address") ? "rejected" : "pending",
        uploadedAt: kycData.submittedAt,
        verifiedAt: kycData.status === "approved" ? kycData.reviewedAt : undefined,
        rejectionReason: kycData.additionalInfoRequested?.includes("address") ? "Document must be dated within last 3 months" : undefined
      })

      docs.push({
        name: "Selfie Verification",
        status: kycData.status === "approved" ? "verified" : 
                kycData.status === "under_review" ? "reviewing" : 
                kycData.additionalInfoRequested?.includes("selfie") ? "rejected" : "pending",
        uploadedAt: kycData.submittedAt,
        verifiedAt: kycData.status === "approved" ? kycData.reviewedAt : undefined,
        rejectionReason: kycData.additionalInfoRequested?.includes("selfie") ? "Face not clearly visible, please retake" : undefined
      })
    }

    setDocumentStatuses(docs)

    // Calculate estimated completion
    if (kycData.submittedAt && kycData.status === "under_review") {
      const submitted = new Date(kycData.submittedAt)
      const estimated = new Date(submitted.getTime() + 48 * 60 * 60 * 1000) // 48 hours
      setEstimatedCompletion(estimated.toLocaleDateString())
    }
  }, [kycData])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "under_review":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      case "additional_info_required":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "under_review":
        return <Badge variant="secondary">Under Review</Badge>
      case "additional_info_required":
        return <Badge variant="warning">Action Required</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="success" className="text-xs">Verified</Badge>
      case "reviewing":
        return <Badge variant="secondary" className="text-xs">Reviewing</Badge>
      case "rejected":
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>
    }
  }

  const getProgressPercentage = () => {
    switch (kycData.status) {
      case "not_started":
        return 0
      case "in_progress":
        return 50
      case "under_review":
        return 75
      case "approved":
        return 100
      case "rejected":
      case "additional_info_required":
        return 85
      default:
        return 0
    }
  }

  const handleReupload = (documentType: string) => {
    // Navigate to document upload page with specific document to re-upload
    router.push(`/kyc/documents?reupload=${documentType}`)
  }

  const handleStartKYC = () => {
    router.push("/kyc/personal")
  }

  if (kycData.status === "not_started") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-600" />
            </div>
            <CardTitle>KYC Verification Not Started</CardTitle>
            <CardDescription>
              Complete your KYC verification to unlock all features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleStartKYC} size="lg">
              Start KYC Verification
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Header */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(kycData.status)}
              <div>
                <CardTitle>KYC Verification Status</CardTitle>
                <div className="mt-2">
                  {getStatusBadge(kycData.status)}
                </div>
              </div>
            </div>
            {kycData.verificationId && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Verification ID</p>
                <p className="font-mono text-sm">{kycData.verificationId}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
            
            {estimatedCompletion && kycData.status === "under_review" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estimated Completion</span>
                <span className="font-medium">{estimatedCompletion}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Required Alert */}
      {(kycData.status === "additional_info_required" || kycData.status === "rejected") && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> {kycData.rejectionReason || "Please review and update the information below."}
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Verification Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {timelineItems.map((item, index) => (
              <div key={index} className={`flex items-start space-x-4 ${index !== timelineItems.length - 1 ? "mb-6" : ""}`}>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.status === "completed" ? "bg-green-100 text-green-600" :
                    item.status === "current" ? "bg-blue-100 text-blue-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {item.icon}
                  </div>
                  {index !== timelineItems.length - 1 && (
                    <div className={`absolute top-10 left-5 w-0.5 h-16 -ml-px ${
                      item.status === "completed" ? "bg-green-200" : "bg-gray-200"
                    }`} />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Status */}
      {documentStatuses.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Document Verification Status</CardTitle>
            <CardDescription>
              Track the verification status of each document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentStatuses.map((doc, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        doc.status === "verified" ? "bg-green-100" :
                        doc.status === "reviewing" ? "bg-blue-100" :
                        doc.status === "rejected" ? "bg-red-100" :
                        "bg-gray-100"
                      }`}>
                        <FileCheck className={`h-4 w-4 ${
                          doc.status === "verified" ? "text-green-600" :
                          doc.status === "reviewing" ? "text-blue-600" :
                          doc.status === "rejected" ? "text-red-600" :
                          "text-gray-600"
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        {doc.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">{doc.rejectionReason}</p>
                        )}
                        {doc.uploadedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                        {doc.verifiedAt && (
                          <p className="text-xs text-gray-500">
                            Verified: {new Date(doc.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getDocumentStatusBadge(doc.status)}
                      {doc.status === "rejected" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReupload(doc.name.toLowerCase().replace(" ", "_"))}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Re-upload
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support Information */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Our support team is here to assist you with your verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Phone className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Phone Support</p>
                <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <p className="text-sm text-gray-600">kyc@clearhold.app</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Live Chat</p>
                <p className="text-sm text-gray-600">Available 24/7</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 text-center">
              Average response time: <span className="font-medium">Under 2 hours</span> during business hours
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {kycData.status === "approved" && (
        <div className="flex justify-center">
          <Button onClick={() => router.push("/dashboard")} size="lg">
            Go to Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}