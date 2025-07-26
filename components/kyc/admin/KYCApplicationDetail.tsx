"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Image,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Shield,
  Activity,
  Briefcase,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/services/api"

interface KYCApplication {
  id: string
  userId: string
  status: "pending" | "approved" | "rejected" | "in_review" | "more_info_required"
  submittedAt: string
  lastUpdated: string
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    nationality: string
    address: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
    }
  }
  documents: {
    id: string
    type: "passport" | "drivers_license" | "national_id" | "proof_of_address" | "bank_statement"
    fileName: string
    uploadedAt: string
    status: "pending" | "approved" | "rejected"
    url: string
    verificationResults?: {
      authentic: boolean
      expired: boolean
      matchesUser: boolean
      notes: string
    }
  }[]
  verificationResults: {
    identityScore: number
    addressScore: number
    documentScore: number
    riskScore: number
    amlCheck: {
      status: "clear" | "review" | "flagged"
      details: string
    }
    sanctionsCheck: {
      status: "clear" | "review" | "flagged"
      details: string
    }
  }
  financialInfo?: {
    employmentStatus: string
    annualIncome: string
    sourceOfFunds: string
    intendedUseCase: string
  }
  notes: {
    id: string
    author: string
    content: string
    createdAt: string
    type: "internal" | "user_communication"
  }[]
  auditLog: {
    id: string
    action: string
    performedBy: string
    timestamp: string
    details: string
  }[]
}

interface KYCApplicationDetailProps {
  applicationId: string
  onClose?: () => void
}

export default function KYCApplicationDetail({ applicationId, onClose }: KYCApplicationDetailProps) {
  const [application, setApplication] = useState<KYCApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)

  useEffect(() => {
    fetchApplicationDetails()
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      setApplication({
        id: applicationId,
        userId: "user-001",
        status: "pending",
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        lastUpdated: new Date().toISOString(),
        personalInfo: {
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          phone: "+1 (555) 123-4567",
          dateOfBirth: "1985-03-15",
          nationality: "United States",
          address: {
            street: "123 Main Street",
            city: "New York",
            state: "NY",
            postalCode: "10001",
            country: "United States",
          },
        },
        documents: [
          {
            id: "doc-001",
            type: "passport",
            fileName: "passport_scan.pdf",
            uploadedAt: new Date(Date.now() - 86400000).toISOString(),
            status: "pending",
            url: "/mock-passport.pdf",
            verificationResults: {
              authentic: true,
              expired: false,
              matchesUser: true,
              notes: "Document appears genuine",
            },
          },
          {
            id: "doc-002",
            type: "proof_of_address",
            fileName: "utility_bill.pdf",
            uploadedAt: new Date(Date.now() - 86400000).toISOString(),
            status: "pending",
            url: "/mock-utility.pdf",
          },
        ],
        verificationResults: {
          identityScore: 95,
          addressScore: 88,
          documentScore: 92,
          riskScore: 15,
          amlCheck: {
            status: "clear",
            details: "No matches found in AML databases",
          },
          sanctionsCheck: {
            status: "clear",
            details: "No matches found in sanctions lists",
          },
        },
        financialInfo: {
          employmentStatus: "Employed",
          annualIncome: "$75,000 - $100,000",
          sourceOfFunds: "Salary",
          intendedUseCase: "Real estate investment",
        },
        notes: [
          {
            id: "note-001",
            author: "Admin User",
            content: "Initial review completed. Documents appear authentic.",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            type: "internal",
          },
        ],
        auditLog: [
          {
            id: "audit-001",
            action: "Application Submitted",
            performedBy: "John Smith",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            details: "KYC application submitted via web platform",
          },
          {
            id: "audit-002",
            action: "Review Started",
            performedBy: "Admin User",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            details: "Manual review process initiated",
          },
        ],
      })
    } catch (error) {
      console.error("Failed to fetch application details:", error)
      toast.error("Failed to load application details")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setActionLoading(true)
      // API call to approve application
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Mock delay
      toast.success("KYC application approved successfully")
      if (onClose) onClose()
    } catch (error) {
      console.error("Failed to approve application:", error)
      toast.error("Failed to approve application")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setActionLoading(true)
      // API call to reject application
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Mock delay
      toast.success("KYC application rejected")
      if (onClose) onClose()
    } catch (error) {
      console.error("Failed to reject application:", error)
      toast.error("Failed to reject application")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestMoreInfo = async () => {
    try {
      setActionLoading(true)
      // API call to request more information
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Mock delay
      toast.success("Request for additional information sent")
    } catch (error) {
      console.error("Failed to request more info:", error)
      toast.error("Failed to send request")
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      // API call to add note
      const newNoteObj = {
        id: `note-${Date.now()}`,
        author: "Current Admin",
        content: newNote,
        createdAt: new Date().toISOString(),
        type: "internal" as const,
      }
      setApplication((prev) => {
        if (!prev) return null
        return {
          ...prev,
          notes: [...prev.notes, newNoteObj],
        }
      })
      setNewNote("")
      toast.success("Note added successfully")
    } catch (error) {
      console.error("Failed to add note:", error)
      toast.error("Failed to add note")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "clear":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
      case "flagged":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
      case "review":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getRiskColor = (score: number) => {
    if (score <= 20) return "text-green-600"
    if (score <= 50) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading || !application) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            KYC Application: {application.personalInfo.firstName} {application.personalInfo.lastName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Application ID: {application.id} | User ID: {application.userId}
          </p>
        </div>
        <Badge
          variant={application.status === "approved" ? "default" : "secondary"}
          className="text-sm"
        >
          {application.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={actionLoading || application.status !== "pending"}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve KYC
        </Button>
        <Button
          onClick={handleReject}
          disabled={actionLoading || application.status !== "pending"}
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject KYC
        </Button>
        <Button
          onClick={handleRequestMoreInfo}
          disabled={actionLoading}
          variant="outline"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Request More Info
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Full Name</Label>
                  <p className="font-medium">
                    {application.personalInfo.firstName} {application.personalInfo.lastName}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium">{application.personalInfo.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <p className="font-medium">{application.personalInfo.phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                  <p className="font-medium">
                    {new Date(application.personalInfo.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Nationality</Label>
                  <p className="font-medium">{application.personalInfo.nationality}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Address</h4>
                <p className="text-sm">
                  {application.personalInfo.address.street}<br />
                  {application.personalInfo.address.city}, {application.personalInfo.address.state} {application.personalInfo.address.postalCode}<br />
                  {application.personalInfo.address.country}
                </p>
              </div>

              {application.financialInfo && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Financial Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Employment Status</Label>
                        <p className="font-medium">{application.financialInfo.employmentStatus}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Annual Income</Label>
                        <p className="font-medium">{application.financialInfo.annualIncome}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Source of Funds</Label>
                        <p className="font-medium">{application.financialInfo.sourceOfFunds}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Intended Use</Label>
                        <p className="font-medium">{application.financialInfo.intendedUseCase}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Review and verify user-submitted documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.type.replace("_", " ").toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.status === "approved" ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Document Preview: {doc.type.replace("_", " ").toUpperCase()}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            {/* Document preview would go here */}
                            <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                              <p className="text-muted-foreground">Document preview</p>
                            </div>
                            {doc.verificationResults && (
                              <div className="mt-4 space-y-2">
                                <h4 className="font-medium">Verification Results</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="flex items-center gap-2">
                                    {doc.verificationResults.authentic ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="text-sm">Authentic</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!doc.verificationResults.expired ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="text-sm">Not Expired</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {doc.verificationResults.matchesUser ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="text-sm">Matches User</span>
                                  </div>
                                </div>
                                {doc.verificationResults.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Notes: {doc.verificationResults.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Verification Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Identity Verification</span>
                    <span className={`font-medium ${getScoreColor(application.verificationResults.identityScore)}`}>
                      {application.verificationResults.identityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        application.verificationResults.identityScore >= 80
                          ? "bg-green-500"
                          : application.verificationResults.identityScore >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${application.verificationResults.identityScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Address Verification</span>
                    <span className={`font-medium ${getScoreColor(application.verificationResults.addressScore)}`}>
                      {application.verificationResults.addressScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        application.verificationResults.addressScore >= 80
                          ? "bg-green-500"
                          : application.verificationResults.addressScore >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${application.verificationResults.addressScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Document Verification</span>
                    <span className={`font-medium ${getScoreColor(application.verificationResults.documentScore)}`}>
                      {application.verificationResults.documentScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        application.verificationResults.documentScore >= 80
                          ? "bg-green-500"
                          : application.verificationResults.documentScore >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${application.verificationResults.documentScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Overall Risk Score</span>
                  </div>
                  <span className={`text-2xl font-bold ${getRiskColor(application.verificationResults.riskScore)}`}>
                    {application.verificationResults.riskScore}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AML Check</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(application.verificationResults.amlCheck.status)}
                      <span className="text-sm font-medium">
                        {application.verificationResults.amlCheck.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {application.verificationResults.amlCheck.details}
                  </p>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sanctions Check</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(application.verificationResults.sanctionsCheck.status)}
                      <span className="text-sm font-medium">
                        {application.verificationResults.sanctionsCheck.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {application.verificationResults.sanctionsCheck.details}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes & Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Add Note</Label>
                <Textarea
                  placeholder="Add internal notes or observations..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} size="sm">
                  Add Note
                </Button>
              </div>

              <Separator />

              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {application.notes.map((note) => (
                    <div key={note.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{note.author}</span>
                          <Badge variant="outline" className="text-xs">
                            {note.type === "internal" ? "Internal" : "Communication"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm pl-6">{note.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Complete history of all actions taken on this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {application.auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="mt-1">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{entry.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          By: {entry.performedBy}
                        </p>
                        <p className="text-sm">{entry.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}