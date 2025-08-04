"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import LoadingScreen from "@/components/loading-screen"
import {
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase-client"

type UserProfile = {
  walletAddress?: string
  isNewUser: boolean
  registrationMethod: 'email' | 'google'
  hasCompletedOnboarding?: boolean
  displayName?: string
  photoURL?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isDemoAccount: boolean
  userProfile: UserProfile | null
  authToken: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
}

// Backend API URL - Using environment variable or fallback to production
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.clearhold.app"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create API client for authenticated requests
const createAPIClient = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  // Add ngrok bypass header if using ngrok URL
  if (API_URL.includes('.ngrok.io') || API_URL.includes('.ngrok-free.app') || API_URL.includes('.ngrok.app')) {
    headers['ngrok-skip-browser-warning'] = 'true'
  }
  
  return {
    get: (endpoint: string, options?: RequestInit) =>
      fetch(`${API_URL}${endpoint}`, { ...options, headers: { ...headers, ...options?.headers } }),
    post: (endpoint: string, data?: any, options?: RequestInit) =>
      fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
        headers: { ...headers, ...options?.headers },
      }),
    put: (endpoint: string, data?: any, options?: RequestInit) =>
      fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
        headers: { ...headers, ...options?.headers },
      }),
    delete: (endpoint: string, options?: RequestInit) =>
      fetch(`${API_URL}${endpoint}`, { method: "DELETE", ...options, headers: { ...headers, ...options?.headers } }),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoAccount, setIsDemoAccount] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  // Helper function for redirection after successful authentication
  const redirectToDashboard = () => {
    setTimeout(() => {
      router.push("/dashboard")
    }, 100)
  }

  // Helper function to check if backend is available
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { 
        "Content-Type": "application/json" 
      }
      
      // Add ngrok bypass header if using ngrok URL
      if (API_URL.includes('.ngrok.io') || API_URL.includes('.ngrok-free.app') || API_URL.includes('.ngrok.app')) {
        headers['ngrok-skip-browser-warning'] = 'true'
      }
      
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch (error) {
      console.error("Backend connection error:", error)
      return false
    }
  }

  // Helper to get headers with ngrok bypass if needed
  const getRequestHeaders = (additionalHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders
    }
    
    // Add ngrok bypass header if using ngrok URL
    if (API_URL.includes('.ngrok.io') || API_URL.includes('.ngrok-free.app') || API_URL.includes('.ngrok.app')) {
      headers['ngrok-skip-browser-warning'] = 'true'
    }
    
    return headers
  }

  // Store token and set up refresh
  const storeAuthToken = (token: string) => {
    setAuthToken(token)
    try {
      localStorage?.setItem('authToken', token)
    } catch (error) {
      console.warn('Failed to store token in localStorage:', error)
    }
    
    // Set up token refresh (refresh 5 minutes before expiry)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000
      const refreshTime = expiryTime - (5 * 60 * 1000) // 5 minutes before expiry
      const timeUntilRefresh = refreshTime - Date.now()
      
      if (timeUntilRefresh > 0) {
        const timer = setTimeout(() => {
          refreshToken()
        }, timeUntilRefresh)
        setTokenRefreshTimer(timer)
      }
    } catch (error) {
      console.error('Error parsing token for refresh setup:', error)
    }
  }

  // Clear stored token
  const clearAuthToken = () => {
    setAuthToken(null)
    try {
      localStorage?.removeItem('authToken')
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error)
    }
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer)
      setTokenRefreshTimer(null)
    }
  }

  // Handle successful authentication response from backend
  const handleAuthSuccess = (data: any) => {
    const { user: userData, token, profile } = data
    
    // Store the token for API calls
    storeAuthToken(token)
    
    // Set admin status from backend response
    setIsAdmin(data.isAdmin || false)
    
    // Store user profile data
    setUserProfile(profile)
    
    console.log('Authentication successful:', { userData, profile, isAdmin: data.isAdmin })
  }

  // Refresh Firebase token
  const refreshToken = async () => {
    try {
      if (user) {
        const newToken = await user.getIdToken(true)
        storeAuthToken(newToken)
        console.log('Token refreshed successfully')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, sign out user
      await signOut()
    }
  }

  // Load stored token on app start
  useEffect(() => {
    try {
      const storedToken = localStorage?.getItem('authToken')
      if (storedToken) {
        setAuthToken(storedToken)
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error)
    }
  }, [])

  useEffect(() => {
    // Check if Firebase is configured before setting up auth listener
    if (!auth) {
      console.warn('Firebase Auth is not configured. Skipping auth state listener.')
      setLoading(false)
      return
    }

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser)
      setLoading(false)

      if (authUser) {
        // If user is authenticated, check if it's the demo account
        setIsDemoAccount(authUser.email === "jasmindustin@gmail.com")

        // If user is on the home page or login page, redirect to dashboard
        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          redirectToDashboard()
        }
      } else {
        // User signed out, clear all auth data
        setIsAdmin(false)
        setIsDemoAccount(false)
        setUserProfile(null)
        clearAuthToken()
      }
    })

    // Clean up subscription
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [router])

  const signInWithGoogle = async () => {
    try {
      // Check if Firebase is configured
      if (!auth || !googleProvider) {
        throw new Error("Firebase is not configured. Please ensure environment variables are set in Vercel.")
      }

      // First check if backend is available
      const isBackendAvailable = await checkBackendConnection()
      if (!isBackendAvailable) {
        throw new Error("Authentication server is currently unavailable. Please try again later.")
      }

      // 1. Sign in with Google to get credentials
      const result = await signInWithPopup(auth, googleProvider)

      if (!result.user) {
        throw new Error("Failed to authenticate with Google")
      }

      // 2. Get the ID token
      const idToken = await result.user.getIdToken(true)

      // 3. Send token to backend for verification
      const response = await fetch(`${API_URL}/auth/signInGoogle`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        // If backend rejects the authentication, sign out from Firebase
        if (auth) {
          await firebaseSignOut(auth)
        }
        const data = await response.json()
        throw new Error(data.error || "Backend authentication failed")
      }

      const data = await response.json()

      // Handle successful authentication
      handleAuthSuccess(data)

      // Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()
    } catch (error) {
      console.error("Google Sign-In error:", error)
      // Sign out if authentication fails
      if (auth) {
        await firebaseSignOut(auth)
      }
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      // 1. Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required")
      }

      // Check if backend is available
      const isBackendAvailable = await checkBackendConnection()
      if (!isBackendAvailable) {
        throw new Error("Authentication server is currently unavailable. Please try again later.")
      }

      // 2. Send request to backend (backend handles Firebase authentication)
      const response = await fetch(`${API_URL}/auth/signInEmailPass`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Authentication failed")
      }

      const data = await response.json()

      // Handle successful authentication
      handleAuthSuccess(data)

      // Note: We don't call Firebase client methods for email/password
      // The backend handles Firebase authentication and returns the token

      // 3. Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()

      return data
    } catch (error: any) {
      console.error("Email Sign-In error:", error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      // 1. Validate inputs
      if (!email || !password) {
        throw new Error("Email and password are required")
      }

      // Check if backend is available
      const isBackendAvailable = await checkBackendConnection()
      if (!isBackendAvailable) {
        throw new Error("Authentication server is currently unavailable. Please try again later.")
      }

      // 2. Send request to backend (backend handles Firebase user creation)
      const response = await fetch(`${API_URL}/auth/signUpEmailPass`, {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Registration failed")
      }

      const data = await response.json()

      // Handle successful authentication
      handleAuthSuccess(data)

      // Note: We don't call Firebase client methods for email/password
      // The backend handles Firebase user creation and returns the token

      // 3. Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()

      return data
    } catch (error: any) {
      console.error("Email Sign-Up error:", error)
      throw error
    }
  }

  const signOut = async () => {
    // Clear auth token first
    clearAuthToken()
    
    // Sign out from Firebase if configured
    if (auth) {
      await firebaseSignOut(auth)
    }
    
    // Redirect to home page after sign out
    router.push("/")
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <AuthContext.Provider
      value={{
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
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

// Export API client for use in other components
export const useAPIClient = () => {
  const { authToken } = useAuth()
  return createAPIClient(authToken || undefined)
}
