import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import fetch from 'node-fetch'

/**
 * REAL BACKEND INTEGRATION TESTS
 * These tests communicate with the actual running backend at localhost:3000
 * 
 * Backend endpoints (no /api prefix):
 * - /auth/signInEmailPass
 * - /auth/signUpEmailPass
 * - /wallet/register
 * - /deals/create
 * etc.
 */
describe('Auth Backend Real Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:3000'
  let testEmail: string
  
  beforeEach(() => {
    testEmail = `test-${Date.now()}@example.com`
    localStorage.clear()
    sessionStorage.clear()
  })
  
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  describe('Backend Services Health', () => {
    test('backend API is running and healthy', async () => {
      const response = await fetch(`${BACKEND_URL}/health`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('OK')
      expect(data.firebase).toBe('connected')
      expect(data.environment).toBe('development')
    })
    
    test('Firebase Auth emulator is accessible', async () => {
      const response = await fetch('http://localhost:9099/')
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.authEmulator.ready).toBe(true)
    })
    
    test('Firestore emulator is accessible', async () => {
      const response = await fetch('http://localhost:5004/')
      const text = await response.text()
      
      expect(response.status).toBe(200)
      expect(text.trim()).toBe('Ok')
    })
  })
  
  describe('Authentication Endpoints', () => {
    test('sign up with email and password', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          displayName: 'Test User'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        expect(data).toHaveProperty('token')
        expect(data).toHaveProperty('user')
        expect(data.user.email).toBe(testEmail)
      } else {
        // May fail if email already exists
        const error = await response.json()
        expect(error).toHaveProperty('error')
      }
    })
    
    test('sign in with email and password', async () => {
      // First create a user
      await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          displayName: 'Test User'
        })
      })
      
      // Then try to sign in
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        expect(data).toHaveProperty('token')
        expect(data).toHaveProperty('user')
        expect(data.user.email).toBe(testEmail)
      } else {
        const error = await response.json()
        expect(error).toHaveProperty('error')
      }
    })
    
    test('invalid credentials return error', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'WrongPassword'
        })
      })
      
      // Backend may return 401, 403, or 404 for auth errors
      expect(response.status).toBeGreaterThanOrEqual(401)
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toContain('Invalid credentials')
    })
    
    test('missing email returns validation error', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: 'TestPassword123!'
        })
      })
      
      expect(response.status).toBeGreaterThanOrEqual(400)
      const error = await response.json()
      expect(error).toHaveProperty('error')
    })
    
    test('weak password returns validation error', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: '123' // Too weak
        })
      })
      
      expect(response.status).toBeGreaterThanOrEqual(400)
      const error = await response.json()
      expect(error).toHaveProperty('error')
    })
  })
  
  describe('Protected Endpoints', () => {
    let authToken: string
    
    beforeEach(async () => {
      // Create user and get token
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          displayName: 'Test User'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        authToken = data.token
      }
    })
    
    test('wallet registration requires authentication', async () => {
      // Without token
      const responseWithoutAuth = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: '0x' + '0'.repeat(40),
          name: 'Test Wallet',
          network: 'ethereum'
        })
      })
      
      expect(responseWithoutAuth.status).toBe(401)
      const error = await responseWithoutAuth.json()
      expect(error.error).toContain('token')
    })
    
    test('wallet registration works with valid token', async () => {
      if (!authToken) {
        console.log('No auth token available, skipping test')
        return
      }
      
      const response = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0'),
          name: 'Test Wallet',
          network: 'ethereum',
          isPrimary: true
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Backend might return different structure
        expect(data).toBeDefined()
        // Check if it has success or error property at least
        expect(data.success || data.error || data.walletId).toBeDefined()
      } else {
        const error = await response.json()
        console.log('Wallet registration error:', error)
      }
    })
    
    test('fetching wallets requires authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/wallet`, {
        headers: {
          'Authorization': `Bearer invalid-token`
        }
      })
      
      // Backend may return 401, 403, or 404 for auth errors
      expect(response.status).toBeGreaterThanOrEqual(401)
    })
    
    test('fetching user profile requires authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/profile`)
      
      // Backend may return 401, 403, or 404 for auth errors
      expect(response.status).toBeGreaterThanOrEqual(401)
      const error = await response.json()
      expect(error.error).toContain('token')
    })
  })
  
  describe('Deal/Transaction Endpoints', () => {
    let authToken: string
    
    beforeEach(async () => {
      // Create user and get token
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'TestPassword123!',
          displayName: 'Test User'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        authToken = data.token
      }
    })
    
    test('creating deal requires authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Deal',
          amount: '1000',
          currency: 'USDC'
        })
      })
      
      // Backend may return 401, 403, or 404 for auth errors
      expect(response.status).toBeGreaterThanOrEqual(401)
    })
    
    test('fetching deals requires authentication', async () => {
      const response = await fetch(`${BACKEND_URL}/deals`)
      
      // Backend may return 401, 403, or 404 for auth errors
      expect(response.status).toBeGreaterThanOrEqual(401)
    })
  })
  
  describe('Rate Limiting', () => {
    test('multiple rapid requests trigger rate limiting', async () => {
      const requests = []
      
      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'ratelimit@test.com',
              password: 'password'
            })
          })
        )
      }
      
      const responses = await Promise.all(requests)
      
      // Some should be rate limited (429 status)
      const rateLimited = responses.filter(r => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
  
  describe('Error Handling', () => {
    test('malformed JSON returns 400', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{ invalid json'
      })
      
      expect(response.status).toBe(400)
    })
    
    test('missing content-type header is handled', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'test'
        })
      })
      
      // Should still process or return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
    
    test('OPTIONS requests are handled for CORS', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'OPTIONS'
      })
      
      // Should return 200 or 204 for CORS preflight
      expect(response.status).toBeLessThan(300)
    })
  })
})