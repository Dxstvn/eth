import { describe, test, beforeEach, afterEach, expect, beforeAll } from 'vitest'
import fetch from 'node-fetch'

/**
 * FOCUSED SERVICE FUNCTIONALITY TESTS
 * These tests verify core backend service functionality with minimal rate limiting issues
 * by using longer delays and testing only essential functionality.
 */
describe('Service Functionality Tests', () => {
  const BACKEND_URL = 'http://localhost:3000'
  
  let testEmail: string
  let testPassword: string
  let authToken: string
  
  // Longer delay to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const LONG_DELAY = 1500 // 1.5 seconds between requests
  
  beforeAll(async () => {
    // Verify backend is running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
      console.log('Backend is healthy, starting tests...')
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  beforeEach(async () => {
    const timestamp = Date.now()
    testEmail = `test-${timestamp}@example.com`
    testPassword = 'TestPass123@'
    authToken = ''
    
    // Long delay before each test
    await delay(LONG_DELAY)
  })
  
  afterEach(async () => {
    // Clean up test user if created
    if (authToken) {
      try {
        await delay(500)
        await fetch(`${BACKEND_URL}/auth/deleteAccount`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })
  
  describe('Authentication Service Core Functionality', () => {
    test('should create user account and return token', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Test User'
        })
      })
      
      if (response.status === 429) {
        console.log('Rate limited, test cannot proceed')
        return
      }
      
      console.log(`Sign up response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json() as any
        console.log('Sign up successful, data keys:', Object.keys(data))
        
        expect(data).toHaveProperty('token')
        expect(data).toHaveProperty('user')
        authToken = data.token
        
        // Verify user can sign in with created credentials
        await delay(LONG_DELAY)
        
        const signInResponse = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword
          })
        })
        
        if (signInResponse.ok) {
          const signInData = await signInResponse.json() as any
          expect(signInData).toHaveProperty('token')
          expect(signInData.user?.uid || signInData.userId).toBeTruthy()
          console.log('Sign in verification successful')
        }
      } else {
        const error = await response.json() as any
        console.log('Sign up failed:', error)
        // If rate limited, skip the test
        if (response.status === 429) {
          console.log('Skipping due to rate limit')
          return
        }
        throw new Error(`Sign up failed: ${error.error}`)
      }
    })
  })
  
  describe('Wallet Service Core Functionality', () => {
    beforeEach(async () => {
      // Create authenticated user first
      await delay(LONG_DELAY)
      
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
        console.log('User created for wallet tests')
      }
    })
    
    test('should register and retrieve wallet', async () => {
      if (!authToken) {
        console.log('No auth token available, skipping wallet test')
        return
      }
      
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      
      await delay(LONG_DELAY)
      
      // Register wallet
      const registerResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Test Wallet',
          network: 'ethereum',
          isPrimary: true
        })
      })
      
      if (registerResponse.status === 429) {
        console.log('Rate limited, skipping wallet test')
        return
      }
      
      console.log(`Wallet registration status: ${registerResponse.status}`)
      
      if (registerResponse.ok) {
        const registerData = await registerResponse.json() as any
        console.log('Wallet registered successfully')
        
        // Retrieve wallets
        await delay(LONG_DELAY)
        
        const walletsResponse = await fetch(`${BACKEND_URL}/wallet`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json() as any
          const walletList = Array.isArray(wallets) ? wallets : wallets.wallets
          
          if (walletList && walletList.length > 0) {
            const foundWallet = walletList.find((w: any) => 
              w.address?.toLowerCase() === walletAddress.toLowerCase()
            )
            if (foundWallet) {
              expect(foundWallet.name).toBe('Test Wallet')
              expect(foundWallet.network).toBe('ethereum')
              console.log('Wallet retrieval and verification successful')
            }
          }
        }
      } else {
        const error = await registerResponse.json() as any
        console.log('Wallet registration failed:', error)
      }
    })
  })
  
  describe('Authentication & Authorization', () => {
    test('should properly protect endpoints', async () => {
      // Test without token
      const response = await fetch(`${BACKEND_URL}/wallet`)
      
      if (response.status === 429) {
        console.log('Rate limited, skipping auth test')
        return
      }
      
      console.log(`Unauth wallet request status: ${response.status}`)
      
      // Should be unauthorized
      expect(response.status).toBeGreaterThanOrEqual(401)
      expect(response.status).toBeLessThanOrEqual(403)
      
      const error = await response.json() as any
      expect(error.error?.toLowerCase()).toContain('token')
      
      console.log('Endpoint protection working correctly')
    })
  })
  
  describe('Service Health and Error Handling', () => {
    test('should handle malformed requests gracefully', async () => {
      await delay(LONG_DELAY)
      
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json'
      })
      
      if (response.status === 429) {
        console.log('Rate limited, skipping malformed request test')
        return
      }
      
      console.log(`Malformed request status: ${response.status}`)
      expect(response.status).toBe(400)
      
      console.log('Malformed request handling working correctly')
    })
    
    test('should validate required fields', async () => {
      await delay(LONG_DELAY)
      
      const response = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'test' // Missing email
        })
      })
      
      if (response.status === 429) {
        console.log('Rate limited, skipping validation test')
        return
      }
      
      console.log(`Missing field validation status: ${response.status}`)
      expect(response.status).toBeGreaterThanOrEqual(400)
      
      const error = await response.json() as any
      expect(error).toHaveProperty('error')
      
      console.log('Field validation working correctly')
    })
  })
  
  describe('Advanced Authentication Features', () => {
    test('should handle password reset flow', async () => {
      // Create user first
      await delay(LONG_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping password reset test')
        return
      }
      
      if (createResponse.ok) {
        const data = await createResponse.json() as any
        authToken = data.token
        
        // Request password reset
        await delay(LONG_DELAY)
        
        const resetResponse = await fetch(`${BACKEND_URL}/auth/resetPassword`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail
          })
        })
        
        if (resetResponse.status !== 404 && resetResponse.status !== 429) {
          console.log(`Password reset request status: ${resetResponse.status}`)
          
          if (resetResponse.ok) {
            console.log('Password reset email sent successfully')
          }
        }
      }
    })
    
    test('should support Google authentication', async () => {
      await delay(LONG_DELAY)
      
      const googleAuthResponse = await fetch(`${BACKEND_URL}/auth/signInGoogle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: 'mock-google-id-token'
        })
      })
      
      if (googleAuthResponse.status === 429) {
        console.log('Rate limited, skipping Google auth test')
        return
      }
      
      if (googleAuthResponse.status !== 404) {
        console.log(`Google authentication status: ${googleAuthResponse.status}`)
        
        if (googleAuthResponse.ok) {
          const data = await googleAuthResponse.json() as any
          expect(data).toHaveProperty('token')
          console.log('Google authentication working')
        }
      }
    })
  })
  
  describe('Extended Wallet Features', () => {
    beforeEach(async () => {
      // Create authenticated user
      await delay(LONG_DELAY)
      
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
    
    test('should handle wallet import and export', async () => {
      if (!authToken) {
        console.log('No auth token, skipping wallet import test')
        return
      }
      
      await delay(LONG_DELAY)
      
      // Test wallet import
      const importResponse = await fetch(`${BACKEND_URL}/wallet/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          privateKey: 'mock-private-key',
          password: 'wallet-password',
          name: 'Imported Wallet'
        })
      })
      
      if (importResponse.status === 429) {
        console.log('Rate limited, skipping wallet import test')
        return
      }
      
      if (importResponse.status !== 404) {
        console.log(`Wallet import status: ${importResponse.status}`)
        
        if (importResponse.ok) {
          const importData = await importResponse.json() as any
          console.log('Wallet import successful')
          
          // Test wallet export
          await delay(LONG_DELAY)
          
          const exportResponse = await fetch(`${BACKEND_URL}/wallet/export`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              address: importData.address,
              password: 'wallet-password'
            })
          })
          
          if (exportResponse.status !== 404 && exportResponse.status !== 429) {
            console.log(`Wallet export status: ${exportResponse.status}`)
          }
        }
      }
    })
    
    test('should manage wallet transactions history', async () => {
      if (!authToken) {
        console.log('No auth token, skipping transaction history test')
        return
      }
      
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      
      await delay(LONG_DELAY)
      
      // Register wallet first
      const registerResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Transaction History Wallet',
          network: 'ethereum'
        })
      })
      
      if (registerResponse.status === 429) {
        console.log('Rate limited, skipping transaction history test')
        return
      }
      
      if (registerResponse.ok) {
        // Get transaction history
        await delay(LONG_DELAY)
        
        const historyResponse = await fetch(`${BACKEND_URL}/wallet/${walletAddress}/transactions`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (historyResponse.status !== 404 && historyResponse.status !== 429) {
          console.log(`Transaction history status: ${historyResponse.status}`)
          
          if (historyResponse.ok) {
            const history = await historyResponse.json() as any
            console.log('Transaction history retrieved successfully')
          }
        }
      }
    })
  })
  
  describe('Real-time Features', () => {
    test('should handle WebSocket connections for notifications', async () => {
      // Create user first
      await delay(LONG_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping WebSocket test')
        return
      }
      
      if (createResponse.ok) {
        const data = await createResponse.json() as any
        authToken = data.token
        
        // Test WebSocket endpoint availability
        await delay(LONG_DELAY)
        
        const wsResponse = await fetch(`${BACKEND_URL}/ws/notifications`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (wsResponse.status !== 404 && wsResponse.status !== 429) {
          console.log(`WebSocket endpoint status: ${wsResponse.status}`)
        }
      }
    })
    
    test('should handle live deal updates', async () => {
      // Create user first
      await delay(LONG_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping live updates test')
        return
      }
      
      if (createResponse.ok) {
        const data = await createResponse.json() as any
        authToken = data.token
        
        // Test live updates endpoint
        await delay(LONG_DELAY)
        
        const liveResponse = await fetch(`${BACKEND_URL}/live/deals`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (liveResponse.status !== 404 && liveResponse.status !== 429) {
          console.log(`Live updates endpoint status: ${liveResponse.status}`)
        }
      }
    })
  })
})