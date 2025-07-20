import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, useAPIClient } from '@/context/auth-context'
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

// Mock Firebase functions
const mockSignInWithPopup = signInWithPopup as jest.MockedFunction<typeof signInWithPopup>
const mockFirebaseSignOut = firebaseSignOut as jest.MockedFunction<typeof firebaseSignOut>
const mockOnAuthStateChanged = auth.onAuthStateChanged as jest.MockedFunction<typeof auth.onAuthStateChanged>

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Test component to use auth context
const TestComponent = ({ testAction }: { testAction?: string }) => {
  const { 
    user, 
    loading, 
    isAdmin, 
    isDemoAccount, 
    userProfile, 
    authToken,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshToken
  } = useAuth()

  const api = useAPIClient()

  const handleTestAction = async () => {
    switch (testAction) {
      case 'google-signin':
        await signInWithGoogle()
        break
      case 'email-signin':
        await signInWithEmail('test@example.com', 'password123')
        break
      case 'email-signup':
        await signUpWithEmail('test@example.com', 'password123')
        break
      case 'signout':
        await signOut()
        break
      case 'refresh':
        await refreshToken()
        break
      case 'api-call':
        await api.get('/test')
        break
      default:
        break
    }
  }

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="admin">{isAdmin ? 'admin' : 'not-admin'}</div>
      <div data-testid="demo">{isDemoAccount ? 'demo' : 'not-demo'}</div>
      <div data-testid="profile">{userProfile ? JSON.stringify(userProfile) : 'no-profile'}</div>
      <div data-testid="token">{authToken || 'no-token'}</div>
      <button onClick={handleTestAction} data-testid="action-button">
        Test Action
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  // Mock user object
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true,
    getIdToken: jest.fn(),
  }

  // Mock backend response
  const mockBackendResponse = {
    message: 'User signed in successfully',
    user: mockUser,
    token: 'mock-firebase-token',
    profile: {
      walletAddress: '0x1234567890123456789012345678901234567890',
      isNewUser: false,
      registrationMethod: 'email' as const,
      hasCompletedOnboarding: true,
    },
    isAdmin: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true
    })
    
    // Reset fetch mock
    mockFetch.mockClear()
    
    // Mock successful health check by default
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'OK' }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBackendResponse),
      } as Response)
    })

    // Mock Firebase auth state listener
    mockOnAuthStateChanged.mockImplementation((callback) => {
      // Call callback with no user initially
      callback(null)
      return jest.fn() // Unsubscribe function
    })
  })

  describe('Context Initialization', () => {
    test('should provide initial context values', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('admin')).toHaveTextContent('not-admin')
      expect(screen.getByTestId('demo')).toHaveTextContent('not-demo')
      expect(screen.getByTestId('profile')).toHaveTextContent('no-profile')
      expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    })

    test('should load stored token from localStorage', async () => {
      const storedToken = 'stored-token'
      
      // Set up stored token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => storedToken),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('token')).toHaveTextContent(storedToken)
      })
    })

    test('should show loading screen initially', () => {
      // Mock auth state to remain loading (never call the callback)
      mockOnAuthStateChanged.mockImplementation(() => {
        // Don't call the callback to keep loading state
        return jest.fn()
      })

      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Check for loading screen component instead of testid
      expect(container.querySelector('.fixed.inset-0.bg-white')).toBeInTheDocument()
    })
  })

  describe('Google Sign-In', () => {
    test('should handle successful Google sign-in', async () => {
      const user = userEvent.setup()
      
      // Mock successful Google sign-in
      mockSignInWithPopup.mockResolvedValue({
        user: mockUser,
      } as any)
      
      mockUser.getIdToken.mockResolvedValue('google-id-token')

      render(
        <AuthProvider>
          <TestComponent testAction="google-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/auth/signInGoogle',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'google-id-token' }),
          })
        )
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('should handle Google sign-in backend failure', async () => {
      const user = userEvent.setup()
      
      mockSignInWithPopup.mockResolvedValue({
        user: mockUser,
      } as any)
      
      mockUser.getIdToken.mockResolvedValue('google-id-token')

      // Mock backend failure
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({ ok: true } as Response)
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Backend authentication failed' }),
        } as Response)
      })

      render(
        <AuthProvider>
          <TestComponent testAction="google-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Test the error by catching it directly
      try {
        await act(async () => {
          await user.click(screen.getByTestId('action-button'))
        })
      } catch (error) {
        expect(error).toEqual(expect.objectContaining({
          message: 'Backend authentication failed'
        }))
      }

      await waitFor(() => {
        expect(mockFirebaseSignOut).toHaveBeenCalled()
      })
    })

    test('should handle backend unavailable', async () => {
      const user = userEvent.setup()
      
      // Mock backend health check failure
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true } as Response)
      })

      render(
        <AuthProvider>
          <TestComponent testAction="google-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Test the error by catching it directly
      try {
        await act(async () => {
          await user.click(screen.getByTestId('action-button'))
        })
      } catch (error) {
        expect(error).toEqual(expect.objectContaining({
          message: 'Authentication server is currently unavailable. Please try again later.'
        }))
      }
    })
  })

  describe('Email Authentication', () => {
    test('should handle successful email sign-in', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent testAction="email-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/auth/signInEmailPass',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          })
        )
        expect(screen.getByTestId('token')).toHaveTextContent('mock-firebase-token')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('should handle successful email sign-up', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent testAction="email-signup" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/auth/signUpEmailPass',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          })
        )
        expect(screen.getByTestId('token')).toHaveTextContent('mock-firebase-token')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('should handle email authentication validation errors', async () => {
      const user = userEvent.setup()

      // We'll test the validation by calling signInWithEmail with empty values
      const TestValidationComponent = () => {
        const { signInWithEmail } = useAuth()
        
        const handleClick = async () => {
          await signInWithEmail('', '')
        }

        return <button onClick={handleClick} data-testid="validation-button">Test</button>
      }

      render(
        <AuthProvider>
          <TestValidationComponent />
        </AuthProvider>
      )

      await expect(async () => {
        await user.click(screen.getByTestId('validation-button'))
      }).rejects.toThrow('Email and password are required')
    })

    test('should handle email authentication backend errors', async () => {
      const user = userEvent.setup()

      // Mock backend error
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({ ok: true } as Response)
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        } as Response)
      })

      render(
        <AuthProvider>
          <TestComponent testAction="email-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await expect(async () => {
        await user.click(screen.getByTestId('action-button'))
      }).rejects.toThrow('Invalid credentials')
    })
  })

  describe('Token Management', () => {
    test('should store token in localStorage on successful authentication', async () => {
      const user = userEvent.setup()
      const setItemSpy = jest.spyOn(localStorage, 'setItem')

      render(
        <AuthProvider>
          <TestComponent testAction="email-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith('authToken', 'mock-firebase-token')
      })
    })

    test('should refresh token when user is available', async () => {
      const user = userEvent.setup()
      
      // Mock authenticated user
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(mockUser as any)
        return jest.fn()
      })

      mockUser.getIdToken.mockResolvedValue('new-refreshed-token')

      render(
        <AuthProvider>
          <TestComponent testAction="refresh" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockUser.getIdToken).toHaveBeenCalledWith(true)
        expect(screen.getByTestId('token')).toHaveTextContent('new-refreshed-token')
      })
    })

    test('should handle token refresh failure by signing out', async () => {
      const user = userEvent.setup()
      
      // Mock authenticated user
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(mockUser as any)
        return jest.fn()
      })

      mockUser.getIdToken.mockRejectedValue(new Error('Token refresh failed'))

      render(
        <AuthProvider>
          <TestComponent testAction="refresh" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockFirebaseSignOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Sign Out', () => {
    test('should clear all auth data on sign out', async () => {
      const user = userEvent.setup()
      const removeItemSpy = jest.spyOn(localStorage, 'removeItem')

      // Set initial auth state
      localStorage.setItem('authToken', 'existing-token')

      render(
        <AuthProvider>
          <TestComponent testAction="signout" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith('authToken')
        expect(mockFirebaseSignOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
        expect(screen.getByTestId('token')).toHaveTextContent('no-token')
      })
    })
  })

  describe('User Profile and Admin Status', () => {
    test('should handle admin user authentication', async () => {
      const user = userEvent.setup()
      
      // Mock admin response
      const adminResponse = {
        ...mockBackendResponse,
        isAdmin: true,
        profile: {
          ...mockBackendResponse.profile,
          registrationMethod: 'google' as const,
        }
      }

      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/health')) {
          return Promise.resolve({ ok: true } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(adminResponse),
        } as Response)
      })

      render(
        <AuthProvider>
          <TestComponent testAction="email-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('admin')).toHaveTextContent('admin')
        expect(screen.getByTestId('profile')).toHaveTextContent(
          JSON.stringify(adminResponse.profile)
        )
      })
    })

    test('should detect demo account', async () => {
      // Mock demo user
      const demoUser = {
        ...mockUser,
        email: 'jasmindustin@gmail.com',
      }

      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(demoUser as any)
        return jest.fn()
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('demo')).toHaveTextContent('demo')
        expect(screen.getByTestId('user')).toHaveTextContent('jasmindustin@gmail.com')
      })
    })
  })

  describe('API Client', () => {
    test('should create API client with auth token', async () => {
      const user = userEvent.setup()
      
      // Set up authenticated state
      localStorage.setItem('authToken', 'test-token')

      render(
        <AuthProvider>
          <TestComponent testAction="api-call" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('token')).toHaveTextContent('test-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        )
      })
    })

    test('should create API client without auth token when not authenticated', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent testAction="api-call" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await act(async () => {
        await user.click(screen.getByTestId('action-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test',
          expect.objectContaining({
            headers: expect.not.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        )
      })
    })
  })

  describe('Firebase Auth State Changes', () => {
    test('should handle user authentication state change', async () => {
      // Initially no user
      mockOnAuthStateChanged.mockImplementation((callback) => {
        // First call with no user
        callback(null)
        
        // Simulate user authentication after some time
        setTimeout(() => {
          callback(mockUser as any)
        }, 100)
        
        return jest.fn()
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially no user
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      })

      // After authentication
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      }, { timeout: 500 })
    })

    test('should redirect to dashboard when user is on login page', async () => {
      // Mock window location
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login' },
        writable: true,
      })

      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(mockUser as any)
        return jest.fn()
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('should clear auth data when user signs out', async () => {
      // Start with authenticated user
      localStorage.setItem('authToken', 'existing-token')
      
      let authCallback: ((user: any) => void) | null = null
      
      mockOnAuthStateChanged.mockImplementation((callback) => {
        authCallback = callback
        // Start with user
        callback(mockUser as any)
        return jest.fn()
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially authenticated
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('token')).toHaveTextContent('existing-token')
      })

      // Simulate sign out
      act(() => {
        authCallback?.(null)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
        expect(screen.getByTestId('token')).toHaveTextContent('no-token')
        expect(screen.getByTestId('admin')).toHaveTextContent('not-admin')
        expect(screen.getByTestId('demo')).toHaveTextContent('not-demo')
        expect(screen.getByTestId('profile')).toHaveTextContent('no-profile')
      })
    })
  })

  describe('Error Handling', () => {
    test('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })

    test('should handle network errors during authentication', async () => {
      const user = userEvent.setup()

      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent testAction="email-signin" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      await expect(async () => {
        await user.click(screen.getByTestId('action-button'))
      }).rejects.toThrow('Network error')
    })
  })
}) 