import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { KYCProvider, useKYC } from '../kyc-context'
import { useAuth } from '../auth-context-v2'
import { kycAPI } from '@/lib/services/kyc-api-service'

// Mock dependencies
jest.mock('../auth-context-v2', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/lib/services/kyc-api-service', () => ({
  kycAPI: {
    startSession: jest.fn(),
    uploadDocument: jest.fn(),
    performLivenessCheck: jest.fn(),
    completeSession: jest.fn(),
    getStatus: jest.fn(),
    submitPersonalInfo: jest.fn()
  }
}))

describe('KYCContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KYCProvider>{children}</KYCProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-123' },
      authToken: 'test-token'
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      expect(result.current.kycData).toEqual({
        status: 'not_started',
        completedSteps: [],
        currentStep: 0
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('updatePersonalInfo', () => {
    it('should update personal info', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.updatePersonalInfo({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        })
      })

      expect(result.current.kycData.personalInfo).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
      expect(result.current.kycData.status).toBe('in_progress')
    })
  })

  describe('updateDocumentInfo', () => {
    it('should update document info', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.updateDocumentInfo({
          idType: 'passport',
          idNumber: 'P123456'
        })
      })

      expect(result.current.kycData.documentInfo).toEqual({
        idType: 'passport',
        idNumber: 'P123456'
      })
      expect(result.current.kycData.status).toBe('in_progress')
    })
  })

  describe('markStepCompleted', () => {
    it('should mark step as completed', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.markStepCompleted('personal_info')
      })

      expect(result.current.kycData.completedSteps).toContain('personal_info')
    })

    it('should not duplicate completed steps', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.markStepCompleted('personal_info')
        result.current.markStepCompleted('personal_info')
      })

      expect(result.current.kycData.completedSteps).toEqual(['personal_info'])
    })
  })

  describe('startKYCSession', () => {
    it('should start KYC session successfully', async () => {
      const mockSessionResponse = {
        success: true,
        session: {
          sessionId: 'test-session-123',
          expiresAt: '2024-12-31T23:59:59Z'
        }
      }

      ;(kycAPI.startSession as jest.Mock).mockResolvedValue(mockSessionResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      await act(async () => {
        await result.current.startKYCSession('basic')
      })

      expect(kycAPI.startSession).toHaveBeenCalledWith('basic')
      expect(result.current.kycData.sessionId).toBe('test-session-123')
      expect(result.current.kycData.status).toBe('in_progress')
    })

    it('should handle session start error', async () => {
      const mockError = new Error('Failed to start session')
      ;(kycAPI.startSession as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useKYC(), { wrapper })

      await expect(
        act(async () => {
          await result.current.startKYCSession()
        })
      ).rejects.toThrow('Failed to start session')

      expect(result.current.error).toBe('Failed to start session')
    })
  })

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockUploadResponse = {
        success: true,
        result: {
          documentId: 'doc-123',
          extractedData: {
            firstName: 'John',
            lastName: 'Doe',
            documentNumber: 'P123456',
            expiryDate: '2030-01-01'
          }
        }
      }

      ;(kycAPI.uploadDocument as jest.Mock).mockResolvedValue(mockUploadResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      // Set session ID first
      act(() => {
        result.current.kycData.sessionId = 'test-session-123'
      })

      await act(async () => {
        await result.current.uploadDocument('passport', mockFile)
      })

      expect(kycAPI.uploadDocument).toHaveBeenCalledWith('test-session-123', 'passport', mockFile)
      expect(result.current.kycData.personalInfo?.firstName).toBe('John')
      expect(result.current.kycData.documentInfo?.idNumber).toBe('P123456')
      expect(result.current.kycData.completedSteps).toContain('document_upload')
    })

    it('should throw error if no session', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const { result } = renderHook(() => useKYC(), { wrapper })

      await expect(
        act(async () => {
          await result.current.uploadDocument('passport', mockFile)
        })
      ).rejects.toThrow('No active KYC session')
    })
  })

  describe('performLivenessCheck', () => {
    it('should perform liveness check successfully', async () => {
      const imageData = 'data:image/png;base64,test'
      const mockLivenessResponse = {
        success: true,
        result: {
          isLive: true,
          confidence: 0.98,
          selfieUrl: 'https://storage.example.com/selfie-123.jpg'
        }
      }

      ;(kycAPI.performLivenessCheck as jest.Mock).mockResolvedValue(mockLivenessResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      // Set session ID first
      act(() => {
        result.current.kycData.sessionId = 'test-session-123'
      })

      await act(async () => {
        await result.current.performLivenessCheck(imageData)
      })

      expect(kycAPI.performLivenessCheck).toHaveBeenCalledWith('test-session-123', imageData)
      expect(result.current.kycData.facialVerificationStatus).toBe('passed')
      expect(result.current.kycData.completedSteps).toContain('liveness_check')
    })

    it('should handle failed liveness check', async () => {
      const imageData = 'data:image/png;base64,test'
      const mockLivenessResponse = {
        success: true,
        result: {
          isLive: false,
          confidence: 0.3
        }
      }

      ;(kycAPI.performLivenessCheck as jest.Mock).mockResolvedValue(mockLivenessResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.kycData.sessionId = 'test-session-123'
      })

      await act(async () => {
        await result.current.performLivenessCheck(imageData)
      })

      expect(result.current.kycData.facialVerificationStatus).toBe('failed')
      expect(result.current.kycData.completedSteps).not.toContain('liveness_check')
    })
  })

  describe('completeKYCSession', () => {
    it('should complete session successfully', async () => {
      const mockCompleteResponse = {
        success: true,
        message: 'Session completed'
      }

      ;(kycAPI.completeSession as jest.Mock).mockResolvedValue(mockCompleteResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      act(() => {
        result.current.kycData.sessionId = 'test-session-123'
      })

      await act(async () => {
        await result.current.completeKYCSession()
      })

      expect(kycAPI.completeSession).toHaveBeenCalledWith('test-session-123')
      expect(result.current.kycData.status).toBe('under_review')
      expect(result.current.kycData.submittedAt).toBeDefined()
    })
  })

  describe('refreshKYCStatus', () => {
    it('should refresh status successfully', async () => {
      const mockStatusResponse = {
        success: true,
        status: {
          level: 'basic',
          status: 'approved',
          expiryDate: '2025-01-01',
          completedSteps: ['personal_info', 'document_upload'],
          riskProfile: {
            overallRisk: 'low'
          }
        }
      }

      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue(mockStatusResponse)

      const { result } = renderHook(() => useKYC(), { wrapper })

      await act(async () => {
        await result.current.refreshKYCStatus()
      })

      expect(kycAPI.getStatus).toHaveBeenCalled()
      expect(result.current.kycData.status).toBe('approved')
      expect(result.current.kycData.kycLevel).toBe('basic')
      expect(result.current.kycData.riskScore).toBe('low')
    })
  })

  describe('Auto-refresh on mount', () => {
    it('should refresh status on mount when user exists', async () => {
      const mockStatusResponse = {
        success: true,
        status: {
          level: 'basic',
          status: 'approved'
        }
      }

      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue(mockStatusResponse)

      renderHook(() => useKYC(), { wrapper })

      await waitFor(() => {
        expect(kycAPI.getStatus).toHaveBeenCalled()
      })
    })

    it('should not refresh status when no user', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        authToken: null
      })

      renderHook(() => useKYC(), { wrapper })

      await waitFor(() => {
        expect(kycAPI.getStatus).not.toHaveBeenCalled()
      })
    })
  })

  describe('resetKYC', () => {
    it('should reset KYC data to initial state', () => {
      const { result } = renderHook(() => useKYC(), { wrapper })

      // First, modify some data
      act(() => {
        result.current.updatePersonalInfo({ firstName: 'John' })
        result.current.kycData.sessionId = 'test-123'
      })

      // Then reset
      act(() => {
        result.current.resetKYC()
      })

      expect(result.current.kycData).toEqual({
        status: 'not_started',
        completedSteps: [],
        currentStep: 0
      })
      expect(result.current.error).toBeNull()
    })
  })
})