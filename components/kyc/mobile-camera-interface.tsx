"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Smartphone, 
  X, 
  Check,
  RefreshCw,
  AlertCircle,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileCameraInterfaceProps {
  onCapture: (imageData: string, metadata?: any) => void
  onCancel: () => void
  documentType?: 'passport' | 'drivers_license' | 'selfie'
  className?: string
}

export function MobileCameraInterface({
  onCapture,
  onCancel,
  documentType = 'passport',
  className
}: MobileCameraInterfaceProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>({})
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Initialize camera based on document type
  const initializeCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: documentType === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: { ideal: 'continuous' },
          // Mobile-specific optimizations
          aspectRatio: documentType === 'selfie' ? 1 : 4/3,
        }
      }

      // Add flash support if available
      if (flashEnabled && 'torch' in navigator.mediaDevices.getSupportedConstraints()) {
        // @ts-ignore - torch is experimental
        constraints.video.torch = true
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      // Get device capabilities for optimization
      const track = mediaStream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      setDeviceInfo(capabilities)
      
    } catch (err: any) {
      console.error('Camera initialization error:', err)
      let errorMessage = 'Unable to access camera'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, flashEnabled, documentType])

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [stream])

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (stream && 'torch' in navigator.mediaDevices.getSupportedConstraints()) {
      const track = stream.getVideoTracks()[0]
      try {
        // @ts-ignore - torch is experimental
        await track.applyConstraints({ advanced: [{ torch: !flashEnabled }] })
        setFlashEnabled(!flashEnabled)
      } catch (err) {
        console.error('Flash toggle error:', err)
      }
    }
  }, [stream, flashEnabled])

  // Capture photo with mobile optimizations
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsCapturing(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Apply mobile-specific filters and optimizations
      ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)'
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Add overlay guides for document alignment
      if (documentType !== 'selfie') {
        drawDocumentGuides(ctx, canvas.width, canvas.height, documentType)
      }

      // Convert to high-quality JPEG
      const imageData = canvas.toDataURL('image/jpeg', 0.92)
      setCapturedImage(imageData)
      
      // Provide haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
      
      // Generate metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        deviceInfo,
        facingMode,
        documentType,
        quality: 'high',
        dimensions: { width: canvas.width, height: canvas.height }
      }

      // Auto-process if good quality detected
      setTimeout(() => {
        if (detectQuality(ctx, canvas.width, canvas.height)) {
          handleConfirmCapture(imageData, metadata)
        }
      }, 1000)
      
    } catch (err) {
      setError('Failed to capture photo. Please try again.')
      console.error('Capture error:', err)
    } finally {
      setIsCapturing(false)
    }
  }, [documentType, deviceInfo, facingMode, onCapture])

  // Draw alignment guides
  const drawDocumentGuides = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 5])

    const padding = 50
    const guideWidth = width - (padding * 2)
    const guideHeight = type === 'passport' ? guideWidth * 0.7 : guideWidth * 0.6

    const x = (width - guideWidth) / 2
    const y = (height - guideHeight) / 2

    ctx.strokeRect(x, y, guideWidth, guideHeight)
    
    // Corner markers
    ctx.setLineDash([])
    ctx.lineWidth = 3
    const cornerSize = 20
    
    // Top-left
    ctx.beginPath()
    ctx.moveTo(x, y + cornerSize)
    ctx.lineTo(x, y)
    ctx.lineTo(x + cornerSize, y)
    ctx.stroke()
    
    // Top-right
    ctx.beginPath()
    ctx.moveTo(x + guideWidth - cornerSize, y)
    ctx.lineTo(x + guideWidth, y)
    ctx.lineTo(x + guideWidth, y + cornerSize)
    ctx.stroke()
    
    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(x, y + guideHeight - cornerSize)
    ctx.lineTo(x, y + guideHeight)
    ctx.lineTo(x + cornerSize, y + guideHeight)
    ctx.stroke()
    
    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(x + guideWidth - cornerSize, y + guideHeight)
    ctx.lineTo(x + guideWidth, y + guideHeight)
    ctx.lineTo(x + guideWidth, y + guideHeight - cornerSize)
    ctx.stroke()
  }

  // Simple quality detection
  const detectQuality = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    let brightness = 0
    let contrast = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const gray = (r + g + b) / 3
      brightness += gray
    }
    
    brightness /= (data.length / 4)
    return brightness > 50 && brightness < 200 // Good lighting conditions
  }

  const handleConfirmCapture = (imageData: string, metadata: any) => {
    onCapture(imageData, metadata)
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  useEffect(() => {
    initializeCamera()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [initializeCamera])

  // Handle device orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play()
        }
      }, 300)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    return () => window.removeEventListener('orientationchange', handleOrientationChange)
  }, [])

  const getCameraInstructions = () => {
    const instructions = {
      passport: [
        "Position your passport's photo page in the frame",
        "Ensure all text is clearly visible and readable",
        "Avoid glare and shadows on the document",
        "Keep the camera steady and focus sharp"
      ],
      drivers_license: [
        "Center your driver's license in the frame",
        "Make sure all corners are visible",
        "Check that text is clear and not blurry", 
        "Ensure good lighting without glare"
      ],
      selfie: [
        "Look directly at the camera",
        "Ensure your face is well-lit and clearly visible",
        "Remove glasses if they cause glare",
        "Keep a neutral expression"
      ]
    }
    
    return instructions[documentType] || instructions.passport
  }

  if (capturedImage) {
    return (
      <div className={cn("fixed inset-0 bg-black z-50 flex flex-col", className)}>
        <div className="flex-1 relative">
          <img 
            src={capturedImage} 
            alt="Captured document"
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="p-4 bg-black/80 text-white">
          <p className="text-center mb-4">Review your capture</p>
          <div className="flex gap-4">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="flex-1 h-14 text-base touch-manipulation"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={() => handleConfirmCapture(capturedImage, {})}
              className="flex-1 h-14 text-base bg-teal-600 hover:bg-teal-700 touch-manipulation"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("fixed inset-0 bg-black z-50 flex flex-col", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <h2 className="font-semibold capitalize">
            {documentType === 'drivers_license' ? "Driver's License" : documentType}
          </h2>
        </div>
        
        <div className="flex gap-2">
          {deviceInfo.torch && (
            <Button
              onClick={toggleFlash}
              variant="ghost"
              size="sm"
              className={cn(
                "text-white hover:bg-white/10 touch-manipulation",
                flashEnabled && "bg-white/20"
              )}
            >
              {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </Button>
          )}
          
          <Button
            onClick={switchCamera}
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 touch-manipulation"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <Camera className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
            <Alert variant="destructive" className="max-w-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {stream && !error && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Instructions overlay */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/60 text-white p-3 rounded-lg text-sm">
                <h3 className="font-semibold mb-2">Capture Tips:</h3>
                <ul className="space-y-1 text-xs">
                  {getCameraInstructions().map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>

      {/* Capture controls */}
      {stream && !error && (
        <div className="p-6 bg-black/80">
          <div className="flex items-center justify-center">
            <Button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black touch-manipulation active:scale-95 transition-transform"
            >
              {isCapturing ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </Button>
          </div>
          
          <p className="text-white text-center mt-4 text-sm">
            Tap to capture {documentType === 'selfie' ? 'selfie' : 'document'}
          </p>
        </div>
      )}
    </div>
  )
}