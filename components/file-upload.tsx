"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, AlertCircle, CheckCircle, File, X, Database } from "lucide-react"
import { uploadToIPFS, isIPFSNodeAvailable, retryWithBackoff } from "@/lib/ipfs-client"

interface FileUploadProps {
  onUploadComplete: (
    cid: string,
    fileKey: string,
    encryptionKey: string,
    fileName: string,
    fileSize: string,
    fileType: string,
  ) => void
  dealId: string
}

export default function FileUpload({ onUploadComplete, dealId }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ipfsAvailable, setIpfsAvailable] = useState<boolean | null>(null)
  const [checkingIpfs, setCheckingIpfs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check IPFS availability on mount
  useEffect(() => {
    const checkIpfs = async () => {
      setCheckingIpfs(true)
      try {
        const available = await isIPFSNodeAvailable()
        setIpfsAvailable(available)
      } catch (err) {
        console.error("Error checking IPFS:", err)
        setIpfsAvailable(false)
      } finally {
        setCheckingIpfs(false)
      }
    }

    checkIpfs()
  }, [])

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

    // Check IPFS availability before attempting upload
    setCheckingIpfs(true)
    const available = await isIPFSNodeAvailable()
    setIpfsAvailable(available)
    setCheckingIpfs(false)

    if (!available) {
      setError("IPFS service is not available. Please check your connection settings.")
      return
    }

    try {
      setUploading(true)
      setUploadProgress(10)
      setError(null)

      // Simulate encryption progress
      setUploadProgress(30)
      console.log("Simulating encryption...")

      // Generate a mock encryption key
      const encryptionKey = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0"),
      ).join("")

      // Validate connection to IPFS
      setUploadProgress(50)
      console.log("Validating IPFS connection...")

      // Use retry with backoff for more resilient validation
      const { path: cid, fileKey } = await retryWithBackoff(
        async () => uploadToIPFS(selectedFile),
        3, // max 3 retries
        1000, // starting with 1s delay
      )

      console.log("IPFS connection validated successfully")
      console.log("Mock CID:", cid)
      console.log("File key:", fileKey)

      // Format file size
      const fileSize = formatFileSize(selectedFile.size)

      // Get file type
      const fileType = selectedFile.type.split("/").pop()?.toUpperCase() || "UNKNOWN"

      setUploadProgress(100)
      setSuccess(true)

      // Call the callback with the validation result
      onUploadComplete(cid, fileKey, encryptionKey, selectedFile.name, fileSize, fileType)

      // Reset after a delay
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress(0)
        setSuccess(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 2000)
    } catch (err) {
      console.error("Validation error:", err)
      setError(`Connection validation failed: ${err instanceof Error ? err.message : String(err)}`)
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
    setSelectedFile(null)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const checkIpfsConnection = async () => {
    setCheckingIpfs(true)
    setError(null)
    try {
      const available = await isIPFSNodeAvailable()
      setIpfsAvailable(available)
      if (!available) {
        setError("IPFS service is still not available. Please check your connection settings.")
      }
    } catch (err) {
      console.error("Error checking IPFS:", err)
      setIpfsAvailable(false)
      setError(`Failed to check IPFS connection: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCheckingIpfs(false)
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
          <AlertDescription>IPFS connection validated successfully!</AlertDescription>
        </Alert>
      )}

      {ipfsAvailable === false && !error && (
        <Alert className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>IPFS Not Available</AlertTitle>
          <AlertDescription>
            <p>Cannot connect to IPFS service. File uploads will not work until connection is restored.</p>
            <Button variant="outline" size="sm" onClick={checkIpfsConnection} disabled={checkingIpfs} className="mt-2">
              {checkingIpfs ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" /> Check Connection
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={uploading} />

        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1">
          <Upload className="mr-2 h-4 w-4" />
          {selectedFile ? "Change File" : "Select File"}
        </Button>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading || ipfsAvailable === false}
          className="flex-1 bg-teal-900 hover:bg-teal-800 text-white"
        >
          {uploading ? "Validating..." : "Validate IPFS Connection"}
        </Button>
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
            <span>Validating IPFS connection...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  )
}
