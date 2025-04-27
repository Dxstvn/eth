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

  // Helper function for redirection after successful authentication
  const redirectToDashboard = () => {
    // Use setTimeout to ensure state updates have been processed
    setTimeout(() => {
      router.push("/dashboard")
    }, 100)
  }

  useEffect(() => {
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
        setIsAdmin(false)
        setIsDemoAccount(false)
      }
    })

    // Clean up subscription
    return () => unsubscribe()
  }, [router])

  const signInWithGoogle = async () => {
    try {
      // 1. Sign in with Google to get credentials
      await signInWithPopup(auth, googleProvider)

      // 2. Use the exact pattern from Firebase docs to get and send the ID token
      return new Promise<void>((resolve, reject) => {
        auth.currentUser
          .getIdToken(/* forceRefresh */ true)
          .then((idToken) => {
            // Send token to your backend via HTTPS
            fetch(`${API_URL}/auth/signInGoogle`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ idToken }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (!data || data.error) {
                  throw new Error(data?.error || "Authentication failed")
                }

                // Set admin status based on backend response
                setIsAdmin(data.isAdmin || false)

                // Explicitly redirect to dashboard after successful authentication
                redirectToDashboard()

                resolve()
              })
              .catch((error) => {
                console.error("Backend authentication error:", error)
                reject(error)
              })
          })
          .catch((error) => {
            // Handle error
            console.error("Error getting ID token:", error)
            reject(error)
          })
      })
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

      // 2. Send request to backend
      const response = await fetch(`${API_URL}/auth/signInEmailPass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed")
      }

      // 3. Sign in with Firebase client
      await signInWithEmailAndPassword(auth, email, password)

      // 4. Explicitly redirect to dashboard after successful authentication
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

      // 2. Send request to backend
      const response = await fetch(`${API_URL}/auth/signUpEmailPass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      // 3. Sign in with Firebase client
      await createUserWithEmailAndPassword(auth, email, password)

      // 4. Explicitly redirect to dashboard after successful authentication
      redirectToDashboard()

      return data
    } catch (error: any) {
      console.error("Email Sign-Up error:", error)
      throw error
    }
  }

  const signOut = async () => {
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
