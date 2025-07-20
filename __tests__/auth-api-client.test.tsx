import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, useAPIClient } from '@/context/auth-context'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock Firebase auth
jest.mock('@/lib/firebase-client', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  googleProvider: {},
}))

const mockOnAuthStateChanged = jest.fn()

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Test component for API client testing
const APITestComponent = ({ action, testData }: { action: string; testData?: any }) => {
  const api = useAPIClient()
  const { authToken } = useAuth()
  const [response, setResponse] = React.useState<string>('')
  const [error, setError] = React.useState<string>('')

  const handleAPICall = async () => {
    try {
      setError('')
      setResponse('')
      
      let result: Response
      
      switch (action) {
        case 'GET':
          result = await api.get('/test/endpoint')
          break
        case 'POST':
          result = await api.post('/test/endpoint', testData)
          break
        case 'PUT':
          result = await api.put('/test/endpoint', testData)
          break
        case 'DELETE':
          result = await api.delete('/test/endpoint')
          break
        case 'POST_WITHOUT_BODY':
          result = await api.post('/test/endpoint')
          break
        case 'GET_WITH_OPTIONS':
          result = await api.get('/test/endpoint', {
            headers: { 'Custom-Header': 'test-value' }
          })
          break
        default:
          throw new Error('Unknown action')
      }
      
      const data = await result.json()
      setResponse(JSON.stringify(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div>
      <div data-testid="auth-token">{authToken || 'no-token'}</div>
      <div data-testid="response">{response}</div>
      <div data-testid="error">{error}</div>
      <button onClick={handleAPICall} data-testid="api-button">
        Call API
      </button>
    </div>
  )
}

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    
    // Mock auth state listener
    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(null)
      return jest.fn()
    })
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  })

  describe('HTTP Methods', () => {
    test('should make GET request correctly', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        expect(screen.getByTestId('response')).toHaveTextContent('{"success":true}')
      })
    })

    test('should make POST request with data correctly', async () => {
      const user = userEvent.setup()
      const testData = { name: 'test', value: 123 }

      render(
        <AuthProvider>
          <APITestComponent action="POST" testData={testData} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
          })
        )
        expect(screen.getByTestId('response')).toHaveTextContent('{"success":true}')
      })
    })

    test('should make POST request without body correctly', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <APITestComponent action="POST_WITHOUT_BODY" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: undefined,
          })
        )
      })
    })

    test('should make PUT request correctly', async () => {
      const user = userEvent.setup()
      const testData = { id: 1, updated: true }

      render(
        <AuthProvider>
          <APITestComponent action="PUT" testData={testData} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
          })
        )
      })
    })

    test('should make DELETE request correctly', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <APITestComponent action="DELETE" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      })
    })
  })

  describe('Authentication Headers', () => {
    test('should include Authorization header when authenticated', async () => {
      const user = userEvent.setup()
      
      // Set up authenticated state
      localStorage.setItem('authToken', 'test-auth-token')

      render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('test-auth-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-auth-token',
            },
          })
        )
      })
    })

    test('should not include Authorization header when not authenticated', async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
        
        // Verify Authorization header is not present
        const [, options] = mockFetch.mock.calls[0]
        expect(options?.headers).not.toHaveProperty('Authorization')
      })
    })

    test('should merge custom headers with auth headers', async () => {
      const user = userEvent.setup()
      
      // Set up authenticated state
      localStorage.setItem('authToken', 'test-auth-token')

      render(
        <AuthProvider>
          <APITestComponent action="GET_WITH_OPTIONS" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('test-auth-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-auth-token',
              'Custom-Header': 'test-value',
            },
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle fetch errors', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })

    test('should handle response parsing errors', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)

      render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid JSON')
      })
    })
  })

  describe('Token Changes', () => {
    test('should update Authorization header when token changes', async () => {
      const user = userEvent.setup()

      // Mock user authentication state changes
      let authCallback: ((user: any) => void) | null = null
      mockOnAuthStateChanged.mockImplementation((callback) => {
        authCallback = callback
        callback(null) // Start unauthenticated
        return jest.fn()
      })

      const { rerender } = render(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      // Initially no token
      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('no-token')
      })

      // Make API call without token
      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      })

      // Clear the mock to test the next call
      mockFetch.mockClear()

      // Simulate token being set
      act(() => {
        localStorage.setItem('authToken', 'new-token')
      })

      // Re-render to pick up the new token
      rerender(
        <AuthProvider>
          <APITestComponent action="GET" />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-token')).toHaveTextContent('new-token')
      })

      // Make API call with token
      await act(async () => {
        await user.click(screen.getByTestId('api-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test/endpoint',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer new-token',
            },
          })
        )
      })
    })
  })

  describe('URL Construction', () => {
    test('should construct URLs correctly with different endpoints', async () => {
      const TestURLComponent = () => {
        const api = useAPIClient()
        const [urls, setUrls] = React.useState<string[]>([])

        const testURLs = async () => {
          const endpoints = [
            '/auth/signIn',
            '/contact/contacts',
            '/wallet/register',
            '/transaction/create',
            '/files/upload',
          ]

          const promises = endpoints.map(endpoint => api.get(endpoint))
          await Promise.all(promises)

          setUrls(mockFetch.mock.calls.map(call => call[0] as string))
        }

        return (
          <div>
            <button onClick={testURLs} data-testid="test-urls">Test URLs</button>
            <div data-testid="urls">{urls.join(', ')}</div>
          </div>
        )
      }

      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestURLComponent />
        </AuthProvider>
      )

      await act(async () => {
        await user.click(screen.getByTestId('test-urls'))
      })

      await waitFor(() => {
        const expectedUrls = [
          'https://api.clearhold.app/auth/signIn',
          'https://api.clearhold.app/contact/contacts',
          'https://api.clearhold.app/wallet/register',
          'https://api.clearhold.app/transaction/create',
          'https://api.clearhold.app/files/upload',
        ]
        
        expect(screen.getByTestId('urls')).toHaveTextContent(expectedUrls.join(', '))
      })
    })
  })

  describe('Custom Options', () => {
    test('should pass through custom options correctly', async () => {
      const TestCustomOptionsComponent = () => {
        const api = useAPIClient()

        const testCustomOptions = async () => {
          await api.post('/test', { data: 'test' }, {
            headers: {
              'Custom-Header': 'custom-value',
              'Another-Header': 'another-value',
            },
            signal: new AbortController().signal,
          })
        }

        return (
          <button onClick={testCustomOptions} data-testid="custom-options">
            Test Custom Options
          </button>
        )
      }

      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestCustomOptionsComponent />
        </AuthProvider>
      )

      await act(async () => {
        await user.click(screen.getByTestId('custom-options'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Custom-Header': 'custom-value',
              'Another-Header': 'another-value',
            },
            body: JSON.stringify({ data: 'test' }),
            signal: expect.any(AbortSignal),
          })
        )
      })
    })

    test('should handle RequestInit options merging correctly', async () => {
      const TestMergingComponent = () => {
        const api = useAPIClient()

        const testMerging = async () => {
          await api.get('/test', {
            headers: {
              'Content-Type': 'application/xml', // Should override default
              'Custom-Header': 'test',
            },
            cache: 'no-cache',
            credentials: 'include',
          })
        }

        return (
          <button onClick={testMerging} data-testid="test-merging">
            Test Merging
          </button>
        )
      }

      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestMergingComponent />
        </AuthProvider>
      )

      await act(async () => {
        await user.click(screen.getByTestId('test-merging'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.clearhold.app/test',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/xml',
              'Custom-Header': 'test',
            },
            cache: 'no-cache',
            credentials: 'include',
          })
        )
      })
    })
  })
}) 