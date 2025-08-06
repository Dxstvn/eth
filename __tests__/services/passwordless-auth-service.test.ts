import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { passwordlessAuthService } from '@/services/passwordless-auth-service'
import { apiClient } from '@/services/api/client'
import { auth } from '@/lib/firebase-client'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'

// Mock dependencies
vi.mock('@/services/api/client')
vi.mock('@/lib/firebase-client')
vi.mock('firebase/auth')

describe('PasswordlessAuthService', () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendSignInLink', () => {
    it('should send sign-in link for valid email', async () => {
      const mockResponse = { success: true, message: 'Link sent' }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await passwordlessAuthService.sendSignInLink('test@example.com')

      expect(apiClient.post).toHaveBeenCalledWith('/auth/passwordless/send-link', {
        email: 'test@example.com'
      })
      expect(result).toEqual(mockResponse)
      expect(localStorage.getItem('clearhold_email_for_signin')).toBe('test@example.com')
    })

    it('should validate email format', async () => {
      await expect(passwordlessAuthService.sendSignInLink('invalid-email'))
        .rejects.toThrow('Please enter a valid email address')
      
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('should handle rate limit errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: { status: 429, data: { error: 'Rate limit exceeded' } }
      })

      await expect(passwordlessAuthService.sendSignInLink('test@example.com'))
        .rejects.toThrow('Too many attempts. Please try again in 1 hour.')
    })

    it('should handle custom error messages from API', async () => {
      const customError = 'Email not allowed'
      vi.mocked(apiClient.post).mockRejectedValue({
        response: { data: { error: customError } }
      })

      await expect(passwordlessAuthService.sendSignInLink('test@example.com'))
        .rejects.toThrow(customError)
    })

    it('should handle generic errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      await expect(passwordlessAuthService.sendSignInLink('test@example.com'))
        .rejects.toThrow('Failed to send sign-in link. Please try again.')
    })

    it('should retry on network failures', async () => {
      // First call fails, second succeeds
      vi.mocked(apiClient.post)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true })

      const result = await passwordlessAuthService.sendSignInLink('test@example.com')

      expect(apiClient.post).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })
  })

  describe('verifySignInLink', () => {
    const mockLink = 'https://app.clearhold.com/auth/action?mode=signIn&oobCode=test'
    const mockUser = { uid: '123', getIdToken: vi.fn() }
    const mockIdToken = 'mock-id-token'
    const mockVerifyResponse = { 
      token: 'jwt-token', 
      user: { id: '123', email: 'test@example.com' }
    }

    beforeEach(() => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(true)
      vi.mocked(signInWithEmailLink).mockResolvedValue({ user: mockUser } as any)
      mockUser.getIdToken.mockResolvedValue(mockIdToken)
      vi.mocked(apiClient.post).mockResolvedValue(mockVerifyResponse)
    })

    it('should verify valid sign-in link', async () => {
      const result = await passwordlessAuthService.verifySignInLink('test@example.com', mockLink)

      expect(isSignInWithEmailLink).toHaveBeenCalledWith(auth, mockLink)
      expect(signInWithEmailLink).toHaveBeenCalledWith(auth, 'test@example.com', mockLink)
      expect(mockUser.getIdToken).toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledWith('/auth/passwordless/verify-token', {
        idToken: mockIdToken
      })
      expect(result).toEqual(mockVerifyResponse)
      // Should clear stored email after successful verification
      expect(localStorage.getItem('clearhold_email_for_signin')).toBeNull()
    })

    it('should reject invalid sign-in links', async () => {
      vi.mocked(isSignInWithEmailLink).mockReturnValue(false)

      await expect(passwordlessAuthService.verifySignInLink('test@example.com', 'invalid-link'))
        .rejects.toThrow('Invalid sign-in link')
      
      expect(signInWithEmailLink).not.toHaveBeenCalled()
    })

    it('should handle Firebase auth errors', async () => {
      vi.mocked(signInWithEmailLink).mockRejectedValue(new Error('Auth failed'))

      await expect(passwordlessAuthService.verifySignInLink('test@example.com', mockLink))
        .rejects.toThrow('Failed to verify sign-in link. Please try again.')
    })

    it('should handle API verification errors', async () => {
      const apiError = 'Token verification failed'
      vi.mocked(apiClient.post).mockRejectedValue({
        response: { data: { error: apiError } }
      })

      await expect(passwordlessAuthService.verifySignInLink('test@example.com', mockLink))
        .rejects.toThrow(apiError)
    })
  })

  describe('isSignInWithEmailLink', () => {
    it('should correctly identify sign-in links', () => {
      const validLink = 'https://app.clearhold.com/auth/action?mode=signIn&oobCode=test'
      vi.mocked(isSignInWithEmailLink).mockReturnValue(true)

      const result = passwordlessAuthService.isSignInWithEmailLink(validLink)

      expect(isSignInWithEmailLink).toHaveBeenCalledWith(auth, validLink)
      expect(result).toBe(true)
    })

    it('should reject non-sign-in links', () => {
      const invalidLink = 'https://example.com'
      vi.mocked(isSignInWithEmailLink).mockReturnValue(false)

      const result = passwordlessAuthService.isSignInWithEmailLink(invalidLink)

      expect(result).toBe(false)
    })
  })

  describe('Email Storage Methods', () => {
    describe('storeEmailForSignIn', () => {
      it('should store email in localStorage', () => {
        passwordlessAuthService.storeEmailForSignIn('test@example.com')
        
        expect(localStorageMock.setItem).toHaveBeenCalledWith('clearhold_email_for_signin', 'test@example.com')
        expect(localStorageMock.store['clearhold_email_for_signin']).toBe('test@example.com')
      })
    })

    describe('getEmailForSignIn', () => {
      it('should retrieve stored email', () => {
        localStorageMock.store['clearhold_email_for_signin'] = 'stored@example.com'
        
        const email = passwordlessAuthService.getEmailForSignIn()
        
        expect(email).toBe('stored@example.com')
      })

      it('should return null if no email stored', () => {
        const email = passwordlessAuthService.getEmailForSignIn()
        
        expect(email).toBeNull()
      })
    })

    describe('clearEmailForSignIn', () => {
      it('should clear stored email', () => {
        localStorageMock.store['clearhold_email_for_signin'] = 'test@example.com'
        
        passwordlessAuthService.clearEmailForSignIn()
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('clearhold_email_for_signin')
        expect(localStorageMock.store['clearhold_email_for_signin']).toBeUndefined()
      })
    })
  })

  describe('Retry Logic', () => {
    it('should retry up to 3 times with exponential backoff', async () => {
      let attempts = 0
      vi.mocked(apiClient.post).mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ success: true })
      })

      const start = Date.now()
      const result = await passwordlessAuthService.sendSignInLink('test@example.com')
      const duration = Date.now() - start

      expect(attempts).toBe(3)
      expect(result).toEqual({ success: true })
      // Should have delays between retries (at least 200ms for 2 retries)
      expect(duration).toBeGreaterThanOrEqual(200)
    })

    it('should not retry on 4xx errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue({
        response: { status: 400, data: { error: 'Bad request' } }
      })

      await expect(passwordlessAuthService.sendSignInLink('test@example.com'))
        .rejects.toThrow('Bad request')

      expect(apiClient.post).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      await expect(passwordlessAuthService.sendSignInLink('test@example.com'))
        .rejects.toThrow('Failed to send sign-in link. Please try again.')

      // The service calls the API and then retries 3 times, so 4 total
      expect(apiClient.post).toHaveBeenCalledTimes(4)
    })
  })
})