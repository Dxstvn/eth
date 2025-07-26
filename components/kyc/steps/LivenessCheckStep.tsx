"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Camera,
  CameraOff,
  Check,
  X,
  AlertCircle,
  Info,
  Shield,
  RefreshCw,
  User,
  Loader2,
  Smartphone,
  Monitor,
  ScanFace,
  ChevronLeft,
  ChevronRight,
  Smile,
  Sun,
  Moon
} from "lucide-react"

export interface LivenessCheckData {
  capturedImage: string | null
  timestamp: number
  deviceType: "webcam" | "mobile"
  livenessScore: number
  verificationStatus: "pending" | "verified" | "failed"
  detectionSteps: DetectionStep[]
}

interface DetectionStep {
  id: string
  instruction: string
  icon: React.ElementType
  completed: boolean
  timestamp?: number
}

interface LivenessCheckStepProps {
  onComplete: (data: LivenessCheckData) => void
  onBack?: () => void
  initialData?: LivenessCheckData
  className?: string
}

const detectionSteps: DetectionStep[] = [
  { id: "center_face", instruction: "Center your face in the frame", icon: User, completed: false },
  { id: "turn_left", instruction: "Turn your head slightly left", icon: ChevronLeft, completed: false },
  { id: "turn_right", instruction: "Turn your head slightly right", icon: ChevronRight, completed: false },
  { id: "smile", instruction: "Smile", icon: Smile, completed: false },
  { id: "lighting", instruction: "Ensure good lighting", icon: Sun, completed: false }
]

export function LivenessCheckStep({
  onComplete,
  onBack,
  initialData,
  className
}: LivenessCheckStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceType, setDeviceType] = useState<"webcam" | "mobile">("webcam")
  const [capturedImage, setCapturedImage] = useState<string | null>(initialData?.capturedImage || null)
  const [showCamera, setShowCamera] = useState(!initialData?.capturedImage)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<DetectionStep[]>(
    initialData?.detectionSteps || detectionSteps.map(step => ({ ...step, completed: false }))
  )
  const [lightingQuality, setLightingQuality] = useState<"poor" | "good" | "excellent">("good")
  const [faceDetected, setFaceDetected] = useState(false)
  
  // Detect device type
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setDeviceType(isMobile ? "mobile" : "webcam")
  }, [])
  
  // Initialize camera
  const initializeCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      setStream(mediaStream)
      setHasPermission(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      // Start mock face detection
      setTimeout(() => {
        setFaceDetected(true)
        startLivenessDetection()
      }, 2000)
    } catch (err) {
      console.error("Camera error:", err)
      setHasPermission(false)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access to continue.")
        } else if (err.name === "NotFoundError") {
          setError("No camera found. Please ensure your device has a working camera.")
        } else {
          setError("Failed to access camera. Please try again.")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Mock liveness detection process
  const startLivenessDetection = useCallback(() => {
    let stepIndex = 0
    const detectionInterval = setInterval(() => {
      if (stepIndex < detectionSteps.length) {
        setCurrentStepIndex(stepIndex)
        
        // Simulate step completion after 2 seconds
        setTimeout(() => {
          setCompletedSteps(prev => {
            const updated = [...prev]
            updated[stepIndex] = {
              ...updated[stepIndex],
              completed: true,
              timestamp: Date.now()
            }
            return updated
          })
          
          // Mock lighting quality changes
          if (stepIndex === detectionSteps.length - 1) {
            const qualities: ("poor" | "good" | "excellent")[] = ["poor", "good", "excellent"]
            setLightingQuality(qualities[Math.floor(Math.random() * qualities.length)])
          }
        }, 1500)
        
        stepIndex++
      } else {
        clearInterval(detectionInterval)
        // All steps completed, ready for capture
        setCurrentStepIndex(-1)
      }
    }, 3000)
    
    return () => clearInterval(detectionInterval)
  }, [])
  
  // Capture image with countdown
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    
    setCountdown(3)
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }
          
          // Capture the image
          const video = videoRef.current!
          const canvas = canvasRef.current!
          const context = canvas.getContext("2d")!
          
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0)
          
          const imageData = canvas.toDataURL("image/jpeg", 0.9)
          setCapturedImage(imageData)
          setShowCamera(false)
          
          // Stop camera stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
          }
          
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [stream])
  
  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    setShowCamera(true)
    setCompletedSteps(detectionSteps.map(step => ({ ...step, completed: false })))
    setCurrentStepIndex(0)
    initializeCamera()
  }, [initializeCamera])
  
  // Complete verification
  const completeVerification = useCallback(() => {
    if (!capturedImage) return
    
    const data: LivenessCheckData = {
      capturedImage,
      timestamp: Date.now(),
      deviceType,
      livenessScore: Math.random() * 0.3 + 0.7, // Mock score between 0.7-1.0
      verificationStatus: "verified",
      detectionSteps: completedSteps
    }
    
    onComplete(data)
  }, [capturedImage, deviceType, completedSteps, onComplete])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [stream])
  
  const allStepsCompleted = completedSteps.every(step => step.completed)
  const progress = (completedSteps.filter(step => step.completed).length / completedSteps.length) * 100
  
  return (
    <div className={cn("space-y-6", className)}>
      <Card className="shadow-soft border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl text-teal-900">Facial Verification</CardTitle>
          <CardDescription className="text-gray-600">
            Complete a quick liveness check to verify your identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCamera ? (
            <>
              {/* Camera Permission Request */}
              {hasPermission === null && !isLoading && (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Camera Access Required</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    We need access to your camera to perform facial verification. 
                    Your privacy is protected and images are processed securely.
                  </p>
                  <Button
                    onClick={initializeCamera}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Enable Camera
                  </Button>
                </div>
              )}
              
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Initializing camera...</p>
                </div>
              )}
              
              {/* Camera View */}
              {hasPermission && !isLoading && (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Verification Progress</span>
                      <span className="font-medium text-teal-900">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  {/* Camera Feed */}
                  <div className="relative rounded-lg overflow-hidden bg-gray-900">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto max-h-[480px] object-cover"
                    />
                    
                    {/* Face Detection Overlay */}
                    {faceDetected && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Face positioning guide */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-64 h-80 border-2 border-teal-500 rounded-full opacity-50" />
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                            <Badge className="bg-teal-600 text-white">
                              <ScanFace className="h-3 w-3 mr-1" />
                              Face Detected
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Lighting Indicator */}
                        <div className="absolute top-4 right-4">
                          <Badge 
                            className={cn(
                              "flex items-center gap-1",
                              lightingQuality === "poor" && "bg-red-100 text-red-800",
                              lightingQuality === "good" && "bg-yellow-100 text-yellow-800",
                              lightingQuality === "excellent" && "bg-green-100 text-green-800"
                            )}
                          >
                            {lightingQuality === "poor" && <Moon className="h-3 w-3" />}
                            {lightingQuality === "good" && <Sun className="h-3 w-3" />}
                            {lightingQuality === "excellent" && <Sun className="h-3 w-3" />}
                            {lightingQuality} lighting
                          </Badge>
                        </div>
                        
                        {/* Current Instruction */}
                        {currentStepIndex >= 0 && currentStepIndex < detectionSteps.length && (
                          <div className="absolute bottom-4 left-0 right-0 text-center">
                            <div className="inline-flex items-center gap-2 bg-black/75 text-white px-4 py-2 rounded-full">
                              {React.createElement(detectionSteps[currentStepIndex].icon, {
                                className: "h-4 w-4"
                              })}
                              <span className="text-sm font-medium">
                                {detectionSteps[currentStepIndex].instruction}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Countdown Overlay */}
                        {countdown !== null && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-white text-6xl font-bold animate-pulse">
                              {countdown}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Device Type Indicator */}
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/90">
                        {deviceType === "mobile" ? (
                          <Smartphone className="h-3 w-3 mr-1" />
                        ) : (
                          <Monitor className="h-3 w-3 mr-1" />
                        )}
                        {deviceType === "mobile" ? "Mobile Camera" : "Webcam"}
                      </Badge>
                    </div>
                    
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  {/* Detection Steps */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {completedSteps.map((step, index) => {
                      const Icon = step.icon
                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border transition-all",
                            step.completed
                              ? "bg-green-50 border-green-200"
                              : index === currentStepIndex
                              ? "bg-teal-50 border-teal-200 animate-pulse"
                              : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            step.completed
                              ? "bg-green-100"
                              : index === currentStepIndex
                              ? "bg-teal-100"
                              : "bg-gray-100"
                          )}>
                            {step.completed ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Icon className={cn(
                                "h-4 w-4",
                                index === currentStepIndex ? "text-teal-600" : "text-gray-400"
                              )} />
                            )}
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            step.completed
                              ? "text-green-800"
                              : index === currentStepIndex
                              ? "text-teal-800"
                              : "text-gray-600"
                          )}>
                            {step.instruction}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Capture Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={captureImage}
                      disabled={!allStepsCompleted || countdown !== null}
                      size="lg"
                      className={cn(
                        "bg-teal-600 hover:bg-teal-700 text-white",
                        (!allStepsCompleted || countdown !== null) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      {countdown !== null ? "Capturing..." : "Capture Photo"}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Error State */}
              {hasPermission === false && (
                <Alert variant="destructive">
                  <CameraOff className="h-4 w-4" />
                  <AlertDescription>{error || "Camera access denied"}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captured verification photo"
                      className="w-full h-auto max-h-[480px] object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-green-600 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Photo Captured
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Verification Results */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">Liveness Check Passed</h4>
                        <p className="text-sm text-green-700">
                          Your facial verification has been successfully completed
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={retakePhoto}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retake Photo
                    </Button>
                    <Button
                      onClick={completeVerification}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Instructions */}
          {showCamera && hasPermission && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-medium text-blue-900 mb-2">Tips for best results:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  <li>Ensure your face is well-lit and clearly visible</li>
                  <li>Remove glasses or anything covering your face</li>
                  <li>Follow the on-screen instructions carefully</li>
                  <li>Keep your device steady during capture</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={countdown !== null}
              >
                Back
              </Button>
            )}
            {!showCamera && !capturedImage && (
              <Button
                onClick={initializeCamera}
                className={cn(
                  "bg-teal-600 hover:bg-teal-700 text-white",
                  !onBack && "ml-auto"
                )}
              >
                Start Verification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Security Notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <div className="text-sm text-teal-800">
            <p className="font-medium mb-1">Biometric Data Protection</p>
            <p className="text-xs">
              Your facial data is processed locally and encrypted before transmission. 
              We do not store biometric data - only verification results are retained.
              All processing complies with GDPR and privacy regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}