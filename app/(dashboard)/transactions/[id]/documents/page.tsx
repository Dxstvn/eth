"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, CheckCircle, Clock, Upload, FolderOpen } from "lucide-react"
import FileUploadEnhanced from "@/components/file-upload-enhanced"
import DocumentPreviewModal from "@/components/document-preview-modal"
import DocumentBulkOperations from "@/components/document-bulk-operations"
import { useAuth } from "@/context/auth-context-v2"
import { useToast } from "@/components/ui/use-toast"
import firebaseStorageService, { FileMetadata } from "@/services/firebase-storage-service"

// Document type interface
interface DocumentFile {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
  uploadedAt: string
  uploadedBy: string
  documentType: string
  status: 'pending' | 'approved' | 'rejected'
  fullPath?: string
  timeCreated?: string
  pages?: number
}

export default function TransactionDocumentsPage() {
  const { id: dealId } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("upload")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch documents from Firebase Storage or API
  const fetchDocuments = async () => {
    setLoading(true)
    try {
      // For now using mock data, but this would connect to your backend API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockDocuments: DocumentFile[] = [
        {
          id: "doc1",
          filename: "Purchase Agreement.pdf",
          url: "https://example.com/files/purchase-agreement.pdf",
          contentType: "application/pdf",
          size: 2500000,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.uid || "unknown",
          documentType: "CONTRACT",
          status: "approved",
          pages: 12,
        },
        {
          id: "doc2",
          filename: "Property Inspection Report.pdf",
          url: "https://example.com/files/inspection.pdf",
          contentType: "application/pdf",
          size: 5100000,
          uploadedAt: new Date(Date.now() - 86400000).toISOString(),
          uploadedBy: user?.uid || "unknown",
          documentType: "INSPECTION",
          status: "pending",
          pages: 8,
        },
        {
          id: "doc3",
          filename: "Property Photos.zip",
          url: "https://example.com/files/photos.zip",
          contentType: "application/zip",
          size: 15000000,
          uploadedAt: new Date(Date.now() - 172800000).toISOString(),
          uploadedBy: user?.uid || "unknown",
          documentType: "PHOTOS",
          status: "approved",
        },
        {
          id: "doc4",
          filename: "Title Certificate.pdf",
          url: "https://example.com/files/title.pdf",
          contentType: "application/pdf",
          size: 800000,
          uploadedAt: new Date(Date.now() - 259200000).toISOString(),
          uploadedBy: user?.uid || "unknown",
          documentType: "TITLE",
          status: "rejected",
          pages: 3,
        }
      ]

      setDocuments(mockDocuments)
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle file upload completion
  const handleFilesUploaded = (uploadedFiles: FileMetadata[]) => {
    const newDocuments: DocumentFile[] = uploadedFiles.map(file => ({
      id: `doc${Date.now()}-${Math.random()}`,
      filename: file.name,
      url: file.downloadURL || '',
      contentType: file.contentType || '',
      size: file.size,
      uploadedAt: file.timeCreated,
      uploadedBy: user?.uid || "unknown",
      documentType: file.customMetadata?.category || 'OTHER',
      status: 'pending',
      fullPath: file.fullPath,
      timeCreated: file.timeCreated
    }))

    setDocuments(prev => [...newDocuments, ...prev])

    toast({
      title: "Upload Complete",
      description: `${newDocuments.length} document(s) uploaded successfully`,
    })
  }

  // Handle document status change
  const handleDocumentStatusChange = (docId: string, newStatus: 'approved' | 'rejected') => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === docId ? { ...doc, status: newStatus } : doc
      )
    )
  }

  // Handle bulk operations
  const handleBulkAction = async (action: string, documentIds: string[]) => {
    try {
      switch (action) {
        case 'approve':
          setDocuments(prev => 
            prev.map(doc => 
              documentIds.includes(doc.id) ? { ...doc, status: 'approved' } : doc
            )
          )
          break
        case 'reject':
          setDocuments(prev => 
            prev.map(doc => 
              documentIds.includes(doc.id) ? { ...doc, status: 'rejected' } : doc
            )
          )
          break
        case 'delete':
          // Delete from Firebase Storage if fullPath exists
          for (const docId of documentIds) {
            const doc = documents.find(d => d.id === docId)
            if (doc?.fullPath) {
              await firebaseStorageService.deleteFile(doc.fullPath)
            }
          }
          setDocuments(prev => prev.filter(doc => !documentIds.includes(doc.id)))
          break
        case 'download':
          // Create a ZIP download for multiple files
          const selectedDocs = documents.filter(doc => documentIds.includes(doc.id))
          for (const doc of selectedDocs) {
            window.open(doc.url, '_blank')
          }
          break
        case 'archive':
          // Implement archive functionality
          console.log('Archive documents:', documentIds)
          break
      }
    } catch (error) {
      throw error // Re-throw to be handled by the bulk operations component
    }
  }

  // Handle document preview
  const handlePreviewDocument = (document: DocumentFile) => {
    setPreviewDocument(document)
    setShowPreview(true)
  }

  // Filter documents based on active tab
  const getFilteredDocuments = () => {
    switch (activeTab) {
      case 'pending':
        return documents.filter(doc => doc.status === 'pending')
      case 'approved':
        return documents.filter(doc => doc.status === 'approved')
      case 'rejected':
        return documents.filter(doc => doc.status === 'rejected')
      case 'manage':
        return documents
      default:
        return documents
    }
  }

  const getDocumentCounts = () => {
    return {
      total: documents.length,
      pending: documents.filter(doc => doc.status === 'pending').length,
      approved: documents.filter(doc => doc.status === 'approved').length,
      rejected: documents.filter(doc => doc.status === 'rejected').length,
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const counts = getDocumentCounts()
  const filteredDocuments = getFilteredDocuments()

  return (
    <div className="container px-4 md:px-6 py-6 sm:py-10 max-w-7xl">
      {/* Header - Mobile Responsive */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transaction Documents</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage documents for transaction{" "}
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {dealId}
              </span>
            </p>
          </div>
          
          {/* Quick Stats - Mobile Responsive */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white">
              <FileText className="h-3 w-3 mr-1" />
              {counts.total} Total
            </Badge>
            {counts.pending > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                <Clock className="h-3 w-3 mr-1" />
                {counts.pending} Pending
              </Badge>
            )}
            {counts.approved > 0 && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {counts.approved} Approved
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Manage</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Approved</span>
            {counts.approved > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {counts.approved}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FileUploadEnhanced
                transactionId={dealId as string}
                category="documents"
                maxFiles={10}
                maxFileSize={25}
                onFilesUploaded={handleFilesUploaded}
                title="Upload Transaction Documents"
                description="Upload contracts, inspection reports, photos, and other transaction documents"
                allowedTypes={[
                  'application/pdf',
                  'image/jpeg',
                  'image/png',
                  'image/gif',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/zip',
                  'text/plain'
                ]}
              />
            </div>
            
            <div className="space-y-4">
              <Card className="bg-white shadow-soft border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Document Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Purchase Agreement</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>Property Inspection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Title Certificate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span>Property Photos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-soft border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Upload high-quality scans or photos</p>
                  <p>• Ensure all text is readable</p>
                  <p>• PDF format recommended for documents</p>
                  <p>• Maximum file size: 25MB</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            </div>
          ) : (
            <DocumentBulkOperations
              documents={filteredDocuments}
              selectedDocuments={selectedDocuments}
              onSelectionChange={setSelectedDocuments}
              onBulkAction={handleBulkAction}
              onPreview={handlePreviewDocument}
            />
          )}
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="bg-white shadow-soft border-0">
              <CardContent className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Documents</h3>
                <p className="text-gray-500">All documents have been reviewed.</p>
              </CardContent>
            </Card>
          ) : (
            <DocumentBulkOperations
              documents={filteredDocuments}
              selectedDocuments={selectedDocuments}
              onSelectionChange={setSelectedDocuments}
              onBulkAction={handleBulkAction}
              onPreview={handlePreviewDocument}
            />
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="bg-white shadow-soft border-0">
              <CardContent className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Documents</h3>
                <p className="text-gray-500">Documents will appear here once approved.</p>
              </CardContent>
            </Card>
          ) : (
            <DocumentBulkOperations
              documents={filteredDocuments}
              selectedDocuments={selectedDocuments}
              onSelectionChange={setSelectedDocuments}
              onBulkAction={handleBulkAction}
              onPreview={handlePreviewDocument}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          document={{
            id: previewDocument.id,
            name: previewDocument.filename,
            url: previewDocument.url,
            type: previewDocument.contentType,
            size: previewDocument.size,
            uploadDate: previewDocument.uploadedAt,
            status: previewDocument.status,
            documentType: previewDocument.documentType,
            pages: previewDocument.pages
          }}
          onStatusChange={handleDocumentStatusChange}
        />
      )}
    </div>
  )
}