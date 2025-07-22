"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Download, X, ZoomIn, ZoomOut, RotateCw, Share2, FileText, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Document {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadDate: string
  status?: 'pending' | 'approved' | 'rejected'
  documentType?: string
  pages?: number
}

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document
  onStatusChange?: (docId: string, status: 'approved' | 'rejected') => void
}

export default function DocumentPreviewModal({ 
  isOpen, 
  onClose, 
  document,
  onStatusChange 
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen || !document) return

    const loadDocument = async () => {
      setIsLoading(true)
      setError(null)
      setZoom(100)
      setRotation(0)
      setCurrentPage(1)

      try {
        // For direct preview, just use the URL
        setPreviewUrl(document.url)
      } catch (err) {
        console.error("Error loading document preview:", err)
        setError("Failed to load document preview")
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [isOpen, document])

  const handleDownload = () => {
    window.open(document.url, "_blank")
    toast({
      title: "Download Started",
      description: `Downloading ${document.name}...`,
    })
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.name,
          url: document.url,
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(document.url)
        toast({
          title: "Link Copied",
          description: "Document link copied to clipboard",
        })
      }
    } else {
      navigator.clipboard.writeText(document.url)
      toast({
        title: "Link Copied",
        description: "Document link copied to clipboard",
      })
    }
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 25 : prev - 25
      return Math.max(25, Math.min(200, newZoom))
    })
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleStatusChange = (status: 'approved' | 'rejected') => {
    if (onStatusChange) {
      onStatusChange(document.id, status)
      toast({
        title: `Document ${status}`,
        description: `${document.name} has been ${status}`,
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
    }
  }

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64 sm:h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-64 sm:h-96 px-4">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-500 mb-4 text-center">{error}</p>
          <Button onClick={handleDownload} className="bg-teal-700 hover:bg-teal-800">
            Download Instead
          </Button>
        </div>
      )
    }

    if (document.type.startsWith("image/")) {
      return (
        <div className="flex justify-center items-center p-4">
          <img
            src={previewUrl || "/placeholder.svg"}
            alt={document.name}
            className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
            onError={() => setError("Failed to load image")}
          />
        </div>
      )
    } else if (document.type === "application/pdf") {
      return (
        <div className="w-full">
          <iframe
            src={`${previewUrl}#toolbar=0&page=${currentPage}`}
            className="w-full h-[60vh] sm:h-[70vh] rounded-lg"
            title={document.name}
            onError={() => setError("Failed to load PDF")}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left'
            }}
          />
          {document.pages && document.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                {currentPage} of {document.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(document.pages!, currentPage + 1))}
                disabled={currentPage === document.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="flex flex-col justify-center items-center h-64 sm:h-96 px-4">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <p className="mb-4 text-center text-gray-600">Preview not available for this file type</p>
          <Button onClick={handleDownload} className="bg-teal-700 hover:bg-teal-800">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate text-lg sm:text-xl">
                {document?.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {getStatusBadge(document?.status)}
                {document?.documentType && (
                  <Badge variant="outline">
                    {document.documentType.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleShare} title="Share">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Download</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Document Info Card - Mobile Responsive */}
        <Card className="flex-shrink-0 mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Size:</span>
                <div className="text-gray-900">{formatFileSize(document.size)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Type:</span>
                <div className="text-gray-900">{document.type.split('/')[1].toUpperCase()}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Uploaded:</span>
                <div className="text-gray-900">{new Date(document.uploadDate).toLocaleDateString()}</div>
              </div>
              {document.pages && (
                <div>
                  <span className="font-medium text-gray-600">Pages:</span>
                  <div className="text-gray-900">{document.pages}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Controls - Mobile Responsive */}
        {(document.type.startsWith("image/") || document.type === "application/pdf") && (
          <div className="flex-shrink-0 flex flex-wrap items-center justify-center gap-2 mb-4 px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 25}
            >
              <ZoomOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Zoom Out</span>
            </Button>
            <span className="text-sm px-3 py-1 bg-gray-100 rounded">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Zoom In</span>
            </Button>
            {document.type.startsWith("image/") && (
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Rotate</span>
              </Button>
            )}
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 overflow-auto">
          {renderPreview()}
        </div>

        {/* Document Verification Actions - Only show if onStatusChange is provided */}
        {onStatusChange && document.status === 'pending' && (
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              onClick={() => handleStatusChange('approved')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Document
            </Button>
            <Button
              onClick={() => handleStatusChange('rejected')}
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Reject Document
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}