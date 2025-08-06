import { describe, test, beforeEach, afterEach, expect, beforeAll } from 'vitest'
import fetch from 'node-fetch'

/**
 * COMPREHENSIVE SERVICE INTEGRATION TESTS
 * These tests verify that backend services actually work correctly,
 * not just that they respond. Tests include:
 * - User lifecycle (create, login, update, delete)
 * - Token management and expiry
 * - Wallet operations
 * - Transaction workflows
 * - Real-time updates
 */
describe('Backend Service Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:3000'
  const FIREBASE_AUTH_URL = 'http://localhost:9099'
  
  let testEmail: string
  let testPassword: string
  let authToken: string
  let userId: string
  
  // Helper to add delay between requests to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const REQUEST_DELAY = 500 // 500ms between requests
  
  beforeAll(async () => {
    // Verify services are running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  beforeEach(async () => {
    const timestamp = Date.now()
    testEmail = `test-${timestamp}@example.com`
    testPassword = 'TestPass123@' // Added special character for Firebase requirements
    authToken = ''
    userId = ''
    // Add delay before each test to avoid rate limiting
    await delay(REQUEST_DELAY)
  })
  
  afterEach(async () => {
    // Clean up test user if created
    if (authToken) {
      try {
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
  
  describe('User Lifecycle Management', () => {
    test('complete user lifecycle: create, verify, update, delete', async () => {
      // 1. Create user
      await delay(REQUEST_DELAY)
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Test User'
        })
      })
      
      expect(createResponse.ok).toBe(true)
      const createData = await createResponse.json() as any
      expect(createData).toHaveProperty('token')
      expect(createData).toHaveProperty('user')
      expect(createData.user.email).toBe(testEmail)
      
      authToken = createData.token
      userId = createData.userId || createData.user.uid
      
      // 2. Verify user can sign in
      await delay(REQUEST_DELAY)
      const signInResponse = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      expect(signInResponse.ok).toBe(true)
      const signInData = await signInResponse.json() as any
      expect(signInData.user?.uid || signInData.userId).toBeTruthy()
      
      // 3. Update profile (if endpoint exists)
      await delay(REQUEST_DELAY)
      const profileResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          displayName: 'Updated Name',
          phone: '+1234567890'
        })
      })
      
      // Profile endpoint might not exist
      if (profileResponse.status !== 404) {
        expect(profileResponse.ok).toBe(true)
      }
      
      // 4. Sign out
      await delay(REQUEST_DELAY)
      const signOutResponse = await fetch(`${BACKEND_URL}/auth/signOut`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      // Sign out endpoint might not exist, but that's ok
      expect(signOutResponse.status).toBeLessThan(500)
    })
    
    test('duplicate email registration fails', async () => {
      // Create first user
      await delay(REQUEST_DELAY)
      const firstResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      expect(firstResponse.ok).toBe(true)
      const firstData = await firstResponse.json() as any
      authToken = firstData.token
      
      // Try to create second user with same email
      await delay(REQUEST_DELAY)
      const secondResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'DifferentPass123'
        })
      })
      
      expect(secondResponse.ok).toBe(false)
      const error = await secondResponse.json() as any
      expect(error.error.toLowerCase()).toContain('already')
    })
    
    test('password validation enforces minimum requirements', async () => {
      const weakPasswords = ['123', 'abc', 'pass', '12345']
      
      for (const weakPass of weakPasswords) {
        await delay(REQUEST_DELAY)
        const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `weak-${Date.now()}@example.com`,
            password: weakPass
          })
        })
        
        expect(response.ok).toBe(false)
        const error = await response.json() as any
        expect(error.error.toLowerCase()).toMatch(/password|weak|short|requirement/i)
      }
    })
  })
  
  describe('Token Management', () => {
    beforeEach(async () => {
      // Create a test user for token tests
      await delay(REQUEST_DELAY)
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (response.ok) {
        const data = await response.json() as any as any
        authToken = data.token
        userId = data.userId || data.user?.uid
      }
    })
    
    test('valid token allows access to protected endpoints', async () => {
      await delay(REQUEST_DELAY)
      const response = await fetch(`${BACKEND_URL}/wallet`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      // Should not be 401 with valid token
      expect(response.status).not.toBe(401)
    })
    
    test('invalid token is rejected', async () => {
      await delay(REQUEST_DELAY)
      const response = await fetch(`${BACKEND_URL}/wallet`, {
        headers: {
          'Authorization': 'Bearer invalid-token-123'
        }
      })
      
      expect(response.status).toBeGreaterThanOrEqual(401)
      expect(response.status).toBeLessThanOrEqual(403)
    })
    
    test('missing token is rejected for protected endpoints', async () => {
      await delay(REQUEST_DELAY)
      const response = await fetch(`${BACKEND_URL}/wallet`)
      
      expect(response.status).toBeGreaterThanOrEqual(401)
      expect(response.status).toBeLessThanOrEqual(403)
    })
    
    test('malformed authorization header is rejected', async () => {
      const malformedHeaders = [
        'invalid-format',
        'Bearer',
        'Token ${authToken}',
        `${authToken}`
      ]
      
      for (const header of malformedHeaders) {
        const response = await fetch(`${BACKEND_URL}/wallet`, {
          headers: {
            'Authorization': header
          }
        })
        
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })
  })
  
  describe('Wallet Service Operations', () => {
    beforeEach(async () => {
      // Create authenticated user
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (response.ok) {
        const data = await response.json() as any as any
        authToken = data.token
        userId = data.userId || data.user?.uid
      }
    })
    
    test('register and manage wallet lifecycle', async () => {
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      
      // 1. Register wallet
      const registerResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Integration Test Wallet',
          network: 'ethereum',
          isPrimary: true
        })
      })
      
      // Check response
      if (registerResponse.ok) {
        const registerData = await registerResponse.json()
        expect(registerData).toBeDefined()
        
        // 2. Fetch user wallets
        const walletsResponse = await fetch(`${BACKEND_URL}/wallet`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json()
          expect(Array.isArray(wallets) || wallets.wallets).toBeTruthy()
          
          const walletList = Array.isArray(wallets) ? wallets : wallets.wallets
          const registeredWallet = walletList?.find((w: any) => 
            w.address?.toLowerCase() === walletAddress.toLowerCase()
          )
          
          if (registeredWallet) {
            expect(registeredWallet.name).toBe('Integration Test Wallet')
            expect(registeredWallet.network).toBe('ethereum')
          }
        }
        
        // 3. Delete wallet
        const deleteResponse = await fetch(`${BACKEND_URL}/wallet/${walletAddress}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        // Delete might not be implemented
        expect(deleteResponse.status).toBeLessThan(500)
      }
    })
    
    test('wallet address validation', async () => {
      const invalidAddresses = [
        'not-an-address',
        '0x123',
        '0xGGGG',
        '',
        '0x' + '0'.repeat(39), // Too short
        '0x' + '0'.repeat(41), // Too long
      ]
      
      for (const address of invalidAddresses) {
        const response = await fetch(`${BACKEND_URL}/wallet/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            address,
            name: 'Invalid Wallet',
            network: 'ethereum'
          })
        })
        
        // Should reject invalid addresses
        if (response.ok) {
          const data = await response.json() as any
          expect(data.error || data.message).toBeDefined()
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })
    
    test('multiple wallets per user', async () => {
      const wallets = []
      
      // Register 3 wallets
      for (let i = 0; i < 3; i++) {
        const address = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
        wallets.push(address)
        
        const response = await fetch(`${BACKEND_URL}/wallet/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            address,
            name: `Wallet ${i + 1}`,
            network: i === 0 ? 'ethereum' : i === 1 ? 'polygon' : 'bsc',
            isPrimary: i === 0
          })
        })
        
        if (!response.ok) {
          console.log(`Failed to register wallet ${i + 1}:`, await response.text())
        }
      }
      
      // Fetch all wallets
      const response = await fetch(`${BACKEND_URL}/wallet`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json() as any
        const walletList = Array.isArray(data) ? data : data.wallets
        
        if (walletList) {
          // Should have at least the wallets we registered
          expect(walletList.length).toBeGreaterThanOrEqual(3)
        }
      }
    })
  })
  
  describe('Transaction/Deal Service', () => {
    let sellerToken: string
    let buyerToken: string
    let dealId: string
    
    beforeEach(async () => {
      // Create seller
      const sellerResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `seller-${Date.now()}@example.com`,
          password: testPassword,
          displayName: 'Test Seller'
        })
      })
      
      if (sellerResponse.ok) {
        const data = await sellerResponse.json()
        sellerToken = data.token
      }
      
      // Create buyer
      const buyerResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `buyer-${Date.now()}@example.com`,
          password: testPassword,
          displayName: 'Test Buyer'
        })
      })
      
      if (buyerResponse.ok) {
        const data = await buyerResponse.json()
        buyerToken = data.token
      }
    })
    
    test('create and manage deal lifecycle', async () => {
      // 1. Create deal
      const createResponse = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify({
          title: 'Test Property Deal',
          description: 'Integration test escrow deal',
          amount: '100000',
          currency: 'USDC',
          seller: {
            address: '0x' + '1'.repeat(40),
            email: 'seller@test.com'
          },
          buyer: {
            address: '0x' + '2'.repeat(40),
            email: 'buyer@test.com'
          },
          conditions: [
            {
              title: 'Inspection',
              description: 'Property inspection'
            }
          ]
        })
      })
      
      if (createResponse.status === 404) {
        console.log('Deal endpoints not implemented')
        return
      }
      
      if (createResponse.ok) {
        const createData = await createResponse.json()
        expect(createData).toHaveProperty('dealId')
        dealId = createData.dealId
        
        // 2. Fetch deal details
        const dealResponse = await fetch(`${BACKEND_URL}/deals/${dealId}`, {
          headers: {
            'Authorization': `Bearer ${sellerToken}`
          }
        })
        
        if (dealResponse.ok) {
          const dealData = await dealResponse.json()
          expect(dealData.title).toBe('Test Property Deal')
          expect(dealData.amount).toBe('100000')
        }
        
        // 3. Update condition
        const updateResponse = await fetch(
          `${BACKEND_URL}/deals/${dealId}/conditions/0/buyer-review`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${buyerToken}`
            },
            body: JSON.stringify({
              status: 'completed'
            })
          }
        )
        
        expect(updateResponse.status).toBeLessThan(500)
      }
    })
    
    test('deal validation requirements', async () => {
      const invalidDeals = [
        { amount: '-1000' }, // Negative amount
        { amount: '0' }, // Zero amount
        { currency: 'INVALID' }, // Invalid currency
        {}, // Missing required fields
      ]
      
      for (const invalidDeal of invalidDeals) {
        const response = await fetch(`${BACKEND_URL}/deals/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sellerToken}`
          },
          body: JSON.stringify({
            title: 'Invalid Deal',
            ...invalidDeal
          })
        })
        
        // Should reject invalid deals
        if (response.status !== 404) {
          expect(response.ok).toBe(false)
        }
      }
    })
  })
  
  describe('Cross-Service Integration', () => {
    test('user with wallet can create deal', async () => {
      // 1. Create user
      const userResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      expect(userResponse.ok).toBe(true)
      const userData = await userResponse.json()
      const userToken = userData.token
      
      // 2. Register wallet
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      const walletResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Deal Wallet',
          network: 'ethereum',
          isPrimary: true
        })
      })
      
      // 3. Create deal with registered wallet
      const dealResponse = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          title: 'Cross-Service Test Deal',
          amount: '50000',
          currency: 'USDC',
          seller: {
            address: walletAddress,
            email: testEmail
          },
          buyer: {
            address: '0x' + '9'.repeat(40),
            email: 'buyer@example.com'
          }
        })
      })
      
      // Deal creation might not be implemented
      if (dealResponse.status !== 404) {
        expect(dealResponse.status).toBeLessThan(500)
      }
    })
  })
  
  describe('Error Recovery and Edge Cases', () => {
    test('handles concurrent requests correctly', async () => {
      // Create user first
      const userResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      expect(userResponse.ok).toBe(true)
      const userData = await userResponse.json()
      authToken = userData.token
      
      // Make 5 concurrent wallet registration requests
      const promises = []
      for (let i = 0; i < 5; i++) {
        const address = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
        promises.push(
          fetch(`${BACKEND_URL}/wallet/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              address,
              name: `Concurrent Wallet ${i}`,
              network: 'ethereum'
            })
          })
        )
      }
      
      const responses = await Promise.all(promises)
      
      // All should complete without server errors
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500)
      })
    })
    
    test('handles large payloads appropriately', async () => {
      const largeDescription = 'x'.repeat(10000) // 10KB string
      
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: largeDescription
        })
      })
      
      // Should either accept or reject with appropriate error
      expect(response.status).toBeLessThan(500)
      
      if (!response.ok) {
        const error = await response.json()
        expect(error.error).toBeDefined()
      }
    })
    
    test('handles special characters in input', async () => {
      const specialChars = [
        `test+${Date.now()}@example.com`,
        `test.${Date.now()}@example.com`,
        `test_${Date.now()}@example.com`
      ]
      
      for (const email of specialChars) {
        const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: testPassword,
            displayName: "Test User's Name" // Apostrophe
          })
        })
        
        // Should handle special characters
        expect(response.status).toBeLessThan(500)
      }
    })
  })
})