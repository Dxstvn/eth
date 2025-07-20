/**
 * Real Backend Integration Tests
 * 
 * These tests verify connectivity and authentication with the actual staging backend.
 * Tests focus on direct backend interaction without frontend context.
 */

// Use Node.js native fetch (available in Node 18+)
const globalFetch = global.fetch
delete (global as any).fetch // Remove Jest mock temporarily

// Define proper typing for Response
interface RealResponse {
  ok: boolean
  status: number
  headers: {
    get(name: string): string | null
  }
  json(): Promise<any>
}

// Use native fetch function
const realFetch = (globalFetch || 
  (require('undici').fetch) || 
  eval('fetch')
) as (url: string, options?: any) => Promise<RealResponse>

const STAGING_API_URL = 'https://api.clearhold.app'

describe('Real Backend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Restore Jest mock
    global.fetch = globalFetch
  })

  describe('Backend Health and Connectivity', () => {
    it('should successfully connect to staging backend health endpoint', async () => {
      const response = await realFetch(`${STAGING_API_URL}/health`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toBe('OK')
    }, 10000)

    it('should have proper response times for health check', async () => {
      const startTime = Date.now()
      
      const response = await realFetch(`${STAGING_API_URL}/health`)
      
      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.ok).toBe(true)
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    }, 10000)
  })

  describe('Authentication Endpoint Validation', () => {
    it('should return proper error for missing email/password', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body
      })

      expect(response.ok).toBe(false)
      expect([400, 422]).toContain(response.status)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    }, 10000)

    it('should return proper error for invalid email format', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email-format',
          password: 'SomePassword123!',
        }),
      })

      expect(response.ok).toBe(false)
      expect([400, 401, 422]).toContain(response.status)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    }, 10000)

    it('should return proper error for non-existent user', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `nonexistent-${Date.now()}@example.com`,
          password: 'SomePassword123!',
        }),
      })

      expect(response.ok).toBe(false)
      expect([401, 404]).toContain(response.status)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    }, 10000)

    it('should have proper content-type headers for JSON responses', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      })

      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
    }, 10000)
  })

  describe('Backend Security', () => {
    it('should handle malformed JSON requests properly', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json-string',
      })

      expect(response.ok).toBe(false)
      expect([400, 422]).toContain(response.status)
    }, 10000)

    it('should handle requests without proper content-type', async () => {
      const response = await realFetch(`${STAGING_API_URL}/auth/signInEmailPass`, {
        method: 'POST',
        // Missing Content-Type header
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      })

      // Server should either accept it or reject it, but shouldn't crash
      expect([200, 400, 415, 422]).toContain(response.status)
    }, 10000)
  })
}) 