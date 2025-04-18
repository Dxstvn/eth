"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import LoadingScreen from "@/components/loading-screen"
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase-client"

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// List of allowed email addresses
const ALLOWED_EMAILS = [
  "dustin.jasmin@jaspire.co",
  "jasmindustin@gmail.com",
  "andyrowe00@gmail.com",
  "demo@cryptoescrow.com", // Keep the demo account for testing
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser)
      setLoading(false)

      if (authUser) {
        const email = authUser.email || ""
        const isAllowed = ALLOWED_EMAILS.includes(email)
        setIsAdmin(isAllowed)

        if (isAllowed) {
          // If user is allowed and they're on the home page, redirect to dashboard
          if (window.location.pathname === "/") {
            // Use a small timeout to ensure state is updated before redirect
            setTimeout(() => {
              router.push("/dashboard")
            }, 100)
          }
        } else {
          // If user is not allowed, sign them out
          firebaseSignOut(auth).then(() => {
            // Redirect to home page with error message
            router.push("/?error=unauthorized")
          })
        }
      } else {
        setIsAdmin(false)
      }
    })

    // Clean up subscription
    return () => unsubscribe()
  }, [router])

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email || ""

      // Check if the email is allowed
      if (!ALLOWED_EMAILS.includes(email)) {
        await firebaseSignOut(auth)
        throw new Error("Unauthorized email address. Access denied.")
      }

      // No need to redirect here, the useEffect will handle it
    } catch (error) {
      console.error("Google Sign-In error:", error)
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
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
