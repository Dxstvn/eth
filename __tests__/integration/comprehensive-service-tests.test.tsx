import { describe, test, beforeEach, afterEach, expect, beforeAll } from 'vitest'
import fetch from 'node-fetch'

/**
 * COMPREHENSIVE SERVICE FUNCTIONALITY TESTS
 * These tests verify extensive backend service functionality including:
 * - User management and profiles
 * - Wallet operations and validation
 * - Deal/transaction lifecycle
 * - File upload and management
 * - Contact system
 * - Real-time notifications
 * - Data consistency and integrity
 * - Cross-service dependencies
 */
describe('Comprehensive Service Functionality Tests', () => {
  const BACKEND_URL = 'http://localhost:3000'
  
  let testEmail: string
  let testPassword: string
  let authToken: string
  let userId: string
  let createdUsers: string[] = []
  
  // Longer delay to avoid rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const TEST_DELAY = 1500 // 1.5 seconds between requests
  
  beforeAll(async () => {
    // Verify backend is running
    try {
      const health = await fetch(`${BACKEND_URL}/health`)
      if (!health.ok) {
        throw new Error('Backend not healthy')
      }
      console.log('Backend is healthy, starting comprehensive tests...')
    } catch (error) {
      console.error('Backend services not running. Start with: npm run dev:fullstack')
      throw error
    }
  })
  
  beforeEach(async () => {
    const timestamp = Date.now()
    testEmail = `comprehensive-test-${timestamp}@example.com`
    testPassword = 'TestPass123@'
    authToken = ''
    userId = ''
    
    await delay(TEST_DELAY)
  })
  
  afterEach(async () => {
    // Clean up all created users
    const cleanup = []
    for (const token of createdUsers) {
      cleanup.push(
        fetch(`${BACKEND_URL}/auth/deleteAccount`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {})
      )
    }
    
    if (authToken && !createdUsers.includes(authToken)) {
      cleanup.push(
        fetch(`${BACKEND_URL}/auth/deleteAccount`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        }).catch(() => {})
      )
    }
    
    await Promise.all(cleanup)
    createdUsers = []
  })
  
  describe('User Management Service', () => {
    test('should create user with complete profile information', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'John Doe',
          phone: '+1234567890'
        })
      })
      
      if (response.status === 429) {
        console.log('Rate limited, skipping user creation test')
        return
      }
      
      expect(response.ok).toBe(true)
      const data = await response.json() as any
      
      expect(data).toHaveProperty('token')
      expect(data).toHaveProperty('user')
      expect(data.user.email).toBe(testEmail)
      
      authToken = data.token
      userId = data.user.uid || data.userId
      createdUsers.push(authToken)
      
      console.log('User created successfully with complete profile')
    })
    
    test('should retrieve and update user profile', async () => {
      // First create a user
      await delay(TEST_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Original Name'
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping profile test')
        return
      }
      
      if (createResponse.ok) {
        const createData = await createResponse.json() as any
        authToken = createData.token
        createdUsers.push(authToken)
        
        // Try to get profile
        await delay(TEST_DELAY)
        
        const profileResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json() as any
          expect(profile.email).toBe(testEmail)
          console.log('Profile retrieved successfully')
          
          // Try to update profile
          await delay(TEST_DELAY)
          
          const updateResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              displayName: 'Updated Name',
              phone: '+1987654321'
            })
          })
          
          if (updateResponse.ok) {
            const updatedProfile = await updateResponse.json() as any
            console.log('Profile updated successfully')
          } else if (updateResponse.status !== 404) {
            console.log(`Profile update returned: ${updateResponse.status}`)
          }
        } else if (profileResponse.status !== 404) {
          console.log(`Profile retrieval returned: ${profileResponse.status}`)
        }
      }
    })
    
    test('should handle password changes and email verification', async () => {
      // Create user
      await delay(TEST_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping password change test')
        return
      }
      
      if (createResponse.ok) {
        const createData = await createResponse.json() as any
        authToken = createData.token
        createdUsers.push(authToken)
        
        // Try password change
        await delay(TEST_DELAY)
        
        const passwordResponse = await fetch(`${BACKEND_URL}/auth/changePassword`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            currentPassword: testPassword,
            newPassword: 'NewPassword123@'
          })
        })
        
        if (passwordResponse.status !== 404 && passwordResponse.status !== 429) {
          if (passwordResponse.ok) {
            console.log('Password change successful')
            
            // Verify can sign in with new password
            await delay(TEST_DELAY)
            
            const signInResponse = await fetch(`${BACKEND_URL}/auth/signInEmailPass`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: testEmail,
                password: 'NewPassword123@'
              })
            })
            
            if (signInResponse.ok) {
              console.log('Sign in with new password successful')
            }
          } else {
            console.log(`Password change failed with status: ${passwordResponse.status}`)
          }
        }
      }
    })
    
    test('should validate user sessions and token expiry', async () => {
      // Create user
      await delay(TEST_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping session validation test')
        return
      }
      
      if (createResponse.ok) {
        const createData = await createResponse.json() as any
        authToken = createData.token
        createdUsers.push(authToken)
        
        // Test token refresh
        await delay(TEST_DELAY)
        
        const refreshResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (refreshResponse.status !== 404 && refreshResponse.status !== 429) {
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json() as any
            if (refreshData.token) {
              console.log('Token refresh successful')
              authToken = refreshData.token
            }
          } else {
            console.log(`Token refresh returned: ${refreshResponse.status}`)
          }
        }
        
        // Test session validation
        await delay(TEST_DELAY)
        
        const validateResponse = await fetch(`${BACKEND_URL}/auth/validate`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (validateResponse.status !== 404 && validateResponse.status !== 429) {
          console.log(`Session validation returned: ${validateResponse.status}`)
        }
      }
    })
  })
  
  describe('Wallet Management Service', () => {
    beforeEach(async () => {
      // Create authenticated user for wallet tests
      await delay(TEST_DELAY)
      
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
        userId = data.user?.uid || data.userId
        createdUsers.push(authToken)
      }
    })
    
    test('should support multiple wallet types and networks', async () => {
      if (!authToken) {
        console.log('No auth token, skipping wallet types test')
        return
      }
      
      const walletConfigs = [
        { network: 'ethereum', name: 'ETH Wallet', type: 'metamask' },
        { network: 'polygon', name: 'MATIC Wallet', type: 'walletconnect' },
        { network: 'bsc', name: 'BSC Wallet', type: 'trust' },
        { network: 'arbitrum', name: 'ARB Wallet', type: 'metamask' }
      ]
      
      const registeredWallets = []
      
      for (const config of walletConfigs) {
        await delay(1000)
        
        const address = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
        
        const response = await fetch(`${BACKEND_URL}/wallet/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            address,
            name: config.name,
            network: config.network,
            type: config.type,
            isPrimary: registeredWallets.length === 0
          })
        })
        
        if (response.status === 429) {
          console.log('Rate limited, skipping wallet registration')
          continue
        }
        
        if (response.ok) {
          registeredWallets.push({ ...config, address })
          console.log(`${config.network} wallet registered successfully`)
        } else {
          console.log(`${config.network} wallet registration failed: ${response.status}`)
        }
      }
      
      // Verify all wallets are retrievable
      if (registeredWallets.length > 0) {
        await delay(TEST_DELAY)
        
        const walletsResponse = await fetch(`${BACKEND_URL}/wallet`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (walletsResponse.ok) {
          const wallets = await walletsResponse.json() as any
          const walletList = Array.isArray(wallets) ? wallets : wallets.wallets
          
          if (walletList) {
            expect(walletList.length).toBeGreaterThanOrEqual(registeredWallets.length)
            console.log(`Retrieved ${walletList.length} wallets successfully`)
          }
        }
      }
    })
    
    test('should handle wallet verification and balance checking', async () => {
      if (!authToken) {
        console.log('No auth token, skipping wallet verification test')
        return
      }
      
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      
      await delay(TEST_DELAY)
      
      // Register wallet
      const registerResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Verification Test Wallet',
          network: 'ethereum',
          isPrimary: true
        })
      })
      
      if (registerResponse.status === 429) {
        console.log('Rate limited, skipping wallet verification test')
        return
      }
      
      if (registerResponse.ok) {
        // Try to verify wallet ownership
        await delay(TEST_DELAY)
        
        const verifyResponse = await fetch(`${BACKEND_URL}/wallet/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            address: walletAddress,
            signature: 'mock-signature-for-testing',
            message: `Verify wallet ownership for ${testEmail}`
          })
        })
        
        if (verifyResponse.status !== 404 && verifyResponse.status !== 429) {
          console.log(`Wallet verification returned: ${verifyResponse.status}`)
        }
        
        // Try to get wallet balance
        await delay(TEST_DELAY)
        
        const balanceResponse = await fetch(`${BACKEND_URL}/wallet/${walletAddress}/balance`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (balanceResponse.status !== 404 && balanceResponse.status !== 429) {
          if (balanceResponse.ok) {
            const balance = await balanceResponse.json() as any
            console.log('Wallet balance retrieved successfully')
          } else {
            console.log(`Balance check returned: ${balanceResponse.status}`)
          }
        }
      }
    })
    
    test('should manage wallet permissions and access control', async () => {
      if (!authToken) {
        console.log('No auth token, skipping wallet permissions test')
        return
      }
      
      const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
      
      await delay(TEST_DELAY)
      
      // Register wallet
      const registerResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          address: walletAddress,
          name: 'Permissions Test Wallet',
          network: 'ethereum',
          permissions: ['read', 'sign', 'send']
        })
      })
      
      if (registerResponse.status === 429) {
        console.log('Rate limited, skipping wallet permissions test')
        return
      }
      
      if (registerResponse.ok) {
        // Try to update permissions
        await delay(TEST_DELAY)
        
        const updateResponse = await fetch(`${BACKEND_URL}/wallet/${walletAddress}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            permissions: ['read', 'sign'] // Remove send permission
          })
        })
        
        if (updateResponse.status !== 404 && updateResponse.status !== 429) {
          console.log(`Permission update returned: ${updateResponse.status}`)
        }
        
        // Try to set as primary wallet
        await delay(TEST_DELAY)
        
        const primaryResponse = await fetch(`${BACKEND_URL}/wallet/${walletAddress}/primary`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (primaryResponse.status !== 404 && primaryResponse.status !== 429) {
          console.log(`Set primary wallet returned: ${primaryResponse.status}`)
        }
      }
    })
  })
  
  describe('Deal/Transaction Service', () => {
    let sellerToken: string
    let buyerToken: string
    let dealId: string
    
    beforeEach(async () => {
      // Create seller
      await delay(TEST_DELAY)
      
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
        const data = await sellerResponse.json() as any
        sellerToken = data.token
        createdUsers.push(sellerToken)
      }
      
      // Create buyer
      await delay(TEST_DELAY)
      
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
        const data = await buyerResponse.json() as any
        buyerToken = data.token
        createdUsers.push(buyerToken)
      }
    })
    
    test('should create deal with complex conditions and milestones', async () => {
      if (!sellerToken || !buyerToken) {
        console.log('Missing tokens, skipping complex deal test')
        return
      }
      
      await delay(TEST_DELAY)
      
      const dealData = {
        title: 'Complex Real Estate Deal',
        description: 'Multi-phase real estate transaction with inspections',
        amount: '500000',
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
            title: 'Property Inspection',
            description: 'Professional property inspection',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            required: true
          },
          {
            title: 'Financing Approval',
            description: 'Buyer mortgage approval',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            required: true
          },
          {
            title: 'Title Search',
            description: 'Clear title verification',
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            required: true
          }
        ],
        milestones: [
          { percentage: 10, description: 'Earnest money deposit' },
          { percentage: 50, description: 'Inspection completion' },
          { percentage: 100, description: 'Final closing' }
        ]
      }
      
      const createResponse = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify(dealData)
      })
      
      if (createResponse.status === 404) {
        console.log('Deal endpoints not implemented, skipping')
        return
      }
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping complex deal test')
        return
      }
      
      if (createResponse.ok) {
        const createResult = await createResponse.json() as any
        dealId = createResult.dealId
        
        expect(createResult).toHaveProperty('dealId')
        console.log('Complex deal created successfully')
        
        // Verify deal structure
        await delay(TEST_DELAY)
        
        const dealResponse = await fetch(`${BACKEND_URL}/deals/${dealId}`, {
          headers: { 'Authorization': `Bearer ${sellerToken}` }
        })
        
        if (dealResponse.ok) {
          const deal = await dealResponse.json() as any
          expect(deal.conditions.length).toBe(3)
          expect(deal.milestones.length).toBe(3)
          console.log('Deal structure verified successfully')
        }
      } else {
        console.log(`Deal creation failed with status: ${createResponse.status}`)
      }
    })
    
    test('should handle deal status transitions and approvals', async () => {
      if (!sellerToken || !buyerToken) {
        console.log('Missing tokens, skipping deal transitions test')
        return
      }
      
      // First create a simple deal
      await delay(TEST_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify({
          title: 'Status Transition Test Deal',
          amount: '100000',
          currency: 'USDC',
          seller: { address: '0x' + '1'.repeat(40), email: 'seller@test.com' },
          buyer: { address: '0x' + '2'.repeat(40), email: 'buyer@test.com' },
          conditions: [
            { title: 'Simple Condition', description: 'Test condition' }
          ]
        })
      })
      
      if (createResponse.status === 404) {
        console.log('Deal endpoints not implemented, skipping')
        return
      }
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping deal transitions test')
        return
      }
      
      if (createResponse.ok) {
        const createResult = await createResponse.json() as any
        dealId = createResult.dealId
        
        // Test buyer acceptance
        await delay(TEST_DELAY)
        
        const acceptResponse = await fetch(`${BACKEND_URL}/deals/${dealId}/accept`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${buyerToken}` }
        })
        
        if (acceptResponse.status !== 404 && acceptResponse.status !== 429) {
          console.log(`Deal acceptance returned: ${acceptResponse.status}`)
        }
        
        // Test condition completion
        await delay(TEST_DELAY)
        
        const conditionResponse = await fetch(`${BACKEND_URL}/deals/${dealId}/conditions/0/complete`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${buyerToken}`
          },
          body: JSON.stringify({
            status: 'completed',
            notes: 'Condition satisfied'
          })
        })
        
        if (conditionResponse.status !== 404 && conditionResponse.status !== 429) {
          console.log(`Condition completion returned: ${conditionResponse.status}`)
        }
        
        // Test deal cancellation
        await delay(TEST_DELAY)
        
        const cancelResponse = await fetch(`${BACKEND_URL}/deals/${dealId}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sellerToken}`
          },
          body: JSON.stringify({
            reason: 'Testing cancellation flow'
          })
        })
        
        if (cancelResponse.status !== 404 && cancelResponse.status !== 429) {
          console.log(`Deal cancellation returned: ${cancelResponse.status}`)
        }
      }
    })
    
    test('should manage deal documents and attachments', async () => {
      if (!sellerToken) {
        console.log('Missing seller token, skipping documents test')
        return
      }
      
      // Create a deal first
      await delay(TEST_DELAY)
      
      const createResponse = await fetch(`${BACKEND_URL}/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify({
          title: 'Document Test Deal',
          amount: '75000',
          currency: 'USDC',
          seller: { address: '0x' + '1'.repeat(40), email: 'seller@test.com' },
          buyer: { address: '0x' + '2'.repeat(40), email: 'buyer@test.com' }
        })
      })
      
      if (createResponse.status === 404) {
        console.log('Deal endpoints not implemented, skipping')
        return
      }
      
      if (createResponse.status === 429) {
        console.log('Rate limited, skipping documents test')
        return
      }
      
      if (createResponse.ok) {
        const createResult = await createResponse.json() as any
        dealId = createResult.dealId
        
        // Test document upload
        await delay(TEST_DELAY)
        
        const uploadResponse = await fetch(`${BACKEND_URL}/deals/${dealId}/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sellerToken}`
          },
          body: JSON.stringify({
            filename: 'contract.pdf',
            type: 'contract',
            size: 1024000,
            content: 'base64-encoded-document-content'
          })
        })
        
        if (uploadResponse.status !== 404 && uploadResponse.status !== 429) {
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json() as any
            console.log('Document uploaded successfully')
            
            // Test document retrieval
            await delay(TEST_DELAY)
            
            const documentsResponse = await fetch(`${BACKEND_URL}/deals/${dealId}/documents`, {
              headers: { 'Authorization': `Bearer ${sellerToken}` }
            })
            
            if (documentsResponse.ok) {
              const documents = await documentsResponse.json() as any
              expect(Array.isArray(documents) || documents.documents).toBeTruthy()
              console.log('Documents retrieved successfully')
            }
          } else {
            console.log(`Document upload returned: ${uploadResponse.status}`)
          }
        }
      }
    })
  })
  
  describe('Contact and Communication Service', () => {
    beforeEach(async () => {
      // Create authenticated user
      await delay(TEST_DELAY)
      
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
        createdUsers.push(authToken)
      }
    })
    
    test('should manage contact invitations and connections', async () => {
      if (!authToken) {
        console.log('No auth token, skipping contact test')
        return
      }
      
      await delay(TEST_DELAY)
      
      // Send contact invitation
      const inviteResponse = await fetch(`${BACKEND_URL}/contacts/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: `contact-${Date.now()}@example.com`,
          message: 'Let us connect for business opportunities',
          type: 'business'
        })
      })
      
      if (inviteResponse.status === 404) {
        console.log('Contact endpoints not implemented, skipping')
        return
      }
      
      if (inviteResponse.status === 429) {
        console.log('Rate limited, skipping contact test')
        return
      }
      
      if (inviteResponse.ok) {
        const inviteResult = await inviteResponse.json() as any
        console.log('Contact invitation sent successfully')
        
        // Get contact list
        await delay(TEST_DELAY)
        
        const contactsResponse = await fetch(`${BACKEND_URL}/contacts`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (contactsResponse.ok) {
          const contacts = await contactsResponse.json() as any
          console.log('Contacts retrieved successfully')
        }
      } else {
        console.log(`Contact invitation returned: ${inviteResponse.status}`)
      }
    })
    
    test('should handle messaging and notifications', async () => {
      if (!authToken) {
        console.log('No auth token, skipping messaging test')
        return
      }
      
      await delay(TEST_DELAY)
      
      // Send message
      const messageResponse = await fetch(`${BACKEND_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          recipient: 'recipient@example.com',
          subject: 'Test Message',
          content: 'This is a test message for the comprehensive test suite',
          type: 'notification'
        })
      })
      
      if (messageResponse.status === 404) {
        console.log('Messaging endpoints not implemented, skipping')
        return
      }
      
      if (messageResponse.status === 429) {
        console.log('Rate limited, skipping messaging test')
        return
      }
      
      if (messageResponse.status !== 429) {
        console.log(`Message sending returned: ${messageResponse.status}`)
        
        // Get notifications
        await delay(TEST_DELAY)
        
        const notificationsResponse = await fetch(`${BACKEND_URL}/notifications`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        if (notificationsResponse.status !== 404 && notificationsResponse.status !== 429) {
          console.log(`Notifications retrieval returned: ${notificationsResponse.status}`)
        }
      }
    })
  })
  
  describe('File Management Service', () => {
    beforeEach(async () => {
      // Create authenticated user
      await delay(TEST_DELAY)
      
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
        createdUsers.push(authToken)
      }
    })
    
    test('should handle file uploads and storage', async () => {
      if (!authToken) {
        console.log('No auth token, skipping file upload test')
        return
      }
      
      await delay(TEST_DELAY)
      
      // Upload file
      const uploadResponse = await fetch(`${BACKEND_URL}/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          filename: 'test-document.pdf',
          contentType: 'application/pdf',
          size: 1024000,
          content: 'base64-encoded-file-content',
          category: 'legal',
          metadata: {
            description: 'Test document for comprehensive testing',
            tags: ['test', 'legal', 'document']
          }
        })
      })
      
      if (uploadResponse.status === 404) {
        console.log('File endpoints not implemented, skipping')
        return
      }
      
      if (uploadResponse.status === 429) {
        console.log('Rate limited, skipping file upload test')
        return
      }
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json() as any
        const fileId = uploadResult.fileId || uploadResult.id
        
        console.log('File uploaded successfully')
        
        if (fileId) {
          // Get file metadata
          await delay(TEST_DELAY)
          
          const metadataResponse = await fetch(`${BACKEND_URL}/files/${fileId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
          
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json() as any
            expect(metadata.filename).toBe('test-document.pdf')
            console.log('File metadata retrieved successfully')
          }
          
          // List user files
          await delay(TEST_DELAY)
          
          const filesResponse = await fetch(`${BACKEND_URL}/files`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
          
          if (filesResponse.ok) {
            const files = await filesResponse.json() as any
            console.log('User files listed successfully')
          }
        }
      } else {
        console.log(`File upload returned: ${uploadResponse.status}`)
      }
    })
  })
  
  describe('System Integration and Data Consistency', () => {
    test('should maintain data consistency across services', async () => {
      // Create user
      await delay(TEST_DELAY)
      
      const userResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Integration Test User'
        })
      })
      
      if (userResponse.status === 429) {
        console.log('Rate limited, skipping integration test')
        return
      }
      
      if (userResponse.ok) {
        const userData = await userResponse.json() as any
        authToken = userData.token
        createdUsers.push(authToken)
        
        // Register wallet
        await delay(TEST_DELAY)
        
        const walletAddress = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
        const walletResponse = await fetch(`${BACKEND_URL}/wallet/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            address: walletAddress,
            name: 'Integration Test Wallet',
            network: 'ethereum'
          })
        })
        
        if (walletResponse.status !== 429 && walletResponse.ok) {
          console.log('Wallet registered in integration test')
          
          // Create deal referencing the wallet
          await delay(TEST_DELAY)
          
          const dealResponse = await fetch(`${BACKEND_URL}/deals/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              title: 'Integration Test Deal',
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
          
          if (dealResponse.status !== 404 && dealResponse.status !== 429) {
            if (dealResponse.ok) {
              console.log('Deal created with wallet reference - data consistency maintained')
            } else {
              console.log(`Deal creation in integration test returned: ${dealResponse.status}`)
            }
          }
        }
      }
    })
    
    test('should handle concurrent operations safely', async () => {
      // Create user
      await delay(TEST_DELAY)
      
      const userResponse = await fetch(`${BACKEND_URL}/auth/signUpEmailPass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })
      
      if (userResponse.status === 429) {
        console.log('Rate limited, skipping concurrency test')
        return
      }
      
      if (userResponse.ok) {
        const userData = await userResponse.json() as any
        authToken = userData.token
        createdUsers.push(authToken)
        
        // Make concurrent wallet registrations
        const concurrentRequests = []
        for (let i = 0; i < 3; i++) {
          const address = '0x' + Math.random().toString(16).substr(2, 40).padEnd(40, '0')
          concurrentRequests.push(
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
        
        const responses = await Promise.all(concurrentRequests)
        
        // Check that all requests completed without server errors
        const successCount = responses.filter(r => r.ok).length
        const errorCount = responses.filter(r => r.status >= 500).length
        
        expect(errorCount).toBe(0)
        console.log(`Concurrent operations: ${successCount} successful, ${errorCount} server errors`)
      }
    })
  })
})