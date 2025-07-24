"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  File,
  Image,
  FileText,
  X,
  Check,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  Clock,
  HardDrive
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context-v2"
import firebaseStorageService, { 
  UploadProgress, 
  FileMetadata,
  UploadOptions 
} from "@/services/firebase-storage-service"

interface UploadedFile {
  id: string
  file: File
  metadata?: FileMetadata
  downloadURL?: string
  progress: UploadProgress
  status: 'uploading' | 'completed' | 'error' | 'cancelled'
  error?: string
}

interface FileUploadEnhancedProps {
  transactionId?: string
  category?: 'profile' | 'documents' | 'temp'
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  onFilesUploaded?: (files: FileMetadata[]) => void
  onFileDeleted?: (filePath: string) => void
  existingFiles?: FileMetadata[]
  title?: string
  description?: string
}

export default function FileUploadEnhanced({
  transactionId,
  category = 'documents',
  maxFiles = 5,
  maxFileSize = 10,
  allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  onFilesUploaded,
  onFileDeleted,
  existingFiles = [],
  title = "File Upload",
  description = "Upload and manage your files"
}: FileUploadEnhancedProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null)
  const [storageUsage, setStorageUsage] = useState<{
    totalFiles: number
    totalSize: number
  } | null>(null)

  // Load storage usage on mount
  useState(() => {
    if (user) {
      loadStorageUsage()
    }
  })

  const loadStorageUsage = async () => {
    if (!user) return
    
    try {
      const usage = await firebaseStorageService.getUserStorageUsage(user.uid)
      setStorageUsage({
        totalFiles: usage.totalFiles,
        totalSize: usage.totalSize
      })
    } catch (error) {
      console.error('Failed to load storage usage:', error)
    }
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || !user) return

    const selectedFiles = Array.from(files)
    
    // Check file count limit
    if (uploadedFiles.length + existingFiles.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      })
      return
    }

    // Validate and upload files
    selectedFiles.forEach((file) => {
      const validation = firebaseStorageService.validateFile(file, {
        maxSize: maxFileSize * 1024 * 1024,
        allowedTypes
      })

      if (!validation.isValid) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        })
        return
      }

      uploadFile(file)
    })
  }, [uploadedFiles, existingFiles, maxFiles, maxFileSize, allowedTypes, user, toast])

  const uploadFile = async (file: File) => {
    if (!user) return

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Generate file path
    const filePath = transactionId
      ? firebaseStorageService.generateTransactionFilePath(transactionId, file.name, user.uid)
      : firebaseStorageService.generateUserFilePath(user.uid, file.name, category)

    // Add to uploaded files list
    const uploadedFile: UploadedFile = {
      id: fileId,
      file,
      progress: { bytesTransferred: 0, totalBytes: file.size, progress: 0, state: 'running' },
      status: 'uploading'
    }

    setUploadedFiles(prev => [...prev, uploadedFile])

    const uploadOptions: UploadOptions = {
      onProgress: (progress) => {
        setUploadedFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, progress } : f)
        )
      },
      onComplete: (downloadURL, metadata) => {
        setUploadedFiles(prev =>
          prev.map(f => f.id === fileId ? {
            ...f,
            status: 'completed',
            downloadURL,
            metadata
          } : f)
        )
        
        toast({
          title: "Upload Complete",
          description: `${file.name} uploaded successfully`,
        })

        // Notify parent component
        onFilesUploaded?.([metadata])
        loadStorageUsage()
      },
      onError: (error) => {
        setUploadedFiles(prev =>
          prev.map(f => f.id === fileId ? {
            ...f,
            status: 'error',
            error: error.message
          } : f)
        )

        toast({
          title: "Upload Failed",
          description: `${file.name}: ${error.message}`,
          variant: "destructive",
        })
      },
      customMetadata: {
        category,
        transactionId: transactionId || '',
        userId: user.uid
      }
    }

    try {
      await firebaseStorageService.uploadFile(file, filePath, uploadOptions)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const cancelUpload = (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    if (file && file.metadata?.customMetadata?.taskId) {
      firebaseStorageService.cancelUpload(file.metadata.customMetadata.taskId)
    }
    
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const deleteFile = async (filePath: string) => {
    try {
      await firebaseStorageService.deleteFile(filePath)
      onFileDeleted?.(filePath)
      loadStorageUsage()
      
      toast({
        title: "File Deleted",
        description: "File has been successfully deleted",
      })
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      })
    }
  }

  const downloadFile = async (file: FileMetadata) => {
    try {
      const downloadURL = file.downloadURL || await firebaseStorageService.getDownloadURL(file.fullPath)
      
      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadURL
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const handlePreviewFile = (file: FileMetadata) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  const getFileIcon = (contentType?: string) => {
    if (!contentType) return <File className="h-4 w-4" />
    
    if (contentType.startsWith('image/')) return <Image className="h-4 w-4" />
    if (contentType === 'application/pdf') return <FileText className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          {storageUsage && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                {storageUsage.totalFiles} files
              </div>
              <div>{formatFileSize(storageUsage.totalSize)} used</div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Upload Area - Mobile Responsive */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
              isDragging
                ? 'border-teal-300 bg-teal-50'
                : 'border-gray-300 hover:border-teal-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-3">
              <span className="hidden sm:inline">Drag and drop files here, or click to select</span>
              <span className="sm:hidden">Tap to select files</span>
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-teal-700 border-teal-200 hover:bg-teal-50 w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              Max {maxFiles} files, {maxFileSize}MB each<br className="sm:hidden" />
              <span className="hidden sm:inline">. </span>Supported: PDF, DOC, TXT, Images
            </p>
          </div>

          {/* Upload Progress */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Uploading Files</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getFileIcon(file.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={file.progress.progress} className="flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(file.progress.progress)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {file.status === 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelUpload(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {file.status === 'completed' && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Existing Files - Mobile Responsive */}
          {existingFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Uploaded Files</h4>
              {existingFiles.map((file) => (
                <div key={file.fullPath} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-white">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.contentType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(file.timeCreated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 justify-end sm:justify-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewFile(file)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Preview</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Download</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.fullPath)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File Limits Alert */}
          {uploadedFiles.length + existingFiles.length >= maxFiles && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have reached the maximum limit of {maxFiles} files.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>
              {previewFile?.name} • {previewFile && formatFileSize(previewFile.size)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {previewFile && (
              <div className="space-y-4">
                {previewFile.contentType?.startsWith('image/') ? (
                  <img
                    src={previewFile.downloadURL}
                    alt={previewFile.name}
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                    {getFileIcon(previewFile.contentType)}
                    <span className="ml-2 text-sm text-gray-600">
                      Preview not available for this file type
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Size:</span> {formatFileSize(previewFile.size)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {previewFile.contentType || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(previewFile.timeCreated).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {new Date(previewFile.updated).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => previewFile && downloadFile(previewFile)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => previewFile && deleteFile(previewFile.fullPath)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}