import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { KYCProvider } from '@/context/kyc-context'
import { AuthProvider } from '@/context/auth-context-v2'
import { kycAPI } from '@/lib/services/kyc-api-service'
import KYCDocumentsPage from '@/app/(onboarding)/onboarding/kyc-documents/page'
import KYCSelfie from '@/app/(onboarding)/onboarding/kyc-selfie/page'
import CompletePage from '@/app/(onboarding)/onboarding/complete/page'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn()
}))

vi.mock('@/lib/services/kyc-api-service', () => ({
  kycAPI: {
    startSession: vi.fn(),
    uploadDocument: vi.fn(),
    performLivenessCheck: vi.fn(),
    completeSession: vi.fn(),
    getStatus: vi.fn()
  }
}))

// Mock components that aren't part of the test
vi.mock('@/components/kyc/steps/DocumentUploadStep', () => ({
  DocumentUploadStep: ({ onComplete, initialDocuments }: any) => (
    <div data-testid="document-upload-step">
      <button onClick={() => onComplete({ passport_front: { file: new File(['test'], 'passport.jpg') } })}>
        Upload Document
      </button>
    </div>
  )
}))

vi.mock('@/components/kyc/steps/LivenessCheckStep', () => ({
  LivenessCheckStep: ({ onComplete }: any) => (
    <div data-testid="liveness-check-step">
      <button onClick={() => onComplete({ capturedImage: 'data:image/png;base64,test' })}>
        Complete Liveness Check
      </button>
    </div>
  )
}))

// Mock canvas confetti
vi.mock('canvas-confetti', () => ({
  __esModule: true,
  default: vi.fn()
}))

describe('KYC Backend Integration Flow', () => {
  const mockPush = vi.fn()
  const mockUpdateProfile = vi.fn()
  
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <KYCProvider>
        {children}
      </KYCProvider>
    </AuthProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    
    // Mock successful auth context
    vi.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
      user: { 
        id: 'test-user',
        email: 'test@example.com',
        hasCompletedOnboarding: false
      },
      authToken: 'test-token',
      updateProfile: mockUpdateProfile
    })
  })

  describe('Document Upload Flow', () => {
    it('should complete document upload flow with backend', async () => {
      // Mock successful API responses
      ;(kycAPI.startSession as any).mockResolvedValue({
        success: true,
        session: {
          sessionId: 'test-session-123',
          expiresAt: '2024-12-31T23:59:59Z'
        }
      })

      ;(kycAPI.uploadDocument as any).mockResolvedValue({
        success: true,
        result: {
          documentId: 'doc-123',
          extractedData: {
            firstName: 'John',
            lastName: 'Doe',
            documentNumber: 'P123456'
          }
        }
      })

      render(
        <TestWrapper>
          <KYCDocumentsPage />
        </TestWrapper>
      )

      // Wait for session to start
      await waitFor(() => {
        expect(kycAPI.startSession).toHaveBeenCalledWith('basic')
      })

      // Click upload document button
      const uploadButton = screen.getByText('Upload Document')
      await userEvent.click(uploadButton)

      // Verify document upload was called
      await waitFor(() => {
        expect(kycAPI.uploadDocument).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/onboarding/kyc-selfie')
      })
    })

    it('should handle document upload errors', async () => {
      ;(kycAPI.startSession as any).mockResolvedValue({
        success: true,
        session: { sessionId: 'test-session-123' }
      })

      ;(kycAPI.uploadDocument as any).mockRejectedValue(
        new Error('Document verification failed')
      )

      render(
        <TestWrapper>
          <KYCDocumentsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('document-upload-step')).toBeInTheDocument()
      })

      const uploadButton = screen.getByText('Upload Document')
      await userEvent.click(uploadButton)

      // Should not navigate on error
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('Facial Verification Flow', () => {
    beforeEach(() => {
      // Set up KYC context with session
      vi.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { 
          sessionId: 'test-session-123',
          status: 'in_progress'
        },
        performLivenessCheck: vi.fn().mockResolvedValue(true),
        completeKYCSession: vi.fn().mockResolvedValue(true),
        isLoading: false
      })
    })

    it('should complete facial verification flow', async () => {
      render(
        <TestWrapper>
          <KYCSelfie />
        </TestWrapper>
      )

      // Click complete liveness check
      const livenessButton = screen.getByText('Complete Liveness Check')
      await userEvent.click(livenessButton)

      // Verify navigation to complete page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/complete')
      })
    })

    it('should handle liveness check failure', async () => {
      const mockPerformLivenessCheck = vi.fn().mockRejectedValue(
        new Error('Liveness check failed')
      )
      
      vi.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { sessionId: 'test-session-123' },
        performLivenessCheck: mockPerformLivenessCheck,
        completeKYCSession: vi.fn(),
        isLoading: false
      })

      render(
        <TestWrapper>
          <KYCSelfie />
        </TestWrapper>
      )

      const livenessButton = screen.getByText('Complete Liveness Check')
      await userEvent.click(livenessButton)

      // Should not navigate on error
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('Completion Flow', () => {
    it('should complete onboarding and update profile', async () => {
      vi.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { 
          status: 'approved',
          kycLevel: 'basic'
        },
        refreshKYCStatus: vi.fn(),
        isLoading: false
      })

      render(
        <TestWrapper>
          <CompletePage />
        </TestWrapper>
      )

      // Wait for completion page to render
      await waitFor(() => {
        expect(screen.getByText('Welcome to ClearHold!')).toBeInTheDocument()
      })

      // Click go to dashboard
      const dashboardButton = screen.getByText('Go to Dashboard')
      await userEvent.click(dashboardButton)

      // Verify profile update
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: expect.any(String)
        })
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show under review status', async () => {
      vi.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { 
          status: 'under_review'
        },
        refreshKYCStatus: vi.fn(),
        isLoading: false
      })

      render(
        <TestWrapper>
          <CompletePage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Verification In Progress')).toBeInTheDocument()
        expect(screen.getByText(/being reviewed/)).toBeInTheDocument()
      })
    })
  })

  describe('End-to-End KYC Flow', () => {
    it('should complete full KYC flow from start to finish', async () => {
      // Mock all successful API calls
      ;(kycAPI.startSession as any).mockResolvedValue({
        success: true,
        session: { sessionId: 'test-session-123' }
      })

      ;(kycAPI.uploadDocument as any).mockResolvedValue({
        success: true,
        result: { documentId: 'doc-123' }
      })

      ;(kycAPI.performLivenessCheck as any).mockResolvedValue({
        success: true,
        result: { isLive: true, confidence: 0.98 }
      })

      ;(kycAPI.completeSession as any).mockResolvedValue({
        success: true,
        message: 'Session completed'
      })

      ;(kycAPI.getStatus as any).mockResolvedValue({
        success: true,
        status: {
          level: 'basic',
          status: 'approved',
          completedSteps: ['personal_info', 'document_upload', 'liveness_check']
        }
      })

      // Simulate the full flow programmatically
      const { rerender } = render(
        <TestWrapper>
          <KYCDocumentsPage />
        </TestWrapper>
      )

      // Step 1: Document upload
      await waitFor(() => {
        expect(kycAPI.startSession).toHaveBeenCalled()
      })

      // Simulate document upload completion
      const uploadButton = screen.getByText('Upload Document')
      await userEvent.click(uploadButton)

      // Step 2: Navigate to selfie page
      rerender(
        <TestWrapper>
          <KYCSelfie />
        </TestWrapper>
      )

      // Complete liveness check
      const livenessButton = screen.getByText('Complete Liveness Check')
      await userEvent.click(livenessButton)

      // Step 3: Navigate to completion
      rerender(
        <TestWrapper>
          <CompletePage />
        </TestWrapper>
      )

      // Verify all API calls were made
      expect(kycAPI.startSession).toHaveBeenCalled()
      expect(kycAPI.uploadDocument).toHaveBeenCalled()
      expect(kycAPI.performLivenessCheck).toHaveBeenCalled()
      expect(kycAPI.completeSession).toHaveBeenCalled()
      expect(kycAPI.getStatus).toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    it('should handle session expiry gracefully', async () => {
      ;(kycAPI.startSession as any).mockResolvedValue({
        success: true,
        session: { 
          sessionId: 'test-session-123',
          expiresAt: new Date(Date.now() - 1000).toISOString() // Expired
        }
      })

      render(
        <TestWrapper>
          <KYCDocumentsPage />
        </TestWrapper>
      )

      // Should attempt to start a new session
      await waitFor(() => {
        expect(kycAPI.startSession).toHaveBeenCalled()
      })
    })

    it('should retry on network errors', async () => {
      // First call fails, second succeeds
      ;(kycAPI.getStatus as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          status: { level: 'basic', status: 'approved' }
        })

      vi.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: {},
        refreshKYCStatus: kycAPI.getStatus,
        isLoading: false
      })

      render(
        <TestWrapper>
          <CompletePage />
        </TestWrapper>
      )

      // Should retry and eventually succeed
      await waitFor(() => {
        expect(kycAPI.getStatus).toHaveBeenCalledTimes(2)
      })
    })
  })
})