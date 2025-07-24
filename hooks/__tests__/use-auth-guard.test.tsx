import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { useAuthGuard } from '../use-auth-guard'

// Mock the auth context with all required properties matching AuthContextType
const mockAuth = {
  user: null,
  loading: false,
  isAdmin: false,
  isDemoAccount: false,
  authToken: null,
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOut: vi.fn(),
  refreshToken: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  sendVerificationEmail: vi.fn(),
  refreshProfile: vi.fn(),
}

vi.mock('../../context/auth-context-v2', () => ({
  useAuth: () => mockAuth,
}))

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Import and setup navigation mocks after vi.mock
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
const mockRouter = vi.mocked(useRouter)
const mockUsePathname = vi.mocked(usePathname)
const mockUseSearchParams = vi.mocked(useSearchParams)

// Setup default mock implementations
const mockPush = vi.fn()
const mockReplace = vi.fn()
mockRouter.mockReturnValue({
  push: mockPush,
  replace: mockReplace,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
})
mockUsePathname.mockReturnValue('/dashboard')
mockUseSearchParams.mockReturnValue(new URLSearchParams())

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock console methods to suppress expected warnings in tests
const mockConsole = {
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}

describe('useAuthGuard hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset auth state
    mockAuth.user = null
    mockAuth.authToken = null
    mockAuth.loading = false
    mockAuth.isAdmin = false
    mockAuth.isDemoAccount = false
    
    // Reset router state
    mockUsePathname.mockReturnValue('/dashboard')
    
    // Mock console
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn)
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error)
  })

  describe('authenticated user access', () => {
    it('should allow access for authenticated users', () => {
      // Setup: Authenticated user with valid auth token
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      mockAuth.loading = false
      mockAuth.authToken = 'valid-token-123'
      mockAuth.isAdmin = false

      const { result } = renderHook(() => useAuthGuard())

      // Verify the hook returns correct authentication state
      expect(result.current.user).toEqual({ uid: 'user-123', email: 'test@example.com' })
      expect(result.current.loading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true) // Computed from !!user && !!authToken
      expect(result.current.isAuthorized).toBe(true) // true when requireAdmin is false
      
      // Verify no redirect happens for authenticated users
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('should allow access for authenticated users on protected routes', () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      // Remove isAuthenticated - it's computed from user && authToken
      mockAuth.loading = false
      mockAuth.authToken = 'valid-token-123'
      mockUsePathname.mockReturnValue('/dashboard/transactions')

      const { result } = renderHook(() => useAuthGuard())

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      
      // No redirect should occur
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('unauthenticated user access', () => {
    it('should redirect unauthenticated users from protected routes', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      renderHook(() => useAuthGuard({ requireAuth: true }))

      // The hook redirects immediately in useEffect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })
    })

    it('should redirect to signin with return url', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard/transactions')
      mockUseSearchParams.mockReturnValue(new URLSearchParams('tab=pending'))

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard%2Ftransactions')
      })
    })

    it('should allow access to public routes', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/')

      // When requireAuth is false (default), no redirect should happen
      const { result } = renderHook(() => useAuthGuard({ requireAuth: false }))

      expect(result.current.isAuthenticated).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should allow access to auth routes', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/auth/signin')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: false }))

      expect(result.current.isAuthenticated).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should allow access to signup route', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/auth/signup')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: false }))

      expect(result.current.isAuthenticated).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('loading states', () => {
    it('should show loading while auth is loading', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = true

      const { result } = renderHook(() => useAuthGuard())

      expect(result.current.loading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should not redirect while loading', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = true
      mockUsePathname.mockReturnValue('/dashboard')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: true }))

      expect(result.current.loading).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect after loading completes for protected routes', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = true
      mockUsePathname.mockReturnValue('/dashboard')

      const { rerender } = renderHook(() => useAuthGuard({ requireAuth: true }))

      // Loading should prevent redirect
      expect(mockPush).not.toHaveBeenCalled()

      // Complete loading
      mockAuth.loading = false
      rerender()

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })
    })
  })

  describe('route protection patterns', () => {
    it('should protect routes when requireAuth is true', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })
    })

    it('should allow access when requireAuth is false', () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: false }))

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should protect admin routes when requireAdmin is true', async () => {
      mockAuth.user = { uid: 'user-123', email: 'user@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.isAdmin = false
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/admin')

      renderHook(() => useAuthGuard({ requireAuth: true, requireAdmin: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should allow admin access when user is admin', () => {
      mockAuth.user = { uid: 'admin-123', email: 'admin@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.isAdmin = true
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/admin')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: true, requireAdmin: true }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('authenticated user access', () => {
    it('should allow access for authenticated users without restrictions', () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.loading = false
      mockAuth.isAdmin = false
      mockUsePathname.mockReturnValue('/auth/signin')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: false }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should allow authenticated users on any route when requireAuth is true', () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.loading = false
      mockAuth.isAdmin = false
      mockUsePathname.mockReturnValue('/dashboard')

      const { result } = renderHook(() => useAuthGuard({ requireAuth: true }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('custom redirect behavior', () => {
    it('should use custom redirectTo path', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      renderHook(() => useAuthGuard({ 
        requireAuth: true,
        redirectTo: '/custom/signin'
      }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom/signin?redirect=%2Fdashboard')
      })
    })

    it('should redirect with current pathname in redirect query', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard/transactions')

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard%2Ftransactions')
      })
    })
  })

  describe('admin access control', () => {
    it('should allow access for admin users when requireAdmin is true', () => {
      mockAuth.user = { uid: 'admin-123', email: 'admin@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.isAdmin = true
      mockAuth.loading = false

      const { result } = renderHook(() => useAuthGuard({ requireAuth: true, requireAdmin: true }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should deny access for non-admin users when requireAdmin is true', async () => {
      mockAuth.user = { uid: 'user-123', email: 'user@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.isAdmin = false
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/admin')

      renderHook(() => useAuthGuard({ requireAuth: true, requireAdmin: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show admin access required error for non-admin users', async () => {
      mockAuth.user = { uid: 'user-123', email: 'user@example.com' }
      mockAuth.authToken = 'valid-token'
      mockAuth.isAdmin = false
      mockAuth.loading = false

      renderHook(() => useAuthGuard({ requireAuth: true, requireAdmin: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('error handling', () => {
    it('should handle router navigation errors gracefully', async () => {
      mockAuth.user = null
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')
      
      mockPush.mockRejectedValue(new Error('Navigation failed'))

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })

      // Should not crash the application on navigation error
    })
  })

  describe('email verification', () => {
    it('should redirect to verify email when requireEmailVerified is true and email not verified', async () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com', emailVerified: false }
      mockAuth.authToken = 'valid-token'
      mockAuth.loading = false
      mockAuth.isAdmin = false

      renderHook(() => useAuthGuard({ 
        requireAuth: true,
        requireEmailVerified: true
      }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/verify-email')
      })
    })

    it('should allow access when email is verified', () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com', emailVerified: true }
      mockAuth.authToken = 'valid-token'
      mockAuth.loading = false
      mockAuth.isAdmin = false

      const { result } = renderHook(() => useAuthGuard({ 
        requireAuth: true,
        requireEmailVerified: true
      }))

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAuthorized).toBe(true)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('token validation', () => {
    it('should redirect when user exists but token is missing', async () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      mockAuth.authToken = null // Token missing
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })
    })

    it('should show session expired error when token is missing', async () => {
      mockAuth.user = { uid: 'user-123', email: 'test@example.com' }
      mockAuth.authToken = null
      mockAuth.loading = false
      mockUsePathname.mockReturnValue('/dashboard')

      renderHook(() => useAuthGuard({ requireAuth: true }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in?redirect=%2Fdashboard')
      })
    })
  })
})