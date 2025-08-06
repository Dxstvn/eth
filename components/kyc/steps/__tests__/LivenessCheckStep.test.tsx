import React from 'react'
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LivenessCheckStep } from '../LivenessCheckStep'

// Mock getUserMedia
const mockGetUserMedia = vi.fn()
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([
    { stop: vi.fn(), kind: 'video' }
  ])
}

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
})

// Mock HTMLVideoElement play/pause
HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
HTMLVideoElement.prototype.pause = vi.fn()

// Mock Canvas context
const mockCanvasContext = {
  drawImage: vi.fn(),
  canvas: {
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-capture')
  }
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasContext)

describe('LivenessCheckStep', () => {
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserMedia.mockResolvedValue(mockMediaStream)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders liveness check interface', () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/facial recognition/i)).toBeInTheDocument()
      expect(screen.getByText(/verify your identity with a live photo/i)).toBeInTheDocument()
    })

    it('displays preparation checklist', () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/good lighting/i)).toBeInTheDocument()
      expect(screen.getByText(/remove glasses/i)).toBeInTheDocument()
      expect(screen.getByText(/face the camera/i)).toBeInTheDocument()
      expect(screen.getByText(/plain background/i)).toBeInTheDocument()
    })

    it('shows security notice', () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/privacy first/i)).toBeInTheDocument()
      expect(screen.getByText(/camera access is only used for verification/i)).toBeInTheDocument()
    })

    it('renders back button when onBack prop is provided', () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} onBack={mockOnBack} />)
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Camera Permissions', () => {
    it('requests camera permissions on start', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
      })
    })

    it('displays error when camera permission is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByText(/camera access was denied/i)).toBeInTheDocument()
      })
    })

    it('handles camera not found error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('No camera found'))
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByText(/no camera detected/i)).toBeInTheDocument()
      })
    })

    it('shows retry button on camera error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })

  describe('Detection Steps', () => {
    it('shows detection steps after camera starts', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByText(/position your face in the frame/i)).toBeInTheDocument()
        expect(screen.getByText(/smile for the camera/i)).toBeInTheDocument()
        expect(screen.getByText(/turn your head slightly left/i)).toBeInTheDocument()
        expect(screen.getByText(/turn your head slightly right/i)).toBeInTheDocument()
      })
    })

    it('marks steps as completed when performed', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByText(/position your face in the frame/i)).toBeInTheDocument()
      })
      
      // Simulate step completion
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      await waitFor(() => {
        const completedStep = screen.getByText(/position your face in the frame/i).closest('div')
        expect(completedStep).toHaveClass('line-through')
      })
    })

    it('progresses through all detection steps', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
      })
      
      // Progress through steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      
      // Step 2
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument()
      })
      
      // Step 3
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument()
      })
      
      // Step 4
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument()
      })
    })

    it('shows current instruction prominently', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        const instruction = screen.getByRole('heading', { level: 3 })
        expect(instruction).toHaveTextContent(/position your face in the frame/i)
      })
    })
  })

  describe('Photo Capture', () => {
    it('captures photo after completing all steps', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      })
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton) // Step 2
      await user.click(nextButton) // Step 3
      await user.click(nextButton) // Step 4
      
      // Final step should trigger capture
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(mockCanvasContext.drawImage).toHaveBeenCalled()
        expect(mockCanvasContext.canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.95)
      })
    })

    it('shows captured image preview', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      await waitFor(() => {
        expect(screen.getByAltText(/captured photo/i)).toBeInTheDocument()
        expect(screen.getByText(/review your photo/i)).toBeInTheDocument()
      })
    })

    it('allows retaking photo', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retake photo/i })).toBeInTheDocument()
      })
      
      const retakeButton = screen.getByRole('button', { name: /retake photo/i })
      await user.click(retakeButton)
      
      await waitFor(() => {
        expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
      })
    })
  })

  describe('Verification', () => {
    it('simulates verification process', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      // Confirm photo
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use this photo/i })).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByText(/verifying/i)).toBeInTheDocument()
      })
    })

    it('shows success message after verification', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      // Confirm photo
      const confirmButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByText(/verification successful/i)).toBeInTheDocument()
        expect(screen.getByText(/liveness check passed/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('calls onComplete with verification data', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      // Confirm photo
      const confirmButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            capturedImage: 'data:image/png;base64,mock-capture',
            timestamp: expect.any(Number),
            deviceType: 'webcam',
            livenessScore: expect.any(Number),
            verificationStatus: 'verified',
            detectionSteps: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                instruction: expect.any(String),
                completed: true,
                timestamp: expect.any(Number)
              })
            ])
          })
        )
      }, { timeout: 5000 })
    })
  })

  describe('Mobile Detection', () => {
    it('detects mobile device', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/using mobile device/i)).toBeInTheDocument()
    })

    it('uses mobile camera constraints', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('handles verification failure', async () => {
      // Mock random to force failure
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      // Confirm photo
      const confirmButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('allows retry after failure', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      // Complete all steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(nextButton).toBeInTheDocument()
        })
        await user.click(nextButton)
      }
      
      // Confirm photo
      const confirmButton = screen.getByRole('button', { name: /use this photo/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      await user.click(tryAgainButton)
      
      expect(screen.getByText(/facial recognition/i)).toBeInTheDocument()
    })
  })

  describe('Camera Cleanup', () => {
    it('stops camera stream when component unmounts', async () => {
      const { unmount } = render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })
      
      const mockStop = mockMediaStream.getTracks()[0].stop
      
      unmount()
      
      expect(mockStop).toHaveBeenCalled()
    })

    it('stops camera when going back', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} onBack={mockOnBack} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled()
      })
      
      const mockStop = mockMediaStream.getTracks()[0].stop
      
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)
      
      expect(mockStop).toHaveBeenCalled()
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('Progress Indicator', () => {
    it('shows progress through steps', async () => {
      render(<LivenessCheckStep onComplete={mockOnComplete} />)
      
      const startButton = screen.getByRole('button', { name: /start facial recognition/i })
      await user.click(startButton)
      
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
      
      // Initial progress
      let progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '25')
      
      // Progress through steps
      const nextButton = screen.getByRole('button', { name: /next/i })
      
      await user.click(nextButton)
      await waitFor(() => {
        progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      })
      
      await user.click(nextButton)
      await waitFor(() => {
        progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '75')
      })
      
      await user.click(nextButton)
      await waitFor(() => {
        progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '100')
      })
    })
  })
})