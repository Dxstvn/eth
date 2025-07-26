import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { KYCEncryption } from '@/lib/security/kyc-encryption'
import { SecureStorage } from '@/lib/security/secure-storage'
import { SecurityMonitor } from '@/lib/security/security-monitoring'
import { CSRFProtection } from '@/lib/security/csrf-protection'
import { RateLimiter } from '@/lib/utils/rate-limiter'
import { kycAuditLogger, KYCActionType } from '@/lib/services/kyc-audit-logger'
import { SecureKYCForm } from '@/components/kyc/secure-kyc-form.example'
import { SecureFileUpload } from '@/components/kyc/secure-file-upload'
import { KYCProvider } from '@/context/kyc-context'

// Mock crypto functions
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  },
  subtle: {
    generateKey: vi.fn().mockResolvedValue({
      privateKey: 'mock-private-key',
      publicKey: 'mock-public-key'
    }),
    encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    importKey: vi.fn().mockResolvedValue('mock-key'),
    exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
  }
}

Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
  writable: true
})

// Setup MSW server for security testing
const server = setupServer(
  rest.post('/api/kyc/secure-upload', (req, res, ctx) => {
    const csrfToken = req.headers.get('X-CSRF-Token')
    if (!csrfToken) {
      return res(ctx.status(403), ctx.json({ error: 'CSRF token missing' }))
    }
    return res(ctx.json({ success: true, fileId: 'secure-file-123' }))
  }),
  rest.post('/api/kyc/verify-identity', (req, res, ctx) => {
    // Simulate rate limiting
    const rateLimitRemaining = req.headers.get('X-RateLimit-Remaining')
    if (rateLimitRemaining === '0') {
      return res(
        ctx.status(429),
        ctx.json({ error: 'Rate limit exceeded' }),
        ctx.set('X-RateLimit-Remaining', '0'),
        ctx.set('X-RateLimit-Reset', String(Date.now() + 60000))
      )
    }
    return res(ctx.json({ verified: true }))
  }),
  rest.get('/api/security/csrf-token', (req, res, ctx) => {
    return res(ctx.json({ token: 'test-csrf-token-123' }))
  }),
  rest.post('/api/security/report-incident', (req, res, ctx) => {
    return res(ctx.json({ reported: true, incidentId: 'inc-123' }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('KYC Security Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Encryption/Decryption', () => {
    it('should encrypt sensitive KYC data before storage', async () => {
      const encryption = new KYCEncryption()
      await encryption.initialize()

      const sensitiveData = {
        ssn: '123-45-6789',
        dateOfBirth: '1990-01-01',
        idNumber: 'P12345678'
      }

      const encrypted = await encryption.encryptData(sensitiveData)
      
      expect(encrypted.encryptedData).toBeDefined()
      expect(encrypted.encryptedData).not.toContain('123-45-6789')
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.salt).toBeDefined()
    })

    it('should decrypt data correctly with valid key', async () => {
      const encryption = new KYCEncryption()
      await encryption.initialize()

      const originalData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }

      const encrypted = await encryption.encryptData(originalData)
      const decrypted = await encryption.decryptData(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.salt
      )

      expect(decrypted).toEqual(originalData)
    })

    it('should fail decryption with wrong key', async () => {
      const encryption1 = new KYCEncryption()
      const encryption2 = new KYCEncryption()
      
      await encryption1.initialize()
      await encryption2.initialize()

      const data = { secret: 'test-data' }
      const encrypted = await encryption1.encryptData(data)

      // Try to decrypt with different instance (different key)
      await expect(
        encryption2.decryptData(encrypted.encryptedData, encrypted.iv, encrypted.salt)
      ).rejects.toThrow()
    })

    it('should rotate encryption keys periodically', async () => {
      vi.useFakeTimers()
      
      const encryption = new KYCEncryption()
      await encryption.initialize()

      const initialKeyId = encryption.getCurrentKeyId()

      // Advance time by 30 days (typical key rotation period)
      vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000)

      await encryption.rotateKeys()
      const newKeyId = encryption.getCurrentKeyId()

      expect(newKeyId).not.toBe(initialKeyId)

      vi.useRealTimers()
    })
  })

  describe('Secure Storage', () => {
    it('should store encrypted data with integrity check', async () => {
      const storage = new SecureStorage()
      
      const data = {
        kycId: 'kyc-001',
        status: 'pending',
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com'
        }
      }

      await storage.setItem('kyc-data', data)
      
      // Verify stored data is encrypted
      const rawData = localStorage.getItem('secure_kyc-data')
      expect(rawData).toBeDefined()
      expect(rawData).not.toContain('Test User')
      expect(rawData).not.toContain('test@example.com')
    })

    it('should verify data integrity on retrieval', async () => {
      const storage = new SecureStorage()
      
      const originalData = { id: '123', value: 'test' }
      await storage.setItem('test-item', originalData)

      // Tamper with stored data
      const storedKey = 'secure_test-item'
      const tamperedData = localStorage.getItem(storedKey)
      if (tamperedData) {
        const parsed = JSON.parse(tamperedData)
        parsed.data = 'tampered'
        localStorage.setItem(storedKey, JSON.stringify(parsed))
      }

      // Should detect tampering
      await expect(storage.getItem('test-item')).rejects.toThrow(/integrity/i)
    })

    it('should auto-expire sensitive data', async () => {
      vi.useFakeTimers()
      
      const storage = new SecureStorage()
      
      await storage.setItem('temp-data', { value: 'sensitive' }, { ttl: 300000 }) // 5 minutes

      // Data should exist initially
      const data1 = await storage.getItem('temp-data')
      expect(data1).toEqual({ value: 'sensitive' })

      // Advance time past TTL
      vi.advanceTimersByTime(301000)

      // Data should be expired
      const data2 = await storage.getItem('temp-data')
      expect(data2).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on sensitive operations', async () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        identifier: 'kyc-verification'
      })

      // Should allow initial requests
      for (let i = 0; i < 3; i++) {
        const allowed = await limiter.checkLimit()
        expect(allowed).toBe(true)
      }

      // Should block exceeding requests
      const blocked = await limiter.checkLimit()
      expect(blocked).toBe(false)

      // Should provide retry time
      const retryAfter = limiter.getRetryAfter()
      expect(retryAfter).toBeGreaterThan(0)
    })

    it('should track rate limits per user', async () => {
      const user1Limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        identifier: 'user-001'
      })

      const user2Limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        identifier: 'user-002'
      })

      // User 1 reaches limit
      await user1Limiter.checkLimit()
      await user1Limiter.checkLimit()
      expect(await user1Limiter.checkLimit()).toBe(false)

      // User 2 should still have quota
      expect(await user2Limiter.checkLimit()).toBe(true)
    })

    it('should integrate rate limiting with API calls', async () => {
      let requestCount = 0
      server.use(
        rest.post('/api/kyc/verify-identity', (req, res, ctx) => {
          requestCount++
          if (requestCount > 3) {
            return res(
              ctx.status(429),
              ctx.json({ error: 'Rate limit exceeded' }),
              ctx.set('Retry-After', '60')
            )
          }
          return res(ctx.json({ verified: true }))
        })
      )

      // Make requests
      const responses = []
      for (let i = 0; i < 5; i++) {
        const response = await fetch('/api/kyc/verify-identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test' })
        })
        responses.push(response)
      }

      // First 3 should succeed
      expect(responses[0].status).toBe(200)
      expect(responses[1].status).toBe(200)
      expect(responses[2].status).toBe(200)

      // Last 2 should be rate limited
      expect(responses[3].status).toBe(429)
      expect(responses[4].status).toBe(429)
    })
  })

  describe('Audit Trail Integrity', () => {
    it('should create tamper-proof audit logs', async () => {
      const auditEntry = {
        id: 'audit-001',
        timestamp: Date.now(),
        action: KYCActionType.PERSONAL_INFO_UPDATED,
        userId: 'user-001',
        details: {
          fieldName: 'email',
          oldValue: 'old@example.com',
          newValue: 'new@example.com'
        }
      }

      kycAuditLogger.log(
        auditEntry.action,
        auditEntry.details,
        { kycId: 'kyc-001' }
      )

      // Retrieve and verify checksum
      const logs = kycAuditLogger.search({ limit: 1 })
      expect(logs[0]).toBeDefined()
      expect(logs[0].checksum).toBeDefined()
    })

    it('should detect tampered audit logs', async () => {
      // Create legitimate log
      kycAuditLogger.log(
        KYCActionType.DOCUMENT_UPLOADED,
        { documentType: 'passport', fileName: 'passport.jpg' },
        { kycId: 'kyc-002' }
      )

      // Get stored logs and tamper with them
      const storageKey = 'kyc_audit_log'
      const storedData = localStorage.getItem(storageKey)
      if (storedData) {
        const logs = JSON.parse(atob(storedData))
        logs[0].details.documentType = 'drivers_license' // Tamper with data
        localStorage.setItem(storageKey, btoa(JSON.stringify(logs)))
      }

      // Search should filter out tampered entries
      const searchResults = kycAuditLogger.search({ limit: 10 })
      const tamperedEntry = searchResults.find(
        entry => entry.details.documentType === 'drivers_license'
      )
      expect(tamperedEntry).toBeUndefined()
    })

    it('should maintain audit log chain integrity', async () => {
      // Create chain of related audit entries
      const kycId = 'kyc-003'
      
      kycAuditLogger.log(
        KYCActionType.KYC_STATUS_CHANGED,
        { statusFrom: 'not_started', statusTo: 'in_progress' },
        { kycId }
      )

      kycAuditLogger.log(
        KYCActionType.PERSONAL_INFO_SUBMITTED,
        { completedFields: ['name', 'email', 'address'] },
        { kycId }
      )

      kycAuditLogger.log(
        KYCActionType.DOCUMENT_UPLOADED,
        { documentType: 'passport', verified: true },
        { kycId }
      )

      // Verify chain integrity
      const chainLogs = kycAuditLogger.search({ kycId })
      expect(chainLogs.length).toBe(3)
      
      // Each entry should have valid checksum
      chainLogs.forEach(log => {
        expect(log.checksum).toBeDefined()
        expect(log.checksum.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Security Monitoring', () => {
    it('should detect suspicious activity patterns', async () => {
      const monitor = new SecurityMonitor()
      
      // Simulate suspicious behavior
      const suspiciousActions = [
        { action: 'failed_login', userId: 'user-001' },
        { action: 'failed_login', userId: 'user-001' },
        { action: 'failed_login', userId: 'user-001' },
        { action: 'data_export', userId: 'user-001' },
        { action: 'bulk_download', userId: 'user-001' }
      ]

      for (const action of suspiciousActions) {
        monitor.trackAction(action)
      }

      const threats = monitor.detectThreats()
      expect(threats).toContainEqual(
        expect.objectContaining({
          type: 'brute_force_attempt',
          severity: 'high'
        })
      )
    })

    it('should trigger alerts for security violations', async () => {
      const alertSpy = vi.fn()
      const monitor = new SecurityMonitor({ onAlert: alertSpy })

      // Trigger rate limit violation
      for (let i = 0; i < 10; i++) {
        monitor.trackAction({
          action: 'api_call',
          endpoint: '/api/kyc/verify',
          userId: 'user-002'
        })
      }

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit_violation'
        })
      )
    })

    it('should log security events for compliance', async () => {
      const logSpy = vi.spyOn(kycAuditLogger, 'log')
      const monitor = new SecurityMonitor()

      // Simulate security event
      monitor.reportSecurityEvent({
        type: 'unauthorized_access_attempt',
        details: {
          resource: '/api/kyc/admin',
          userId: 'user-003',
          ip: '192.168.1.100'
        }
      })

      expect(logSpy).toHaveBeenCalledWith(
        KYCActionType.KYC_SUSPICIOUS_ACTIVITY,
        expect.objectContaining({
          type: 'unauthorized_access_attempt'
        })
      )
    })
  })

  describe('CSRF Protection', () => {
    it('should include CSRF token in sensitive requests', async () => {
      render(
        <KYCProvider>
          <SecureKYCForm />
        </KYCProvider>
      )

      // Get CSRF token
      const csrf = new CSRFProtection()
      const token = await csrf.getToken()
      expect(token).toBeDefined()

      // Fill form
      const firstNameInput = screen.getByLabelText(/first name/i)
      await user.type(firstNameInput, 'Test')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)

      // Verify CSRF token was included
      await waitFor(() => {
        const lastRequest = window.fetch.mock?.lastCall
        if (lastRequest) {
          const headers = lastRequest[1]?.headers
          expect(headers?.['X-CSRF-Token']).toBe(token)
        }
      })
    })

    it('should reject requests without valid CSRF token', async () => {
      const response = await fetch('/api/kyc/secure-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' })
        // No CSRF token
      })

      expect(response.status).toBe(403)
      const error = await response.json()
      expect(error.error).toContain('CSRF')
    })

    it('should refresh CSRF token periodically', async () => {
      vi.useFakeTimers()
      
      const csrf = new CSRFProtection()
      const token1 = await csrf.getToken()

      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000)

      const token2 = await csrf.getToken()
      expect(token2).not.toBe(token1)

      vi.useRealTimers()
    })
  })

  describe('File Upload Security', () => {
    it('should validate file types before upload', async () => {
      render(
        <KYCProvider>
          <SecureFileUpload 
            onUpload={vi.fn()}
            acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
          />
        </KYCProvider>
      )

      const fileInput = screen.getByLabelText(/upload/i)
      
      // Try to upload executable file
      const maliciousFile = new File(['malicious'], 'virus.exe', { type: 'application/x-msdownload' })
      
      await user.upload(fileInput, maliciousFile)

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument()
      })
    })

    it('should scan files for malware patterns', async () => {
      render(
        <KYCProvider>
          <SecureFileUpload onUpload={vi.fn()} />
        </KYCProvider>
      )

      const fileInput = screen.getByLabelText(/upload/i)
      
      // Create file with suspicious content
      const suspiciousContent = '<script>alert("XSS")</script>'
      const suspiciousFile = new File([suspiciousContent], 'document.html', { type: 'text/html' })
      
      await user.upload(fileInput, suspiciousFile)

      // Should detect and block
      await waitFor(() => {
        expect(screen.getByText(/security risk detected/i)).toBeInTheDocument()
      })
    })

    it('should enforce file size limits', async () => {
      render(
        <KYCProvider>
          <SecureFileUpload 
            onUpload={vi.fn()}
            maxSize={5 * 1024 * 1024} // 5MB
          />
        </KYCProvider>
      )

      const fileInput = screen.getByLabelText(/upload/i)
      
      // Create oversized file (10MB)
      const largeFile = new File(
        [new ArrayBuffer(10 * 1024 * 1024)],
        'large.pdf',
        { type: 'application/pdf' }
      )
      
      await user.upload(fileInput, largeFile)

      // Should show size error
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument()
      })
    })

    it('should encrypt files before storage', async () => {
      const uploadSpy = vi.fn()
      
      render(
        <KYCProvider>
          <SecureFileUpload 
            onUpload={uploadSpy}
            encrypt={true}
          />
        </KYCProvider>
      )

      const fileInput = screen.getByLabelText(/upload/i)
      const testFile = new File(['sensitive data'], 'document.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, testFile)

      // Wait for encryption and upload
      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalled()
        const uploadedData = uploadSpy.mock.calls[0][0]
        expect(uploadedData.encrypted).toBe(true)
        expect(uploadedData.content).not.toContain('sensitive data')
      })
    })
  })

  describe('Session Security', () => {
    it('should timeout inactive sessions', async () => {
      vi.useFakeTimers()
      
      const onTimeout = vi.fn()
      
      render(
        <KYCProvider>
          <SecureKYCForm onSessionTimeout={onTimeout} />
        </KYCProvider>
      )

      // Initial activity
      const input = screen.getByLabelText(/first name/i)
      await user.type(input, 'Test')

      // Simulate inactivity (15 minutes)
      vi.advanceTimersByTime(15 * 60 * 1000)

      // Should trigger timeout
      expect(onTimeout).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should prevent session fixation attacks', async () => {
      // Set session ID before authentication
      const preAuthSessionId = 'pre-auth-session-123'
      sessionStorage.setItem('clearhold_session', JSON.stringify({ id: preAuthSessionId }))

      // Simulate authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      // Session ID should change after auth
      const postAuthSession = JSON.parse(sessionStorage.getItem('clearhold_session') || '{}')
      expect(postAuthSession.id).not.toBe(preAuthSessionId)
    })

    it('should validate session on each request', async () => {
      const invalidSession = { id: 'invalid-session', expired: true }
      sessionStorage.setItem('clearhold_session', JSON.stringify(invalidSession))

      const response = await fetch('/api/kyc/status/123', {
        headers: {
          'X-Session-ID': invalidSession.id
        }
      })

      expect(response.status).toBe(401)
    })
  })

  describe('XSS Protection', () => {
    it('should sanitize user input', async () => {
      render(
        <KYCProvider>
          <SecureKYCForm />
        </KYCProvider>
      )

      const firstNameInput = screen.getByLabelText(/first name/i)
      const xssAttempt = '<script>alert("XSS")</script>John'
      
      await user.type(firstNameInput, xssAttempt)

      // Should sanitize on blur
      fireEvent.blur(firstNameInput)

      // Check sanitized value
      expect(firstNameInput).toHaveValue('John')
      expect(firstNameInput).not.toHaveValue('<script>')
    })

    it('should escape output in templates', async () => {
      const maliciousData = {
        firstName: '<img src=x onerror=alert("XSS")>',
        lastName: 'Doe'
      }

      render(
        <KYCProvider>
          <div data-testid="output">
            {`Welcome ${maliciousData.firstName} ${maliciousData.lastName}`}
          </div>
        </KYCProvider>
      )

      const output = screen.getByTestId('output')
      expect(output.innerHTML).not.toContain('<img')
      expect(output.innerHTML).not.toContain('onerror')
    })
  })

  describe('Data Masking', () => {
    it('should mask sensitive data in UI', async () => {
      render(
        <KYCProvider>
          <div data-testid="ssn-display" data-mask="ssn">
            123-45-6789
          </div>
        </KYCProvider>
      )

      const ssnDisplay = screen.getByTestId('ssn-display')
      expect(ssnDisplay).toHaveTextContent('***-**-6789')
    })

    it('should mask sensitive data in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      const sensitiveData = {
        ssn: '123-45-6789',
        creditCard: '4111111111111111',
        email: 'test@example.com'
      }

      // Log with masking
      SecurityMonitor.logWithMasking('User data:', sensitiveData)

      expect(consoleSpy).toHaveBeenCalledWith(
        'User data:',
        expect.objectContaining({
          ssn: '***-**-6789',
          creditCard: '************1111',
          email: 'test@example.com' // Email not masked
        })
      )
    })
  })

  describe('Compliance', () => {
    it('should enforce data retention policies', async () => {
      vi.useFakeTimers()
      
      const storage = new SecureStorage()
      
      // Store KYC data with retention policy
      await storage.setItem('kyc-temp', { data: 'temporary' }, { retentionDays: 30 })
      await storage.setItem('kyc-permanent', { data: 'permanent' }, { retentionDays: 365 })

      // Advance time by 31 days
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000)

      // Run cleanup
      await storage.cleanup()

      // Temporary data should be deleted
      expect(await storage.getItem('kyc-temp')).toBeNull()
      
      // Permanent data should remain
      expect(await storage.getItem('kyc-permanent')).toBeDefined()

      vi.useRealTimers()
    })

    it('should generate compliance reports', async () => {
      const report = await kycAuditLogger.generateComplianceReport({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      })

      expect(report).toHaveProperty('totalActions')
      expect(report).toHaveProperty('securityEvents')
      expect(report).toHaveProperty('dataExports')
      expect(report).toHaveProperty('checksumFailures')
    })
  })
})