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

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser)
      setLoading(false)

      if (authUser) {
        // If user is authenticated, check if it's the demo account
        setIsDemoAccount(authUser.email === "jasmindustin@gmail.com")

        // Check if user is admin (has the specific UID from backend)
        setIsAdmin(authUser.uid === "qmKQsr8ZKJb6p7HKeLRGzcB1dsA2")

        // If user is on the home page, redirect to dashboard
        if (window.location.pathname === "/") {
          setTimeout(() => {
            router.push("/dashboard")
          }, 100)
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

      // 2. Get the ID token using the specific method provided
      const idToken = await auth.currentUser?.getIdToken(true)

      if (!idToken) {
        throw new Error("Failed to get ID token")
      }

      // 3. Send the token to your backend
      const response = await fetch(`${API_URL}/auth/signInGoogle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed")
      }

      // No need to redirect here, the useEffect will handle it
      return data
    } catch (error: any) {
      console.error("Google Sign-In error:", error)
      // Sign out if backend authentication fails
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Authentication failed")
      }

      // 3. Sign in with Firebase client
      await signInWithEmailAndPassword(auth, email, password)

      // No need to redirect here, the useEffect will handle it
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Registration failed")
      }

      // 3. Sign in with Firebase client
      await createUserWithEmailAndPassword(auth, email, password)

      // No need to redirect here, the useEffect will handle it
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
