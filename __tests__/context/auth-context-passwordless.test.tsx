import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/context/auth-context-v2'
import { passwordlessAuthService } from '@/services/passwordless-auth-service'
import { apiClient } from '@/services/api/client'
import { useRouter } from 'next/navigation'
import React from 'react'

// Mock dependencies
vi.mock('@/services/passwordless-auth-service')
vi.mock('@/services/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}))
vi.mock('next/navigation')
vi.mock('@/lib/firebase-client', () => ({
  auth: {},
  db: {}
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signOut: vi.fn()
}))

// Import the actual AuthProvider
import { AuthProvider } from '@/context/auth-context-v2'

// Create wrapper component for context
const wrapper = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext - Passwordless Methods', () => {
  const mockPush = vi.fn()
  
  // Mock localStorage
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock.store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock.store[key]
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {}
    })
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
    
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
  })

  describe('sendPasswordlessLink', () => {
    it('should send passwordless link successfully', async () => {
      const mockResponse = { success: true }
      vi.mocked(passwordlessAuthService.sendSignInLink).mockResolvedValue(mockResponse)
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.sendPasswordlessLink('test@example.com')
      })
      
      expect(passwordlessAuthService.sendSignInLink).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle errors when sending link fails', async () => {
      const errorMessage = 'Failed to send link'
      vi.mocked(passwordlessAuthService.sendSignInLink).mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await expect(
        act(async () => {
          await result.current.sendPasswordlessLink('test@example.com')
        })
      ).rejects.toThrow(errorMessage)
    })

    it('should track passwordless email in state', async () => {
      vi.mocked(passwordlessAuthService.sendSignInLink).mockResolvedValue({ success: true })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.sendPasswordlessLink('test@example.com')
      })
      
      expect(result.current.passwordlessEmail).toBe('test@example.com')
    })
  })

  describe('verifyPasswordlessLink', () => {
    const mockVerifyResponse = {
      success: true,
      token: 'jwt-token-123',
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true
      }
    }

    it('should verify passwordless link successfully', async () => {
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue(mockVerifyResponse)
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      expect(passwordlessAuthService.verifySignInLink).toHaveBeenCalledWith(
        'test@example.com',
        'https://app.clearhold.com/auth?code=123'
      )
      expect(localStorageMock.store['clearhold_auth_token']).toBe('jwt-token-123')
    })

    it('should update auth state after successful verification', async () => {
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue(mockVerifyResponse)
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      await waitFor(() => {
        // The initial user object has empty displayName until refreshProfile completes
        expect(result.current.user).toBeTruthy()
        expect(result.current.user?.uid).toBe('user-123')
        expect(result.current.user?.email).toBe('test@example.com')
        expect(result.current.isPasswordlessSignIn).toBe(false) // Reset after successful verification
      })
    })

    it('should redirect to dashboard for existing users', async () => {
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue({
        ...mockVerifyResponse,
        isNewUser: false
      })
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      // Wait for redirect (redirectToDashboard uses setTimeout)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      }, { timeout: 2000 })
    })

    it('should redirect to onboarding for new users', async () => {
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue({
        ...mockVerifyResponse,
        isNewUser: true
      })
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      // Wait for redirect (router.push is called directly for onboarding)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
      })
    })

    it('should handle verification errors', async () => {
      const errorMessage = 'Invalid or expired link'
      vi.mocked(passwordlessAuthService.verifySignInLink).mockRejectedValue(new Error(errorMessage))
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await expect(
        act(async () => {
          await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
        })
      ).rejects.toThrow(errorMessage)
      
      expect(result.current.user).toBeNull()
      expect(localStorageMock.store['clearhold_auth_token']).toBeUndefined()
    })

    it('should clear passwordless email after successful verification', async () => {
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue(mockVerifyResponse)
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Mock sendSignInLink to set the email
      vi.mocked(passwordlessAuthService.sendSignInLink).mockResolvedValue({ success: true })
      
      // Set initial passwordless email
      await act(async () => {
        await result.current.sendPasswordlessLink('test@example.com')
      })
      
      expect(result.current.passwordlessEmail).toBe('test@example.com')
      
      // Verify link
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      expect(result.current.passwordlessEmail).toBeNull()
    })
  })

  describe('Token Management with Passwordless', () => {
    it('should schedule token refresh for passwordless tokens', async () => {
      const mockVerifyResponse = {
        success: true,
        token: 'jwt-token-123',
        expiresIn: 3600, // 1 hour
        user: {
          uid: 'user-123',
          email: 'test@example.com',
          emailVerified: true
        },
        isNewUser: false
      }
      
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue(mockVerifyResponse)
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      // Should have stored the auth token
      expect(result.current.authToken).toBe('jwt-token-123')
    })
  })

  describe('Loading States', () => {
    it('should handle loading state during passwordless operations', async () => {
      // The auth context manages loading state during verification
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue({
        success: true,
        token: 'jwt-token-123',
        user: {
          uid: 'user-123',
          email: 'test@example.com',
          emailVerified: true
        },
        isNewUser: false
      })
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Initial state
      expect(result.current.loading).toBe(false)
      
      // Perform verification
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      // After completion
      expect(result.current.loading).toBe(false)
      expect(result.current.user).toBeTruthy()
    })
  })

  describe('Sign Out with Passwordless', () => {
    it('should clear passwordless state on sign out', async () => {
      // Set up authenticated state
      vi.mocked(passwordlessAuthService.verifySignInLink).mockResolvedValue({
        success: true,
        token: 'jwt-token-123',
        user: {
          uid: 'user-123',
          email: 'test@example.com',
          emailVerified: true
        },
        isNewUser: false
      })
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true,
          photoURL: null,
          wallet: null,
          kycStatus: 'not_started',
          isAdmin: false
        }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Sign in with passwordless
      await act(async () => {
        await result.current.verifyPasswordlessLink('test@example.com', 'https://app.clearhold.com/auth?code=123')
      })
      
      // After successful verification, isPasswordlessSignIn is reset to false
      expect(result.current.user).toBeTruthy()
      expect(result.current.authToken).toBeTruthy()
      
      // Sign out
      await act(async () => {
        await result.current.signOut()
      })
      
      expect(result.current.isPasswordlessSignIn).toBe(false)
      expect(result.current.passwordlessEmail).toBeNull()
    })
  })
})