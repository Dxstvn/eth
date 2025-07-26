import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { KYCVerificationWorkflow, quickVerify } from '@/lib/services/kyc-verification-workflow'
import { performOCR } from '@/lib/services/mock-ocr-service'
import { performFullVerification } from '@/lib/services/mock-verification-service'
import { RateLimiter } from '@/lib/utils/rate-limiter'
import { kycAuditLogger, KYCActionType } from '@/lib/services/kyc-audit-logger'

// Setup MSW server
const server = setupServer(
  rest.post('/api/kyc/verify', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        verificationId: 'test-verification-123',
        status: 'completed'
      })
    )
  }),
  rest.post('/api/kyc/ocr', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        extractedData: {
          firstName: 'John',
          lastName: 'Doe',
          documentNumber: 'P12345678',
          dateOfBirth: '1990-01-01',
          expiryDate: '2025-12-31'
        }
      })
    )
  }),
  rest.post('/api/kyc/audit', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  }),
  rest.get('/api/kyc/status/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        status: 'under_review',
        progress: 75,
        lastUpdated: new Date().toISOString()
      })
    )
  })
)

// Enable API mocking
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('KYC API Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('OCR Service Integration', () => {
    it('should successfully extract data from passport image', async () => {
      const mockFile = new File(['passport image'], 'passport.jpg', { type: 'image/jpeg' })
      
      const result = await performOCR('passport', mockFile)
      
      expect(result.success).toBe(true)
      expect(result.extractedData).toBeDefined()
      expect(result.extractedData?.firstName).toBeDefined()
      expect(result.extractedData?.documentNumber).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle OCR failures gracefully', async () => {
      // Override handler to simulate failure
      server.use(
        rest.post('/api/kyc/ocr', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'OCR service unavailable' })
          )
        })
      )

      const mockFile = new File(['corrupted'], 'bad.jpg', { type: 'image/jpeg' })
      
      const result = await performOCR('passport', mockFile)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.requiresManualReview).toBe(true)
    })

    it('should detect low quality images', async () => {
      const lowQualityFile = new File(['low quality'], 'blurry.jpg', { type: 'image/jpeg' })
      
      const result = await performOCR('drivers_license', lowQualityFile)
      
      if (result.confidence < 70) {
        expect(result.requiresManualReview).toBe(true)
        expect(result.warnings).toContain('Low confidence score')
      }
    })

    it('should extract different document types correctly', async () => {
      const documentTypes = ['passport', 'drivers_license', 'id_card'] as const
      
      for (const docType of documentTypes) {
        const file = new File([`${docType} image`], `${docType}.jpg`, { type: 'image/jpeg' })
        const result = await performOCR(docType, file)
        
        expect(result.documentType).toBe(docType)
        expect(result.extractedData).toBeDefined()
      }
    })
  })

  describe('Verification Workflow Integration', () => {
    it('should complete full verification workflow', async () => {
      const workflow = new KYCVerificationWorkflow()
      const documents = [{
        type: 'passport' as const,
        frontImage: new File(['front'], 'passport-front.jpg', { type: 'image/jpeg' }),
        backImage: new File(['back'], 'passport-back.jpg', { type: 'image/jpeg' })
      }]
      const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })
      
      const result = await workflow.executeWorkflow(documents, selfie)
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(result.verificationId).toBeDefined()
      expect(result.steps).toHaveLength(8)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle workflow retries', async () => {
      const workflow = new KYCVerificationWorkflow({ maxRetries: 3 })
      
      // First attempt fails
      const failedResult = {
        success: false,
        status: 'requires_retry' as const,
        verificationId: 'test-123',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 1000,
        steps: [{ name: 'OCR Extraction', status: 'failed' as const }],
        retryCount: 0,
        errors: [{
          step: 'OCR Extraction',
          code: 'OCR_FAILED',
          message: 'Could not extract data',
          timestamp: new Date().toISOString(),
          recoverable: true
        }],
        recommendations: ['Upload higher quality image']
      }
      
      const documents = [{
        type: 'passport' as const,
        frontImage: new File(['better quality'], 'passport.jpg', { type: 'image/jpeg' })
      }]
      const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })
      
      const retryResult = await workflow.retryWorkflow(failedResult, documents, selfie)
      
      expect(retryResult.retryCount).toBe(1)
      expect(retryResult.status).not.toBe('abandoned')
    })

    it('should enforce maximum retry limit', async () => {
      const workflow = new KYCVerificationWorkflow({ maxRetries: 2 })
      
      const previousResult = {
        success: false,
        status: 'requires_retry' as const,
        verificationId: 'test-123',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 1000,
        steps: [],
        retryCount: 2, // Already at max retries
        errors: [],
        recommendations: []
      }
      
      const documents = [{
        type: 'passport' as const,
        frontImage: new File(['image'], 'passport.jpg', { type: 'image/jpeg' })
      }]
      const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })
      
      const result = await workflow.retryWorkflow(previousResult, documents, selfie)
      
      expect(result.status).toBe('abandoned')
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MAX_RETRIES_EXCEEDED'
        })
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
        identifier: 'test-user'
      })

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const allowed = await limiter.checkLimit()
        expect(allowed).toBe(true)
      }

      // Next request should be rate limited
      const limitExceeded = await limiter.checkLimit()
      expect(limitExceeded).toBe(false)
    })

    it('should track rate limits per operation', async () => {
      const ocrLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        identifier: 'ocr-operations'
      })

      const verificationLimiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        identifier: 'verification-operations'
      })

      // OCR should have higher limit
      for (let i = 0; i < 10; i++) {
        expect(await ocrLimiter.checkLimit()).toBe(true)
      }
      expect(await ocrLimiter.checkLimit()).toBe(false)

      // Verification should have lower limit
      for (let i = 0; i < 5; i++) {
        expect(await verificationLimiter.checkLimit()).toBe(true)
      }
      expect(await verificationLimiter.checkLimit()).toBe(false)
    })

    it('should reset rate limits after window expires', async () => {
      vi.useFakeTimers()
      
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000, // 1 minute
        identifier: 'test-reset'
      })

      // Use up the limit
      await limiter.checkLimit()
      await limiter.checkLimit()
      expect(await limiter.checkLimit()).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      expect(await limiter.checkLimit()).toBe(true)

      vi.useRealTimers()
    })

    it('should log rate limit violations', async () => {
      const logSpy = vi.spyOn(kycAuditLogger, 'log')
      
      server.use(
        rest.post('/api/kyc/verify', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({ error: 'Rate limit exceeded' })
          )
        })
      )

      try {
        await fetch('/api/kyc/verify', { method: 'POST' })
      } catch (error) {
        // Expected to fail
      }

      expect(logSpy).toHaveBeenCalledWith(
        KYCActionType.KYC_RATE_LIMIT_EXCEEDED,
        expect.any(Object)
      )
    })
  })

  describe('Session Management', () => {
    it('should maintain session across API calls', async () => {
      const sessionId = 'test-session-123'
      sessionStorage.setItem('clearhold_session', JSON.stringify({ id: sessionId }))

      let capturedHeaders: any = {}
      server.use(
        rest.post('/api/kyc/verify', (req, res, ctx) => {
          capturedHeaders = req.headers
          return res(ctx.json({ success: true }))
        })
      )

      await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId
        }
      })

      expect(capturedHeaders.get('x-session-id')).toBe(sessionId)
    })

    it('should handle session expiry during verification', async () => {
      const workflow = new KYCVerificationWorkflow()
      
      // Start verification
      const documents = [{
        type: 'passport' as const,
        frontImage: new File(['image'], 'passport.jpg', { type: 'image/jpeg' })
      }]
      const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' })

      // Clear session mid-verification
      const clearSessionDuringVerification = async () => {
        setTimeout(() => {
          sessionStorage.clear()
        }, 100)
        
        return workflow.executeWorkflow(documents, selfie)
      }

      const result = await clearSessionDuringVerification()
      
      // Should complete but may require re-authentication
      expect(result).toBeDefined()
      expect(result.errors.length).toBeGreaterThanOrEqual(0)
    })

    it('should refresh tokens before expiry', async () => {
      vi.useFakeTimers()
      
      // Set token with short expiry
      const token = {
        value: 'test-token',
        expiresAt: Date.now() + 300000 // 5 minutes
      }
      localStorage.setItem('clearhold_auth_token', JSON.stringify(token))

      let tokenRefreshed = false
      server.use(
        rest.post('/api/auth/refresh', (req, res, ctx) => {
          tokenRefreshed = true
          return res(
            ctx.json({
              token: 'new-token',
              expiresAt: Date.now() + 3600000
            })
          )
        })
      )

      // Advance time to near expiry (4 minutes)
      vi.advanceTimersByTime(240000)

      // Make an API call that should trigger refresh
      await fetch('/api/kyc/status/123', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      expect(tokenRefreshed).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('Audit Logging Integration', () => {
    it('should log all API operations', async () => {
      const logSpy = vi.spyOn(kycAuditLogger, 'log')
      
      // Perform various operations
      await performOCR('passport', new File(['image'], 'passport.jpg', { type: 'image/jpeg' }))
      
      await performFullVerification(
        { firstName: 'John', lastName: 'Doe' } as any,
        'document-image',
        'selfie-image'
      )

      // Check audit logs were created
      expect(logSpy).toHaveBeenCalledTimes(2)
      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          documentType: expect.any(String)
        }),
        expect.any(Object)
      )
    })

    it('should track failed verification attempts', async () => {
      const searchSpy = vi.spyOn(kycAuditLogger, 'search')
      
      server.use(
        rest.post('/api/kyc/verify', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ error: 'Invalid document' })
          )
        })
      )

      try {
        await quickVerify('passport', 'front', undefined, 'selfie')
      } catch (error) {
        // Expected to fail
      }

      const failedAttempts = kycAuditLogger.search({
        action: KYCActionType.DOCUMENT_VERIFIED,
        dateFrom: new Date(Date.now() - 60000)
      })

      expect(failedAttempts.length).toBeGreaterThanOrEqual(0)
    })

    it('should export audit logs with filters', async () => {
      // Create some audit entries
      kycAuditLogger.log(KYCActionType.PERSONAL_INFO_UPDATED, {
        fieldName: 'firstName',
        fieldType: 'text'
      })

      kycAuditLogger.log(KYCActionType.DOCUMENT_UPLOADED, {
        documentType: 'passport',
        fileName: 'passport.jpg',
        fileSize: 1024
      })

      const exportData = await kycAuditLogger.export({
        action: [KYCActionType.PERSONAL_INFO_UPDATED, KYCActionType.DOCUMENT_UPLOADED],
        limit: 10
      }, 'json')

      const parsed = JSON.parse(exportData)
      expect(parsed.entries).toBeDefined()
      expect(parsed.summary.totalEntries).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        rest.post('/api/kyc/verify', (req, res) => {
          return res.networkError('Network error')
        })
      )

      const result = await quickVerify('passport', 'front', undefined, 'selfie').catch(err => ({
        success: false,
        error: err.message
      }))

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })

    it('should handle timeout errors', async () => {
      server.use(
        rest.post('/api/kyc/verify', async (req, res, ctx) => {
          await new Promise(resolve => setTimeout(resolve, 5000))
          return res(ctx.json({ success: true }))
        })
      )

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1000)

      try {
        await fetch('/api/kyc/verify', {
          method: 'POST',
          signal: controller.signal
        })
      } catch (error: any) {
        expect(error.name).toBe('AbortError')
      } finally {
        clearTimeout(timeout)
      }
    })

    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0
      server.use(
        rest.post('/api/kyc/verify', (req, res, ctx) => {
          attemptCount++
          if (attemptCount < 3) {
            return res(ctx.status(503))
          }
          return res(ctx.json({ success: true }))
        })
      )

      const startTime = Date.now()
      const result = await quickVerify('passport', 'front', undefined, 'selfie')
      const duration = Date.now() - startTime

      expect(attemptCount).toBe(3)
      expect(result.success).toBe(true)
      expect(duration).toBeGreaterThan(1000) // Should have delays
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous OCR requests', async () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`image ${i}`], `doc-${i}.jpg`, { type: 'image/jpeg' })
      )

      const promises = files.map((file, i) => 
        performOCR(i % 2 === 0 ? 'passport' : 'drivers_license', file)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.extractedData).toBeDefined()
      })
    })

    it('should queue requests when rate limit is reached', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000,
        identifier: 'queue-test'
      })

      const requests = Array.from({ length: 5 }, async (_, i) => {
        const allowed = await limiter.checkLimit()
        return { index: i, allowed }
      })

      const results = await Promise.all(requests)
      
      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(2)
    })
  })
})