"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import FileUpload from "@/components/file-upload"
import { useToast } from "@/components/ui/use-toast"
import { File, Download, Eye, Trash2 } from "lucide-react"
import DocumentPreviewModal from "@/components/document-preview-modal"

interface Document {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadDate: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Fetch documents from backend
    const fetchDocuments = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("http://localhost:3000/database/documents")

        if (!response.ok) {
          throw new Error("Failed to fetch documents")
        }

        const data = await response.json()
        setDocuments(data.documents || [])
      } catch (error) {
        console.error("Error fetching documents:", error)
        toast({
          title: "Error",
          description: "Failed to load documents. Please try again later.",
          variant: "destructive",
        })
        // Set some mock data for development
        setDocuments([
          {
            id: "1",
            name: "Contract.pdf",
            url: "/digital-document.png",
            type: "application/pdf",
            size: 2500000,
            uploadDate: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Property_Image.jpg",
            url: "/modern-living-room.png",
            type: "image/jpeg",
            size: 1500000,
            uploadDate: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [toast])

  const handleUploadComplete = (fileData: { name: string; url: string; type: string; size: number }) => {
    const newDocument: Document = {
      id: Date.now().toString(),
      name: fileData.name,
      url: fileData.url,
      type: fileData.type,
      size: fileData.size,
      uploadDate: new Date().toISOString(),
    }

    setDocuments((prev) => [newDocument, ...prev])
  }

  const handlePreview = (document: Document) => {
    setSelectedDocument(document)
    setIsPreviewOpen(true)
  }

  const handleDownload = async (document: Document) => {
    try {
      // For direct download from URL
      window.open(document.url, "_blank")

      // Alternative: fetch from backend and download
      // const response = await fetch(`http://localhost:3000/database/download/${document.id}`);
      // if (!response.ok) throw new Error('Download failed');
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = document.name;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "Could not download the document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/database/documents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: "Could not delete the document. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Document Management</h1>

      <div className="mb-8">
        <FileUpload
          onUploadComplete={handleUploadComplete}
          allowedFileTypes={["application/pdf", "image/jpeg", "image/png", "image/jpg"]}
          maxSizeMB={10}
          buttonText="Upload New Document"
        />
      </div>

      <div className="grid gap-6">
        <h2 className="text-xl font-semibold">Your Documents</h2>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <File className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center">
                No documents found. Upload your first document to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <div className="flex items-center p-4">
                  <div className="flex-shrink-0 mr-4">
                    {doc.type.includes("image") ? (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        <img
                          src={doc.url || "/placeholder.svg"}
                          alt={doc.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/colorful-abstract-flow.png"
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                        <File className="h-6 w-6 text-blue-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-grow min-w-0">
                    <h3 className="text-sm font-medium truncate">{doc.name}</h3>
                    <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>{formatDate(doc.uploadDate)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handlePreview(doc)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(doc.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedDocument && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          document={selectedDocument}
        />
      )}
    </div>
  )
}
