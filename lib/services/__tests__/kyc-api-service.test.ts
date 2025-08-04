import { KYCAPIService } from '../kyc-api-service'
import { apiClient } from '@/services/api-client'

// Mock the API client
jest.mock('@/services/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn()
  }
}))

describe('KYCAPIService', () => {
  let kycAPI: KYCAPIService
  
  beforeEach(() => {
    jest.clearAllMocks()
    kycAPI = new KYCAPIService()
  })

  describe('startSession', () => {
    it('should start a KYC session with required level', async () => {
      const mockResponse = {
        data: {
          success: true,
          session: {
            sessionId: 'test-session-123',
            expiresAt: '2024-12-31T23:59:59Z',
            requiredLevel: 'basic'
          }
        }
      }
      
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.startSession('basic')
      
      expect(apiClient.post).toHaveBeenCalledWith('/kyc/session/start', {
        requiredLevel: 'basic'
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle session start error', async () => {
      const mockError = new Error('Session creation failed')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)
      
      await expect(kycAPI.startSession()).rejects.toThrow('Session creation failed')
    })
  })

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const sessionId = 'test-session-123'
      const documentType = 'passport'
      
      const mockResponse = {
        data: {
          success: true,
          result: {
            documentId: 'doc-123',
            verificationStatus: 'processing',
            extractedData: {
              firstName: 'John',
              lastName: 'Doe',
              documentNumber: 'P123456',
              expiryDate: '2030-01-01'
            }
          }
        }
      }
      
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.uploadDocument(sessionId, documentType, mockFile)
      
      expect(apiClient.post).toHaveBeenCalledWith(
        '/kyc/document/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      
      // Verify FormData contents
      const formDataCall = (apiClient.post as jest.Mock).mock.calls[0][1]
      expect(formDataCall).toBeInstanceOf(FormData)
      
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle upload failure', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockError = new Error('Upload failed')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)
      
      await expect(kycAPI.uploadDocument('session-123', 'passport', mockFile))
        .rejects.toThrow('Upload failed')
    })
  })

  describe('performLivenessCheck', () => {
    it('should perform liveness check successfully', async () => {
      const sessionId = 'test-session-123'
      const imageData = 'data:image/png;base64,iVBORw0KGgo='
      
      const mockResponse = {
        data: {
          success: true,
          result: {
            isLive: true,
            confidence: 0.98,
            selfieUrl: 'https://storage.example.com/selfie-123.jpg'
          }
        }
      }
      
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.performLivenessCheck(sessionId, imageData)
      
      expect(apiClient.post).toHaveBeenCalledWith('/kyc/liveness/check', {
        sessionId,
        imageData
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle liveness check failure', async () => {
      const mockError = new Error('Liveness check failed')
      ;(apiClient.post as jest.Mock).mockRejectedValue(mockError)
      
      await expect(kycAPI.performLivenessCheck('session-123', 'image-data'))
        .rejects.toThrow('Liveness check failed')
    })
  })

  describe('getStatus', () => {
    it('should get KYC status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          status: {
            level: 'basic',
            status: 'approved',
            lastUpdated: '2024-01-15T10:00:00Z',
            expiryDate: '2025-01-15T10:00:00Z',
            reviewRequired: false,
            completedSteps: ['personal_info', 'document_upload', 'liveness_check']
          }
        }
      }
      
      ;(apiClient.get as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.getStatus()
      
      expect(apiClient.get).toHaveBeenCalledWith('/kyc/status')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('submitPersonalInfo', () => {
    it('should submit personal info successfully', async () => {
      const personalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        countryOfResidence: 'US',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        occupation: 'Software Engineer'
      }
      
      const mockResponse = {
        data: {
          success: true,
          message: 'Personal information saved successfully'
        }
      }
      
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.submitPersonalInfo(personalInfo)
      
      expect(apiClient.post).toHaveBeenCalledWith('/kyc/personal', personalInfo)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('completeSession', () => {
    it('should complete session successfully', async () => {
      const sessionId = 'test-session-123'
      
      const mockResponse = {
        data: {
          success: true,
          message: 'KYC session completed successfully',
          nextSteps: ['Wait for review', 'Check email for updates']
        }
      }
      
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.completeSession(sessionId)
      
      expect(apiClient.post).toHaveBeenCalledWith('/kyc/session/complete', {
        sessionId
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Admin Methods', () => {
    it('should get pending reviews', async () => {
      const mockResponse = {
        data: {
          success: true,
          reviews: [
            {
              userId: 'user-123',
              sessionId: 'session-123',
              status: 'pending_review',
              submittedAt: '2024-01-15T10:00:00Z'
            }
          ]
        }
      }
      
      ;(apiClient.get as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.getPendingReviews()
      
      expect(apiClient.get).toHaveBeenCalledWith('/kyc/admin/pending-reviews')
      expect(result).toEqual(mockResponse.data)
    })

    it('should submit manual review', async () => {
      const sessionId = 'test-session-123'
      const reviewData = {
        decision: 'approved' as const,
        notes: 'All documents verified',
        riskLevel: 'low' as const
      }
      
      const mockResponse = {
        data: {
          success: true,
          message: 'Review submitted successfully'
        }
      }
      
      ;(apiClient.put as jest.Mock).mockResolvedValue(mockResponse)
      
      const result = await kycAPI.submitManualReview(sessionId, reviewData)
      
      expect(apiClient.put).toHaveBeenCalledWith('/kyc/admin/manual-review', {
        sessionId,
        ...reviewData
      })
      expect(result).toEqual(mockResponse.data)
    })
  })
})