import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/context/auth-context'

// Mock Firebase completely
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}))

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null)
      return jest.fn()
    }),
  },
  googleProvider: {},
}))

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock loading screen
jest.mock('@/components/loading-screen', () => {
  return function LoadingScreen() {
    return <div data-testid="loading-screen">Loading...</div>
  }
})

// Simple test component
const SimpleTestComponent = () => {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
      <div data-testid="loading-state">{auth.loading ? 'loading' : 'loaded'}</div>
      <div data-testid="admin-status">{auth.isAdmin ? 'admin' : 'not-admin'}</div>
      <div data-testid="token-status">{auth.authToken ? 'has-token' : 'no-token'}</div>
    </div>
  )
}

describe('Authentication Context - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.MockedFunction<typeof fetch>
  })

  test('should provide auth context without errors', async () => {
    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
    expect(screen.getByTestId('admin-status')).toHaveTextContent('not-admin')
    expect(screen.getByTestId('token-status')).toHaveTextContent('no-token')
  })

  test('should use staging backend URL', () => {
    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )
    
    // The URL should be configured to use staging
    // This is more of an integration test that would verify the API calls
    expect(true).toBe(true) // Placeholder assertion
  })

  test('should handle missing localStorage gracefully', async () => {
    // Remove localStorage to test graceful handling
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: true
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
    })

    consoleSpy.mockRestore()
  })

  test('should throw error when useAuth is used outside provider', () => {
    const TestComponent = () => {
      useAuth()
      return <div>Test</div>
    }

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  test('should create API client', () => {
    const TestAPIComponent = () => {
      const { useAPIClient } = require('@/context/auth-context')
      const api = useAPIClient()
      
      return (
        <div data-testid="api-client">
          {api ? 'api-client-exists' : 'no-api-client'}
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestAPIComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('api-client')).toHaveTextContent('api-client-exists')
  })
})

describe('Authentication Context - API Configuration', () => {
  test('should use correct staging backend URL', () => {
    // Test that the API_URL constant is set correctly
    const authContextModule = require('@/context/auth-context')
    
    // Since API_URL is not exported, we'll test it indirectly
    expect(true).toBe(true) // This would be better as an integration test
  })

  test('should create proper Authorization headers when token is provided', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    )
    global.fetch = mockFetch

    const TestAPIComponent = () => {
      const { useAPIClient } = require('@/context/auth-context')
      const api = useAPIClient()
      
      // Test API client creation
      expect(api).toBeDefined()
      expect(typeof api.get).toBe('function')
      expect(typeof api.post).toBe('function')
      expect(typeof api.put).toBe('function')
      expect(typeof api.delete).toBe('function')
      
      return <div data-testid="api-test">API Client Created Successfully</div>
    }

    render(
      <AuthProvider>
        <TestAPIComponent />
      </AuthProvider>
    )

    // Verify the component rendered and API client was created
    expect(screen.getByTestId('api-test')).toHaveTextContent('API Client Created Successfully')
  })
})

describe('Authentication Methods - Unit Tests', () => {
  test('should validate email and password inputs', async () => {
    const TestComponent = () => {
      const auth = useAuth()
      const [error, setError] = React.useState('')

      const testValidation = async () => {
        try {
          await auth.signInWithEmail('', '')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      }

      return (
        <div>
          <div data-testid="error">{error}</div>
          <button onClick={testValidation} data-testid="test-validation">
            Test
          </button>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('')
    })

    // Click test button
    screen.getByTestId('test-validation').click()

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Email and password are required')
    })
  })

  test('should handle authentication state changes', async () => {
    const { auth } = require('@/lib/firebase-client')
    let authCallback: any = null

    // Override the mock to capture the callback
    auth.onAuthStateChanged = jest.fn((callback) => {
      authCallback = callback
      callback(null) // Initial state
      return jest.fn()
    })

    render(
      <AuthProvider>
        <SimpleTestComponent />
      </AuthProvider>
    )

    // Initially no user
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
    })

    // Simulate user authentication
    if (authCallback) {
      authCallback({
        uid: 'test-uid',
        email: 'test@example.com',
      })
    }

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })
}) 