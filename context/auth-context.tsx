"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import LoadingScreen from "@/components/loading-screen"
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase-client"

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isDemoAccount: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Backend API URL
const API_URL = "http://localhost:3000"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoAccount, setIsDemoAccount] = useState(false)
  const [backendAuthenticated, setBackendAuthenticated] = useState(false)

  // Helper function for redirection after successful authentication
  const redirectToDashboard = () => {
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => {
      router.push("/dashboard")
    }, 100)
  }

  // Helper function to check if backend is available
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // Short timeout to fail fast if backend is down
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch (error) {
      console.error("Backend connection error:", error)
      return false
    }
  }

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      // If user exists in Firebase but not authenticated with backend, sign them out
      if (authUser && !backendAuthenticated) {
        const isBackendAvailable = await checkBackendConnection()

        if (!isBackendAvailable) {
          // If backend is not available, sign out the user
          await firebaseSignOut(auth)
          setUser(null)
          setLoading(false)
          router.push("/login")
          return
        }

        // Verify with backend that this user is still valid
        try {
          const idToken = await authUser.getIdToken(true)
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          })

          if (!response.ok) {
            // If backend rejects the token, sign out
            await firebaseSignOut(auth)
            setUser(null)
            setLoading(false)
            router.push("/login")
            return
          }

          // Backend confirmed user is valid
          setBackendAuthenticated(true)
        } catch (error) {
          console.error("Backend verification error:", error)
          // If verification fails, sign out
          await firebaseSignOut(auth)
          setUser(null)
          setLoading(false)
          router.push("/login")
          return
        }
      }

      setUser(authUser)
      setLoading(false)

      if (authUser && backendAuthenticated) {
        // If user is authenticated, check if it's the demo account
        setIsDemoAccount(authUser.email === "jasmindustin@gmail.com")

        // If user is on the home page or login page, redirect to dashboard
        if (window.location.pathname === "/" || window.location.pathname === "/login") {
          redirectToDashboard()
        }
      } else {
        setIsAdmin(false)
        setIsDemoAccount(false)
        setBackendAuthenticated(false)
      }
    })

    // Clean up subscription
    return () => unsubscribe()
  }, [router, backendAuthenticated])

  const signInWithGoogle = async () => {
    try {
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

      // 2. Use the exact pattern from Firebase docs to get and send the ID token
      const idToken = await result.user.getIdToken(true)

      // 3. Send token to backend for verification
      const response = await fetch(`${API_URL}/auth/signInGoogle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        // If backend rejects the authentication, sign out from Firebase
        await firebaseSignOut(auth)
        throw new Error("Backend authentication failed")
      }

      const data = await response.json()

      if (!data || data.error) {
        // If there's an error in the response, sign out from Firebase
        await firebaseSignOut(auth)
        throw new Error(data?.error || "Authentication failed")
      }

      // Set admin status based on backend response
      setIsAdmin(data.isAdmin || false)
      setBackendAuthenticated(true)

      // Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()
    } catch (error) {
      console.error("Google Sign-In error:", error)
      // Sign out if authentication fails
      await firebaseSignOut(auth)
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

      // 2. Send request to backend first
      const response = await fetch(`${API_URL}/auth/signInEmailPass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Authentication failed")
      }

      const data = await response.json()

      // 3. Only if backend authentication succeeds, sign in with Firebase client
      await signInWithEmailAndPassword(auth, email, password)

      // 4. Mark as authenticated with backend
      setBackendAuthenticated(true)

      // 5. Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()

      return data
    } catch (error: any) {
      console.error("Email Sign-In error:", error)
      // Ensure user is signed out if there was an error
      try {
        await firebaseSignOut(auth)
      } catch (signOutError) {
        console.error("Error signing out after failed login:", signOutError)
      }
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

      // 2. Send request to backend first
      const response = await fetch(`${API_URL}/auth/signUpEmailPass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Registration failed")
      }

      const data = await response.json()

      // 3. Only if backend registration succeeds, create user with Firebase client
      await createUserWithEmailAndPassword(auth, email, password)

      // 4. Mark as authenticated with backend
      setBackendAuthenticated(true)

      // 5. Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()

      return data
    } catch (error: any) {
      console.error("Email Sign-Up error:", error)
      // Ensure user is signed out if there was an error
      try {
        await firebaseSignOut(auth)
      } catch (signOutError) {
        console.error("Error signing out after failed registration:", signOutError)
      }
      throw error
    }
  }

  const signOut = async () => {
    setBackendAuthenticated(false)
    await firebaseSignOut(auth)
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
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
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
