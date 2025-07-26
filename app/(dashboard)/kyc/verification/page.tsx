"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useRef, useCallback } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Camera, CheckCircle, RefreshCw, Info, User } from "lucide-react"
import { useAuth } from "@/context/auth-context-v2"

export default function KYCVerificationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [selfieImage, setSelfieImage] = useState<string | null>(null)
  const [verificationStep, setVerificationStep] = useState<"instructions" | "capture" | "review">("instructions")

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
        setVerificationStep("capture")
        setError(null)
      }
    } catch (err) {
      setError("Unable to access camera. Please ensure you've granted camera permissions.")
      console.error("Camera error:", err)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  const captureSelfie = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const context = canvas.getContext("2d")
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL("image/jpeg", 0.9)
        setSelfieImage(imageData)
        setVerificationStep("review")
        stopCamera()
      }
    }
  }, [])

  const retakeSelfie = () => {
    setSelfieImage(null)
    setVerificationStep("capture")
    startCamera()
  }

  const onSubmit = async () => {
    if (!selfieImage) {
      setError("Please capture a selfie before proceeding")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // TODO: Submit selfie and complete KYC to backend
      console.log("Submitting KYC verification...")
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Navigate to status page
      router.push("/kyc/status")
    } catch (err) {
      setError("Failed to complete verification. Please try again.")
      console.error("Error submitting verification:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const instructions = [
    "Ensure your face is clearly visible",
    "Remove glasses or face coverings",
    "Make sure you're in a well-lit area",
    "Center your face in the frame",
    "Keep a neutral expression",
    "Hold still while capturing",
  ]

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
          <CardDescription>
            Take a selfie to verify your identity matches your submitted documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions Step */}
          {verificationStep === "instructions" && (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Before You Begin</AlertTitle>
                <AlertDescription>
                  We'll need to take a photo of your face to match with your ID document.
                  This helps us verify your identity and keep your account secure.
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="text-lg font-semibold mb-4">Selfie Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <span className="text-sm">{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-32 w-32 text-gray-400" />
                  </div>
                  <div className="absolute inset-2 border-2 border-dashed border-gray-300 rounded-lg"></div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={startCamera} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </Button>
              </div>
            </div>
          )}

          {/* Capture Step */}
          {verificationStep === "capture" && (
            <div className="space-y-6">
              <div className="relative max-w-2xl mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Face guide overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="w-64 h-80 border-2 border-white rounded-full opacity-50"></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={stopCamera}
                >
                  Cancel
                </Button>
                <Button
                  onClick={captureSelfie}
                  size="lg"
                  disabled={!cameraActive}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Photo
                </Button>
              </div>
            </div>
          )}

          {/* Review Step */}
          {verificationStep === "review" && selfieImage && (
            <div className="space-y-6">
              <div className="max-w-md mx-auto">
                <img
                  src={selfieImage}
                  alt="Selfie"
                  className="w-full rounded-lg"
                />
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Photo Captured</AlertTitle>
                <AlertDescription className="text-green-700">
                  Please review your photo. Make sure your face is clearly visible and matches your ID.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={retakeSelfie}
                  disabled={isSubmitting}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake Photo
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Complete Verification"}
                </Button>
              </div>
            </div>
          )}

          {/* Back Button (when not capturing) */}
          {verificationStep !== "capture" && (
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.push("/kyc/documents")}
                disabled={isSubmitting}
              >
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Your biometric data is processed securely and deleted after verification.
          We do not store facial recognition data.
        </p>
      </div>
    </div>
  )
}