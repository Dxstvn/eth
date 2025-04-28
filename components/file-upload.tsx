"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Upload, File, CheckCircle, AlertCircle } from "lucide-react"

interface FileUploadProps {
  onUploadComplete?: (fileData: { name: string; url: string; type: string; size: number }) => void
  allowedFileTypes?: string[]
  maxSizeMB?: number
  buttonText?: string
  className?: string
}

export default function FileUpload({
  onUploadComplete,
  allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  maxSizeMB = 10,
  buttonText = "Upload Document",
  className = "",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload one of the following: ${allowedFileTypes.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSizeMB}MB`,
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setIsUploading(true)
    setUploadStatus("uploading")

    try {
      // Create form data for the file
      const formData = new FormData()
      formData.append("file", file)

      // Upload to backend
      const uploadResponse = await fetch("http://localhost:3000/files/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const responseData = await uploadResponse.json()

      setUploadStatus("success")
      toast({
        title: "Upload successful",
        description: "Your document has been uploaded successfully.",
      })

      // Call the callback with the file data
      if (onUploadComplete) {
        onUploadComplete({
          name: file.name,
          url: responseData.url || responseData.fileUrl || "",
          type: file.type,
          size: file.size,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("error")
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept={allowedFileTypes.join(",")}
        />

        {uploadStatus === "idle" && (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400">
              {allowedFileTypes.map((type) => type.split("/")[1]).join(", ")} (Max: {maxSizeMB}MB)
            </p>
          </div>
        )}

        {uploadStatus === "uploading" && (
          <div className="text-center">
            <File className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
            <p className="mt-2 text-sm">Uploading {fileName}...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm text-green-600">Upload complete!</p>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-2 text-sm text-red-600">Upload failed</p>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
        )}

        <Button onClick={triggerFileInput} disabled={isUploading} className="mt-2">
          {buttonText}
        </Button>
      </div>
    </Card>
  )
}
