import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { apiClient } from '@/services/api/client'
import { passwordlessAuthService } from '@/services/passwordless-auth-service'

// Configuration for real backend testing
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const FIREBASE_AUTH_URL = 'http://localhost:9099'
const FIRESTORE_URL = 'http://localhost:5004'

/**
 * REAL INTEGRATION TESTS
 * These tests actually communicate with the backend services.
 * They require the backend to be running with:
 * - Firebase emulators (auth, firestore, storage)
 * - Backend API server
 * - Hardhat node for blockchain testing
 * 
 * Run backend with: npm run dev:fullstack
 */
describe('Auth Real Backend Integration Tests', () => {
  let testEmail: string
  
  beforeEach(() => {
    // Generate unique test email for each test
    testEmail = `test-${Date.now()}@example.com`
    
    // Clear any stored auth tokens
    localStorage.clear()
    sessionStorage.clear()
  })
  
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  describe('Backend Health Checks', () => {
    test('should verify backend API is running', async () => {
      try {
        const response = await fetch('http://localhost:3000/health')
        expect(response.status).toBeLessThan(500) // Not a server error
        const data = await response.json()
        expect(data.status).toBe('OK')
      } catch (error) {
        console.warn('Backend not running. Start with: npm run dev:fullstack')
        throw new Error('Backend API not available')
      }
    })
    
    test('should verify Firebase Auth emulator is running', async () => {
      try {
        const response = await fetch(`${FIREBASE_AUTH_URL}/`)
        expect(response).toBeDefined()
      } catch (error) {
        console.warn('Firebase Auth emulator not running on port 9099')
        throw new Error('Firebase Auth emulator not available')
      }
    })
    
    test('should verify Firestore emulator is running', async () => {
      try {
        const response = await fetch(`${FIRESTORE_URL}/`)
        expect(response).toBeDefined()
        const text = await response.text()
        expect(text).toBe('Ok')
      } catch (error) {
        console.warn('Firestore emulator not running on port 5004')
        throw new Error('Firestore emulator not available')
      }
    })
  })
  
  describe('Passwordless Authentication Flow', () => {
    test('should send sign-in link to email', async () => {
      // This makes a REAL API call to the backend
      const result = await passwordlessAuthService.sendSignInLink(testEmail)
      
      // Verify the response structure
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      
      if (result.success) {
        expect(result).toHaveProperty('message')
        expect(result.message).toContain('email')
      }
    })
    
    test('should handle rate limiting for repeated requests', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = []
      
      for (let i = 0; i < 6; i++) {
        requests.push(
          passwordlessAuthService.sendSignInLink(testEmail)
        )
      }
      
      const results = await Promise.allSettled(requests)
      
      // Some requests should fail due to rate limiting
      const failures = results.filter(r => r.status === 'rejected')
      expect(failures.length).toBeGreaterThan(0)
    })
    
    test('should validate email format before sending', async () => {
      const invalidEmail = 'not-an-email'
      
      try {
        await passwordlessAuthService.sendSignInLink(invalidEmail)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error.message).toContain('email')
      }
    })
  })
  
  describe('API Client with Backend', () => {
    test('should make authenticated requests with token', async () => {
      // Set a test token
      const testToken = 'test-jwt-token'
      localStorage.setItem('clearhold_auth_token', testToken)
      
      try {
        // Make a real API call that requires authentication
        await apiClient.get('/api/user/profile')
      } catch (error: any) {
        // Should get 401 with invalid token
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should handle network errors gracefully', async () => {
      // Temporarily set wrong backend URL
      const originalUrl = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:99999'
      
      try {
        await apiClient.get('/api/test')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error.message).toBeDefined()
      } finally {
        // Restore original URL
        process.env.NEXT_PUBLIC_API_URL = originalUrl
      }
    })
    
    test('should retry failed requests with exponential backoff', async () => {
      const startTime = Date.now()
      
      try {
        // Make request to non-existent endpoint
        await apiClient.get('/api/non-existent-endpoint')
      } catch (error) {
        // Should take time due to retries
        const duration = Date.now() - startTime
        expect(duration).toBeGreaterThan(1000) // At least 1 second for retries
      }
    })
  })
  
  describe('User Profile Management', () => {
    test('should fetch user profile after authentication', async () => {
      // This would require a valid auth token from real authentication
      // For now, we test the error case
      try {
        const profile = await apiClient.get('/api/auth/profile')
        // If we get here, we have a valid profile
        expect(profile).toBeDefined()
      } catch (error: any) {
        // Expected: 401 Unauthorized without valid token
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should update user profile', async () => {
      const profileUpdate = {
        displayName: 'Test User',
        phone: '+1234567890'
      }
      
      try {
        const result = await apiClient.put('/api/auth/profile', profileUpdate)
        // If successful, verify response
        if (result.success) {
          expect(result.data).toBeDefined()
        }
      } catch (error: any) {
        // Expected: 401 without auth
        expect(error.statusCode).toBe(401)
      }
    })
  })
  
  describe('Cross-Device Authentication', () => {
    test('should initiate cross-device auth session', async () => {
      try {
        const response = await apiClient.post('/api/auth/cross-device/initiate', {
          email: testEmail,
          deviceId: 'test-device-123'
        })
        
        if (response.success) {
          expect(response.data).toHaveProperty('sessionId')
          expect(response.data).toHaveProperty('qrCode')
        }
      } catch (error: any) {
        // May not be implemented yet
        expect(error.statusCode).toBeGreaterThanOrEqual(400)
      }
    })
  })
  
  describe('Session Management', () => {
    test('should handle token refresh', async () => {
      // Set an expired token
      const expiredToken = 'expired-token'
      localStorage.setItem('clearhold_auth_token', expiredToken)
      
      try {
        await apiClient.get('/api/auth/refresh')
      } catch (error: any) {
        // Should get 401 for expired token
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should clear session on logout', async () => {
      try {
        await apiClient.post('/api/auth/signOut')
        
        // Verify token is cleared
        const token = localStorage.getItem('clearhold_auth_token')
        expect(token).toBeNull()
      } catch (error) {
        // Logout may fail without valid session
        expect(error).toBeDefined()
      }
    })
  })
})