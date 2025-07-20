/**
 * Backend Integration Tests
 * 
 * These tests verify the auth context integration with mocked backend responses.
 * They test the frontend auth context behavior with various backend scenarios.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/auth-context'
import React from 'react'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock localStorage for tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock Firebase auth
jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn((callback) => {
      // Simulate no user signed in initially
      callback(null)
      return jest.fn() // Return unsubscribe function
    }),
  },
  googleProvider: {},
}))

const STAGING_API_URL = 'https://api.clearhold.app'

// Helper function to create proper Response mocks
const createMockResponse = (data: any, options: { ok?: boolean; status?: number } = {}) => ({
  ok: options.ok !== false,
  status: options.status || (options.ok !== false ? 200 : 400),
  headers: { 
    get: (name: string) => name === 'content-type' ? 'application/json' : null 
  } as any,
  json: async () => data,
} as Response)

describe('Backend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    localStorageMock.clear()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Reset fetch mock
    global.fetch = jest.fn()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('Auth Context Initialization', () => {
    it('should initialize auth context without crashing', async () => {
      // Mock successful health check
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Wait for context to finish loading
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 5000 })

      expect(result.current).toBeDefined()
      expect(typeof result.current.signUpWithEmail).toBe('function')
      expect(typeof result.current.signInWithEmail).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
    })

    it('should load existing token from localStorage', async () => {
      // Mock existing token
      localStorageMock.getItem.mockReturnValue('existing-token')

      // Mock health check
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.authToken).toBe('existing-token')
    })
  })

  describe('Sign Up Integration', () => {
    it('should handle successful sign up with mocked backend', async () => {
      const testEmail = `signup-${Date.now()}@example.com`
      const testPassword = 'SignUpTest123!'

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock health check
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      // Mock sign up response
      mockFetch.mockResolvedValueOnce(createMockResponse({
        message: 'User created successfully',
        user: {
          uid: 'test-uid',
          email: testEmail,
          emailVerified: false,
        },
        token: 'test-signup-token',
        profile: {
          isNewUser: true,
          registrationMethod: 'email',
        },
      }))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signUpWithEmail(testEmail, testPassword)
      })

      // Verify token was stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'test-signup-token')
      expect(result.current.authToken).toBe('test-signup-token')
    })

    it('should handle sign up errors from backend', async () => {
      const testEmail = 'error@example.com'
      const testPassword = 'ErrorTest123!'

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock health check
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      // Mock error response
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Email already exists' },
        { ok: false, status: 400 }
      ))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.signUpWithEmail(testEmail, testPassword)
          fail('Expected sign up to throw an error')
        } catch (error: any) {
          expect(error.message).toContain('Email already exists')
        }
      })

      expect(result.current.authToken).toBeNull()
    })
  })

  describe('Sign In Integration', () => {
    it('should handle successful sign in with mocked backend', async () => {
      const testEmail = `signin-${Date.now()}@example.com`
      const testPassword = 'SignInTest123!'

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock health check
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      // Mock sign in response
      mockFetch.mockResolvedValueOnce(createMockResponse({
        message: 'User signed in successfully',
        user: {
          uid: 'existing-uid',
          email: testEmail,
          emailVerified: true,
        },
        token: 'test-signin-token',
        profile: {
          isNewUser: false,
          registrationMethod: 'email',
        },
      }))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signInWithEmail(testEmail, testPassword)
      })

      // Verify token was stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'test-signin-token')
      expect(result.current.authToken).toBe('test-signin-token')
    })

    it('should handle invalid credentials error', async () => {
      const testEmail = 'invalid@example.com'
      const testPassword = 'WrongPassword123!'

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock health check
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      // Mock error response
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Invalid credentials' },
        { ok: false, status: 401 }
      ))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.signInWithEmail(testEmail, testPassword)
          fail('Expected sign in to throw an error')
        } catch (error: any) {
          expect(error.message).toContain('Invalid credentials')
        }
      })

      expect(result.current.authToken).toBeNull()
    })
  })

  describe('Sign Out Integration', () => {
    it('should clear token and localStorage on sign out', async () => {
      // Start with an existing token
      localStorageMock.getItem.mockReturnValue('existing-token')

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      // Mock health check
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 'OK' }))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Verify token is loaded
      expect(result.current.authToken).toBe('existing-token')

      // Sign out
      await act(async () => {
        result.current.signOut()
      })

      // Verify token is cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken')
      expect(result.current.authToken).toBeNull()
    })
  })

}) 