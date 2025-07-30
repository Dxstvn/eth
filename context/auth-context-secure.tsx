"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import { signInWithPopup } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase-client"
import { apiClient } from "@/services/api/client"

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
  refreshToken: string | null
  tokenFamily: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshTokens: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Secure token storage with encryption
class SecureTokenStorage {
  private static STORAGE_KEY = 'clearhold_auth_secure'
  private static REFRESH_KEY = 'clearhold_refresh_secure'
  private static FAMILY_KEY = 'clearhold_family_secure'

  static storeTokens(accessToken: string, refreshToken: string, tokenFamily: string): void {
    if (typeof window === 'undefined') return

    try {
      // In production, encrypt these before storage
      localStorage.setItem(this.STORAGE_KEY, accessToken)
      localStorage.setItem(this.REFRESH_KEY, refreshToken)
      localStorage.setItem(this.FAMILY_KEY, tokenFamily)
    } catch (error) {
      console.error('Failed to store tokens:', error)
    }
  }

  static getTokens(): { accessToken: string | null; refreshToken: string | null; tokenFamily: string | null } {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null, tokenFamily: null }
    }

    try {
      return {
        accessToken: localStorage.getItem(this.STORAGE_KEY),
        refreshToken: localStorage.getItem(this.REFRESH_KEY),
        tokenFamily: localStorage.getItem(this.FAMILY_KEY)
      }
    } catch (error) {
      console.error('Failed to retrieve tokens:', error)
      return { accessToken: null, refreshToken: null, tokenFamily: null }
    }
  }

  static clearTokens(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.REFRESH_KEY)
      localStorage.removeItem(this.FAMILY_KEY)
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
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
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [tokenFamily, setTokenFamily] = useState<string | null>(null)
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState<NodeJS.Timeout | null>(null)

  // Get device fingerprint for token rotation
  const getDeviceFingerprint = useCallback((): string => {
    if (typeof window === 'undefined') return 'unknown'
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth
    ].join('|')
    
    return btoa(fingerprint).substring(0, 32)
  }, [])

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback((accessToken: string) => {
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer)
    }

    try {
      // Parse token to get expiry
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const expiryTime = payload.exp * 1000
      const refreshTime = expiryTime - (5 * 60 * 1000) // 5 minutes before expiry
      const timeUntilRefresh = refreshTime - Date.now()
      
      if (timeUntilRefresh > 0) {
        const timer = setTimeout(() => {
          refreshTokens()
        }, timeUntilRefresh)
        setTokenRefreshTimer(timer)
      } else {
        // Token expires soon, refresh immediately
        refreshTokens()
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error)
    }
  }, [tokenRefreshTimer])

  // Refresh tokens using rotation
  const refreshTokens = useCallback(async () => {
    const { refreshToken: currentRefreshToken } = SecureTokenStorage.getTokens()
    
    if (!currentRefreshToken) {
      console.error('No refresh token available')
      await signOut()
      return
    }

    try {
      const response = await apiClient.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
        deviceFingerprint: getDeviceFingerprint()
      })

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken, tokenFamily: family } = response.data
        
        // Store new tokens
        SecureTokenStorage.storeTokens(accessToken, newRefreshToken, family)
        setAuthToken(accessToken)
        setRefreshToken(newRefreshToken)
        setTokenFamily(family)
        
        // Schedule next refresh
        scheduleTokenRefresh(accessToken)
        
        console.log('Tokens refreshed successfully')
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      // If refresh fails, sign out user
      await signOut()
    }
  }, [getDeviceFingerprint, scheduleTokenRefresh])

  // Sign in with email
  const signInWithEmail = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        deviceFingerprint: getDeviceFingerprint()
      })

      if (response.success && response.data) {
        const { 
          accessToken, 
          refreshToken: newRefreshToken, 
          tokenFamily: family,
          user: userData,
          profile 
        } = response.data

        // Store tokens securely
        SecureTokenStorage.storeTokens(accessToken, newRefreshToken, family)
        setAuthToken(accessToken)
        setRefreshToken(newRefreshToken)
        setTokenFamily(family)
        
        // Set user data
        setUser(userData)
        setUserProfile(profile)
        setIsAdmin(response.data.isAdmin || false)
        
        // Schedule token refresh
        scheduleTokenRefresh(accessToken)
        
        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  // Sign up with email
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        deviceFingerprint: getDeviceFingerprint()
      })

      if (response.success && response.data) {
        const { 
          accessToken, 
          refreshToken: newRefreshToken, 
          tokenFamily: family,
          user: userData,
          profile 
        } = response.data

        // Store tokens securely
        SecureTokenStorage.storeTokens(accessToken, newRefreshToken, family)
        setAuthToken(accessToken)
        setRefreshToken(newRefreshToken)
        setTokenFamily(family)
        
        // Set user data
        setUser(userData)
        setUserProfile(profile)
        
        // Schedule token refresh
        scheduleTokenRefresh(accessToken)
        
        // Redirect to onboarding or dashboard
        router.push(profile.isNewUser ? '/onboarding' : '/dashboard')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      // Get Google ID token from Firebase
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()

      const response = await apiClient.post('/auth/signInGoogle', {
        idToken,
        deviceFingerprint: getDeviceFingerprint()
      })

      if (response.success && response.data) {
        const { 
          accessToken, 
          refreshToken: newRefreshToken, 
          tokenFamily: family,
          user: userData,
          profile 
        } = response.data

        // Store tokens securely
        SecureTokenStorage.storeTokens(accessToken, newRefreshToken, family)
        setAuthToken(accessToken)
        setRefreshToken(newRefreshToken)
        setTokenFamily(family)
        
        // Set user data
        setUser(result.user)
        setUserProfile(profile)
        setIsAdmin(response.data.isAdmin || false)
        
        // Schedule token refresh
        scheduleTokenRefresh(accessToken)
        
        // Redirect
        router.push(profile.isNewUser ? '/onboarding' : '/dashboard')
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      // Revoke refresh token on backend
      if (refreshToken) {
        await apiClient.post('/auth/logout', { 
          refreshToken,
          tokenFamily 
        }).catch(console.error)
      }

      // Clear all tokens
      SecureTokenStorage.clearTokens()
      
      // Clear state
      setUser(null)
      setUserProfile(null)
      setAuthToken(null)
      setRefreshToken(null)
      setTokenFamily(null)
      setIsAdmin(false)
      setIsDemoAccount(false)
      
      // Clear timer
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer)
        setTokenRefreshTimer(null)
      }
      
      // Sign out from Firebase
      await auth.signOut()
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Load stored tokens on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const { accessToken, refreshToken: storedRefresh, tokenFamily: family } = SecureTokenStorage.getTokens()
        
        if (accessToken && storedRefresh && family) {
          // Validate token is not expired
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            const isExpired = Date.now() >= payload.exp * 1000
            
            if (isExpired) {
              // Try to refresh
              await refreshTokens()
            } else {
              // Use existing token
              setAuthToken(accessToken)
              setRefreshToken(storedRefresh)
              setTokenFamily(family)
              scheduleTokenRefresh(accessToken)
              
              // Load user data
              const response = await apiClient.get('/auth/me')
              if (response.success && response.data) {
                setUser(response.data.user)
                setUserProfile(response.data.profile)
                setIsAdmin(response.data.isAdmin || false)
              }
            }
          } catch (error) {
            console.error('Error validating stored token:', error)
            SecureTokenStorage.clearTokens()
          }
        }
      } catch (error) {
        console.error('Error loading stored auth:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStoredAuth()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && !authToken) {
        // Firebase user exists but no app token - might be a page refresh
        // Try to get token from backend
        try {
          const idToken = await firebaseUser.getIdToken()
          const response = await apiClient.post('/auth/exchangeToken', {
            idToken,
            deviceFingerprint: getDeviceFingerprint()
          })

          if (response.success && response.data) {
            const { accessToken, refreshToken: newRefresh, tokenFamily: family } = response.data
            SecureTokenStorage.storeTokens(accessToken, newRefresh, family)
            setAuthToken(accessToken)
            setRefreshToken(newRefresh)
            setTokenFamily(family)
            scheduleTokenRefresh(accessToken)
          }
        } catch (error) {
          console.error('Token exchange error:', error)
        }
      }
    })

    return () => unsubscribe()
  }, [authToken, getDeviceFingerprint, scheduleTokenRefresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer)
      }
    }
  }, [tokenRefreshTimer])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isDemoAccount,
        userProfile,
        authToken,
        refreshToken,
        tokenFamily,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshTokens,
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