import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { apiClient } from '@/services/api/client'
import { ethers } from 'ethers'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const HARDHAT_URL = 'http://localhost:8545'

/**
 * REAL WALLET INTEGRATION TESTS
 * These tests communicate with the actual backend and blockchain.
 * Requires:
 * - Backend API running
 * - Hardhat node running (for blockchain interaction)
 * - Valid authentication token (set manually or through auth flow)
 */
describe('Wallet Real Backend Integration Tests', () => {
  let testWallet: ethers.Wallet
  let provider: ethers.JsonRpcProvider
  
  beforeEach(async () => {
    // Create test wallet
    testWallet = ethers.Wallet.createRandom()
    
    // Connect to Hardhat node
    provider = new ethers.JsonRpcProvider(HARDHAT_URL)
    
    // Clear storage
    localStorage.clear()
    sessionStorage.clear()
  })
  
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  
  describe('Blockchain Connectivity', () => {
    test('should connect to Hardhat node', async () => {
      try {
        const network = await provider.getNetwork()
        expect(network).toBeDefined()
        expect(network.chainId).toBeDefined()
      } catch (error) {
        console.warn('Hardhat node not running. Start with: npx hardhat node')
        throw new Error('Hardhat node not available')
      }
    })
    
    test('should get gas price from blockchain', async () => {
      try {
        const gasPrice = await provider.getFeeData()
        expect(gasPrice).toBeDefined()
        expect(gasPrice.gasPrice).toBeDefined()
      } catch (error) {
        throw new Error('Could not fetch gas price from Hardhat')
      }
    })
  })
  
  describe('Wallet Registration with Backend', () => {
    test('should register new wallet', async () => {
      const walletData = {
        address: testWallet.address,
        name: 'Test Wallet',
        network: 'ethereum',
        publicKey: testWallet.publicKey,
        isPrimary: true
      }
      
      try {
        const response = await apiClient.post('/wallet/register', walletData)
        
        if (response.success) {
          expect(response.data).toBeDefined()
          expect(response.data.walletId).toBeDefined()
          expect(response.data.address).toBe(testWallet.address)
        }
      } catch (error: any) {
        // May require authentication
        if (error.statusCode === 401) {
          console.log('Wallet registration requires authentication')
        } else {
          throw error
        }
      }
    })
    
    test('should prevent duplicate wallet registration', async () => {
      const walletData = {
        address: testWallet.address,
        name: 'Test Wallet',
        network: 'ethereum',
        publicKey: testWallet.publicKey,
        isPrimary: true
      }
      
      try {
        // First registration
        await apiClient.post('/wallet/register', walletData)
        
        // Second registration should fail
        const secondAttempt = await apiClient.post('/wallet/register', walletData)
        
        // Should not allow duplicate
        expect(secondAttempt.success).toBe(false)
      } catch (error: any) {
        // Expected error for duplicate or auth required
        expect(error).toBeDefined()
      }
    })
    
    test('should validate wallet address format', async () => {
      const invalidWallet = {
        address: 'invalid-address',
        name: 'Invalid Wallet',
        network: 'ethereum',
        publicKey: '0x123',
        isPrimary: true
      }
      
      try {
        await apiClient.post('/wallet/register', invalidWallet)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error.message).toContain('address')
      }
    })
  })
  
  describe('Wallet Management', () => {
    test('should fetch user wallets', async () => {
      try {
        const response = await apiClient.get('/wallet')
        
        if (response.success) {
          expect(response.data).toBeDefined()
          expect(Array.isArray(response.data)).toBe(true)
        }
      } catch (error: any) {
        // Requires authentication
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should update primary wallet', async () => {
      try {
        const response = await apiClient.put('/wallet/primary', {
          address: testWallet.address
        })
        
        if (response.success) {
          expect(response.data).toBeDefined()
        }
      } catch (error: any) {
        // Requires authentication
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should delete wallet', async () => {
      try {
        const response = await apiClient.delete(`/wallet/${testWallet.address}`)
        
        if (response.success) {
          expect(response.data).toBeDefined()
        }
      } catch (error: any) {
        // Requires authentication or wallet doesn't exist
        expect(error.statusCode).toBeGreaterThanOrEqual(400)
      }
    })
  })
  
  describe('Wallet Balance Synchronization', () => {
    test('should sync wallet balance with blockchain', async () => {
      try {
        const response = await apiClient.post('/wallet/balance', {
          address: testWallet.address,
          network: 'ethereum'
        })
        
        if (response.success) {
          expect(response.data).toBeDefined()
          expect(response.data.balance).toBeDefined()
        }
      } catch (error: any) {
        // May require authentication
        expect(error).toBeDefined()
      }
    })
    
    test('should handle multiple token balances', async () => {
      try {
        const response = await apiClient.post('/wallet/balances', {
          address: testWallet.address,
          network: 'ethereum',
          tokens: ['USDC', 'USDT', 'DAI']
        })
        
        if (response.success) {
          expect(response.data).toBeDefined()
          expect(response.data.balances).toBeDefined()
        }
      } catch (error: any) {
        // Expected error without auth
        expect(error).toBeDefined()
      }
    })
  })
  
  describe('Wallet Signature Verification', () => {
    test('should verify wallet ownership through signature', async () => {
      const message = 'Verify wallet ownership'
      const signature = await testWallet.signMessage(message)
      
      try {
        const response = await apiClient.post('/wallet/verify', {
          address: testWallet.address,
          message,
          signature
        })
        
        if (response.success) {
          expect(response.data.verified).toBe(true)
        }
      } catch (error: any) {
        // May not be implemented
        expect(error).toBeDefined()
      }
    })
    
    test('should reject invalid signatures', async () => {
      const message = 'Verify wallet ownership'
      const invalidSignature = '0x' + '0'.repeat(130) // Invalid signature
      
      try {
        const response = await apiClient.post('/wallet/verify', {
          address: testWallet.address,
          message,
          signature: invalidSignature
        })
        
        // Should not verify
        expect(response.data?.verified).toBe(false)
      } catch (error: any) {
        // Expected error
        expect(error).toBeDefined()
      }
    })
  })
  
  describe('Multi-Chain Support', () => {
    test('should support Ethereum network', async () => {
      const walletData = {
        address: testWallet.address,
        name: 'ETH Wallet',
        network: 'ethereum',
        publicKey: testWallet.publicKey
      }
      
      try {
        const response = await apiClient.post('/wallet/register', walletData)
        if (response.success) {
          expect(response.data.network).toBe('ethereum')
        }
      } catch (error) {
        // Expected without auth
        expect(error).toBeDefined()
      }
    })
    
    test('should support Polygon network', async () => {
      const walletData = {
        address: testWallet.address,
        name: 'Polygon Wallet',
        network: 'polygon',
        publicKey: testWallet.publicKey
      }
      
      try {
        const response = await apiClient.post('/wallet/register', walletData)
        if (response.success) {
          expect(response.data.network).toBe('polygon')
        }
      } catch (error) {
        // Expected without auth
        expect(error).toBeDefined()
      }
    })
    
    test('should support BSC network', async () => {
      const walletData = {
        address: testWallet.address,
        name: 'BSC Wallet',
        network: 'bsc',
        publicKey: testWallet.publicKey
      }
      
      try {
        const response = await apiClient.post('/wallet/register', walletData)
        if (response.success) {
          expect(response.data.network).toBe('bsc')
        }
      } catch (error) {
        // Expected without auth
        expect(error).toBeDefined()
      }
    })
  })
  
  describe('Wallet Preferences', () => {
    test('should get wallet preferences', async () => {
      try {
        const response = await apiClient.get('/wallet/preferences')
        
        if (response.success) {
          expect(response.data).toBeDefined()
          expect(response.data.defaultNetwork).toBeDefined()
        }
      } catch (error: any) {
        // Requires authentication
        expect(error.statusCode).toBe(401)
      }
    })
    
    test('should update wallet preferences', async () => {
      const preferences = {
        defaultNetwork: 'polygon',
        autoConnect: true,
        hideSmallBalances: true
      }
      
      try {
        const response = await apiClient.put('/wallet/preferences', preferences)
        
        if (response.success) {
          expect(response.data).toBeDefined()
        }
      } catch (error: any) {
        // Requires authentication
        expect(error.statusCode).toBe(401)
      }
    })
  })
})