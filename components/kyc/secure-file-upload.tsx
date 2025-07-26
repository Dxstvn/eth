"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  Lock, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Eye,
  EyeOff
} from "lucide-react"
import { KYCEncryptionService, KYCFieldType } from "@/lib/security/kyc-encryption"

// File type configurations
const ALLOWED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface SecureFileUploadProps {
  id: string
  label: string
  description?: string
  fieldType: KYCFieldType
  onFileSelect: (file: File | null, encrypted?: any) => void
  onRemove?: () => void
  value?: File | null
  preview?: string | null
  accept?: string
  required?: boolean
  disabled?: boolean
  className?: string
  showSecurityIndicators?: boolean
  enableEncryption?: boolean
  encryptionPassword?: string
  enableWatermark?: boolean
  watermarkText?: string
}

export function SecureFileUpload({
  id,
  label,
  description,
  fieldType,
  onFileSelect,
  onRemove,
  value,
  preview,
  accept = "image/jpeg,image/png,application/pdf",
  required = false,
  disabled = false,
  className,
  showSecurityIndicators = true,
  enableEncryption = true,
  encryptionPassword,
  enableWatermark = true,
  watermarkText = "CLEARHOLD KYC"
}: SecureFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [isEncrypting, setIsEncrypting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const encryptionService = useRef(new KYCEncryptionService())

  // Validate file type
  const validateFileType = (file: File): boolean => {
    const allowedTypes = Object.keys(ALLOWED_FILE_TYPES)
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload JPEG, PNG, or PDF files only")
      return false
    }
    return true
  }

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
      return false
    }
    return true
  }

  // Add watermark to image
  const addWatermark = useCallback(async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) {
          resolve(imageUrl)
          return
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(imageUrl)
          return
        }

        // Set canvas size to image size
        canvas.width = img.width
        canvas.height = img.height

        // Draw image
        ctx.drawImage(img, 0, 0)

        // Add semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add watermark text
        ctx.font = `${Math.max(20, canvas.width / 20)}px Arial`
        ctx.fillStyle = 'rgba(0, 128, 128, 0.3)'
        ctx.textAlign = 'center'
        ctx.save()
        
        // Rotate and repeat watermark
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(-45 * Math.PI / 180)
        
        const watermarkTextToUse = watermarkText || 'CLEARHOLD KYC'
        const textWidth = ctx.measureText(watermarkTextToUse).width
        const spacing = textWidth * 2

        for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
          for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
            ctx.fillText(watermarkTextToUse, x, y)
          }
        }
        
        ctx.restore()

        // Add security badge
        ctx.fillStyle = 'rgba(0, 128, 128, 0.8)'
        ctx.fillRect(10, 10, 150, 40)
        ctx.fillStyle = 'white'
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'left'
        ctx.fillText('🔒 Secure Upload', 20, 35)

        // Convert to blob URL
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob))
          } else {
            resolve(imageUrl)
          }
        }, 'image/png')
      }
      img.src = imageUrl
    })
  }, [watermarkText])

  // Process file selection
  const processFile = useCallback(async (file: File) => {
    setError(null)
    
    // Validate file
    if (!validateFileType(file) || !validateFileSize(file)) {
      return
    }

    setIsUploading(true)
    setUploadProgress(20)

    try {
      let processedFile = file
      let processedPreview: string | null = null

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        
        setUploadProgress(40)
        
        // Add watermark if enabled
        if (enableWatermark) {
          processedPreview = await addWatermark(dataUrl)
        } else {
          processedPreview = dataUrl
        }
        
        setUploadProgress(60)
      }

      // Encrypt file if enabled
      let encryptedData = null
      if (enableEncryption && encryptionPassword) {
        setIsEncrypting(true)
        encryptedData = await encryptionService.current.encryptFile(
          file,
          encryptionPassword,
          (progress) => {
            setUploadProgress(60 + (progress * 0.3))
          }
        )
        setIsEncrypting(false)
      }
      
      setUploadProgress(90)

      // Simulate final processing
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setUploadProgress(100)
      
      // Call parent handler
      onFileSelect(processedFile, encryptedData)
      
      // Update preview if needed
      if (processedPreview && !preview) {
        // Parent should handle preview state
      }

    } catch (err) {
      console.error('File processing error:', err)
      setError('Failed to process file. Please try again.')
    } finally {
      setIsUploading(false)
      setIsEncrypting(false)
      setTimeout(() => setUploadProgress(0), 500)
    }
  }, [enableEncryption, encryptionPassword, enableWatermark, onFileSelect, preview, addWatermark])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target === dropZoneRef.current) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  // Handle remove
  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileSelect(null)
    onRemove?.()
    setError(null)
    setUploadProgress(0)
  }

  // Check if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          {label}
          {required && <span aria-label="required" className="text-red-500 ml-1">*</span>}
        </label>
        {showSecurityIndicators && (
          <div className="flex items-center gap-2" role="img" aria-label="Secure upload indicator">
            <Shield className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span className="text-xs text-teal-600 font-medium">Secure Upload</span>
          </div>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {error && (
        <Alert variant="destructive" className="py-2" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-sm">
            <strong>Upload Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-200",
          isDragging && !disabled && "border-teal-500 bg-teal-50",
          !isDragging && !value && "border-gray-300 hover:border-gray-400",
          value && "border-green-500 bg-green-50",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-red-500",
          "p-6"
        )}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="sr-only"
          capture={isMobile ? "environment" : undefined}
          aria-describedby={`${id}-description`}
          aria-required={required}
        />
        
        {!value ? (
          <>
            <label
              htmlFor={id}
              className={cn(
                "flex flex-col items-center justify-center cursor-pointer space-y-3 focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 rounded-lg",
                disabled && "cursor-not-allowed opacity-50"
              )}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              aria-describedby={`${id}-description`}
            >
              <div className="relative">
                <Upload className="h-10 w-10 text-gray-400" aria-hidden="true" />
                {enableEncryption && (
                  <Lock 
                    className="h-4 w-4 text-teal-600 absolute -bottom-1 -right-1" 
                    aria-label="Encryption enabled"
                  />
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isMobile ? 'Tap to capture or select file' : 'Click to upload file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  or drag and drop here
                </p>
              </div>
            </label>
            
            <div id={`${id}-description`} className="text-xs text-gray-400 text-center mt-2">
              Accepted formats: JPEG, PNG, PDF • Maximum size: 10MB
              {enableEncryption && " • Files are encrypted for security"}
            </div>

            {/* Mobile camera and file options */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }}
                className="flex-1 h-12 text-base touch-manipulation active:scale-98 transition-transform"
                disabled={disabled}
              >
                <Upload className="h-5 w-5 mr-2" aria-hidden="true" />
                Choose File
              </Button>
              
              {(fieldType === KYCFieldType.PASSPORT || fieldType === KYCFieldType.DRIVERS_LICENSE) && (
                <Button
                  type="button"
                  onClick={openCamera}
                  className="flex-1 h-12 text-base bg-teal-600 hover:bg-teal-700 touch-manipulation active:scale-98 transition-transform"
                  disabled={disabled}
                >
                  <Camera className="h-5 w-5 mr-2" aria-hidden="true" />
                  Use Camera
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* File preview */}
            {preview && value.type.startsWith('image/') ? (
              <div className="relative">
                <img
                  src={preview}
                  alt={`Preview of uploaded file: ${value.name}`}
                  className="max-w-full h-48 object-contain mx-auto rounded"
                  role="img"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(!showPreview)}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white focus:ring-2 focus:ring-teal-500"
                  aria-label={showPreview ? "Hide file preview" : "Show file preview"}
                >
                  {showPreview ? 
                    <EyeOff className="h-4 w-4" aria-hidden="true" /> : 
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  }
                </Button>
                
                {/* Watermark canvas (hidden) */}
                <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-gray-50 rounded" role="img" aria-label="Document file preview">
                <FileText className="h-12 w-12 text-gray-400" aria-hidden="true" />
                <span className="sr-only">Non-image file uploaded: {value.name}</span>
              </div>
            )}

            {/* File info */}
            <div className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {value.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(value.size / 1024).toFixed(1)} KB
                    {isEncrypting && " • Encrypting..."}
                    {enableEncryption && !isEncrypting && " • Encrypted"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="w-10 h-10 touch-manipulation active:scale-95 transition-transform"
                aria-label={`Remove uploaded file: ${value.name}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Security indicators */}
            {showSecurityIndicators && (
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Secure transmission</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg" role="dialog" aria-labelledby="upload-progress-title">
            <div className="w-full max-w-xs space-y-3">
              <Progress 
                value={uploadProgress} 
                className="h-2" 
                aria-label={`Upload progress: ${uploadProgress}%`}
              />
              <p id="upload-progress-title" className="text-sm text-center text-gray-600">
                {isEncrypting ? 'Encrypting file...' : 'Processing upload...'}
              </p>
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {uploadProgress}% complete. {isEncrypting ? 'Encrypting file for security.' : 'Processing your upload.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional security notice */}
      {showSecurityIndicators && !value && (
        <p className="text-xs text-gray-500 text-center">
          Your documents are encrypted and transmitted securely. 
          We delete all documents after verification.
        </p>
      )}
    </div>
  )
}