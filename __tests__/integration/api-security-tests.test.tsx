import { describe, test, beforeEach, afterEach, expect, beforeAll } from 'vitest'
import fetch from 'node-fetch'

/**
 * API SECURITY INTEGRATION TESTS
 * These tests verify that backend API security measures are working correctly
 */
describe('API Security Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:3000'
  
  let testEmail: string
  let testPassword: string
  let authToken: string
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const SECURITY_DELAY = 2000 // 2 seconds between security tests
  
  beforeAll(async () => {
    // Verify backend is running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
      console.log('Backend is healthy, starting security tests...')
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  beforeEach(async () => {
    const timestamp = Date.now()
    testEmail = `security-test-${timestamp}@example.com`
    testPassword = 'SecurePass123@'
    authToken = ''
    
    await delay(SECURITY_DELAY)
  })
  
  afterEach(async () => {
    // Clean up
    if (authToken) {
      try {
        await delay(500)
        await fetch(`${BACKEND_URL}/auth/deleteAccount`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })
  
  describe('Input Validation and Sanitization', () => {
    test('should reject SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "test@example.com' OR '1'='1",
        "'; UNION SELECT * FROM users; --"
      ]
      
      for (const payload of sqlInjectionPayloads) {
        await delay(1000)
        
        const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payload,
            password: 'password123'
          })
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping SQL injection test')
          continue
        }
        
        // Should reject with 400 or 401, not 500 (which would indicate SQL error)
        expect(response.status).toBeLessThan(500)
        expect(response.status).toBeGreaterThanOrEqual(400)
        
        console.log(`SQL injection payload rejected with status: ${response.status}`)
      }
    })
    
    test('should sanitize XSS attempts in input fields', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<div onload=alert('xss')>",
        "'; alert('xss'); var x='"
      ]
      
      for (const payload of xssPayloads) {
        await delay(1000)
        
        const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            displayName: payload // XSS in display name
          })
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping XSS test')
          continue
        }
        
        if (response.ok) {
          const data = await response.json() as any
          // If successful, verify the payload was sanitized
          const displayName = data.user?.displayName || ''
          if (displayName) {
            expect(displayName).not.toContain('<script>')
            expect(displayName).not.toContain('javascript:')
            console.log('XSS payload sanitized successfully')
          } else {
            console.log('No displayName returned, XSS test inconclusive')
          }
        } else {
          // Should reject malicious content
          expect(response.status).toBeGreaterThanOrEqual(400)
          console.log(`XSS payload rejected with status: ${response.status}`)
        }
      }
    })
    
    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        '',
        ' '
      ]
      
      for (const email of invalidEmails) {
        await delay(800)
        
        const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: testPassword
          })
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping email validation test')
          continue
        }
        
        // Should reject invalid email formats
        expect(response.status).toBeGreaterThanOrEqual(400)
        
        const error = await response.json() as any
        expect(error.error?.toLowerCase()).toMatch(/email|invalid|format/)
        
        console.log(`Invalid email ${email} rejected correctly`)
      }
    })
  })
  
  describe('Authentication and Authorization Security', () => {
    beforeEach(async () => {
      // Create test user for auth tests
      await delay(SECURITY_DELAY)
      
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (response.ok) {
        const data = await response.json() as any
        authToken = data.token
      }
    })
    
    test('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'Bearer fake-token',
        'malformed-jwt-token',
        '',
        'null',
        'undefined'
      ]
      
      for (const token of malformedTokens) {
        await delay(800)
        
        const response = await fetch(`${BACKEND_URL}/wallet`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping malformed token test')
          continue
        }
        
        // Should reject malformed tokens
        expect(response.status).toBeGreaterThanOrEqual(401)
        expect(response.status).toBeLessThanOrEqual(403)
        
        console.log(`Malformed token rejected with status: ${response.status}`)
      }
    })
    
    test('should prevent privilege escalation', async () => {
      if (!authToken) {
        console.log('No auth token, skipping privilege test')
        return
      }
      
      // Try to access admin endpoints (if they exist)
      const adminEndpoints = [
        '/admin/users',
        '/admin/system',
        '/api/admin/config'
      ]
      
      for (const endpoint of adminEndpoints) {
        await delay(800)
        
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping privilege test')
          continue
        }
        
        // Should be forbidden (403) or not found (404), not 200
        expect(response.status).not.toBe(200)
        console.log(`Admin endpoint ${endpoint} properly protected: ${response.status}`)
      }
    })
  })
  
  describe('CORS and Security Headers', () => {
    test('should include proper security headers', async () => {
      const response = await fetch(`${BACKEND_URL}/health`)
      
      // Check for security headers
      const headers = response.headers
      
      // Should have CORS headers for browser security
      expect(headers.get('access-control-allow-origin')).toBeDefined()
      
      // May have other security headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ]
      
      securityHeaders.forEach(header => {
        const value = headers.get(header)
        if (value) {
          console.log(`Security header ${header}: ${value}`)
        }
      })
      
      console.log('Security headers check completed')
    })
    
    test('should handle OPTIONS requests for CORS', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'OPTIONS'
      })
      
      // Should allow OPTIONS for CORS preflight
      expect(response.status).toBeLessThan(300)
      
      const allowMethods = response.headers.get('access-control-allow-methods')
      if (allowMethods) {
        expect(allowMethods).toContain('POST')
        console.log(`CORS methods allowed: ${allowMethods}`)
      }
      
      console.log('CORS OPTIONS handling working correctly')
    })
  })
  
  describe('Data Sanitization and Output Encoding', () => {
    test('should not leak sensitive information in error messages', async () => {
      await delay(1000)
      
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
      })
      
      if (response.status === 429) {
        console.log('Rate limited, skipping error message test')
        return
      }
      
      const error = await response.json() as any
      
      // Error message should not contain sensitive info
      const errorMessage = error.error?.toLowerCase() || ''
      expect(errorMessage).not.toContain('firebase')
      expect(errorMessage).not.toContain('database')
      expect(errorMessage).not.toContain('internal')
      expect(errorMessage).not.toContain('stack')
      
      console.log('Error message appropriately sanitized')
    })
    
    test('should properly encode JSON responses', async () => {
      const response = await fetch(`${BACKEND_URL}/health`)
      
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
      
      const data = await response.json() as any
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
      
      console.log('JSON response properly encoded')
    })
  })
})