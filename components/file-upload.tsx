"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, AlertCircle, CheckCircle, File, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context-v2"
import { useToast } from "@/components/ui/use-toast"
import firebaseStorageService, { UploadProgress, FileMetadata } from "@/services/firebase-storage-service"

// Document types based on the Firestore structure
const DOCUMENT_TYPES = [
  { value: "APPRAISAL", label: "Property Appraisal" },
  { value: "TITLE", label: "Title Deed" },
  { value: "INSPECTION", label: "Inspection Report" },
]

// Update the FileUploadProps interface to make documentType optional
interface FileUploadProps {
  onUploadComplete: (fileData: {
    filename: string
    url: string
    contentType: string
    size: number
    documentType: string
    status: string
    fullPath?: string
    timeCreated?: string
  }) => void
  dealId: string
  userId?: string
  documentType?: string
}

// Changed from default export to named export
export function FileUpload({
  onUploadComplete,
  dealId,
  userId,
  documentType: initialDocumentType = "",
}: FileUploadProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [documentType, setDocumentType] = useState<string>(initialDocumentType)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setError(null)
      setSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload")
      return
    }

    if (!documentType) {
      setError("Please select a document type")
      return
    }

    if (!user) {
      setError("User not authenticated")
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)
      setError(null)

      // Validate file
      const validation = firebaseStorageService.validateFile(selectedFile, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      })

      if (!validation.isValid) {
        setError(validation.error || "Invalid file")
        return
      }

      // Generate file path for transaction documents
      const filePath = firebaseStorageService.generateTransactionFilePath(
        dealId,
        selectedFile.name,
        user.uid
      )

      // Upload with progress tracking
      const result = await firebaseStorageService.uploadFile(selectedFile, filePath, {
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress.progress)
        },
        onComplete: (downloadURL: string, metadata: FileMetadata) => {
          setSuccess(true)
          setUploadProgress(100)

          toast({
            title: "Upload Complete",
            description: `${selectedFile.name} uploaded successfully`,
          })

          // Create file data that matches the expected interface
          const fileData = {
            filename: metadata.name,
            url: downloadURL,
            contentType: metadata.contentType || selectedFile.type,
            size: metadata.size,
            documentType: documentType,
            status: "PENDING",
            fullPath: metadata.fullPath,
            timeCreated: metadata.timeCreated,
          }

          // Call the callback with the upload result
          onUploadComplete(fileData)

          // Reset after a delay
          setTimeout(() => {
            setSelectedFile(null)
            setDocumentType("")
            setUploadProgress(0)
            setSuccess(false)
            setUploadTaskId(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          }, 2000)
        },
        onError: (error: Error) => {
          setError(`Upload failed: ${error.message}`)
          toast({
            title: "Upload Failed",
            description: error.message,
            variant: "destructive",
          })
        },
        customMetadata: {
          documentType,
          dealId,
          userId: user.uid,
          uploadedBy: user.email || user.uid
        }
      })

      setUploadTaskId(result.taskId)

    } catch (err) {
      console.error("Upload error:", err)
      setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`)
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const clearFile = () => {
    // Cancel upload if in progress
    if (uploadTaskId) {
      firebaseStorageService.cancelUpload(uploadTaskId)
      setUploadTaskId(null)
    }
    
    setSelectedFile(null)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Document uploaded successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type" className={!documentType && error ? "border-red-500" : ""}>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!documentType && error && <p className="text-sm text-red-500">Please select a document type</p>}
        </div>

        <div className="flex items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={uploading} />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            {selectedFile ? "Change File" : "Select File"}
          </Button>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentType || uploading}
            className="flex-1 bg-teal-900 hover:bg-teal-800 text-white"
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
          <div className="flex items-center">
            <File className="h-5 w-5 text-teal-700 mr-2" />
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-neutral-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFile} disabled={uploading} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Uploading document...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  )
}

export default FileUpload
