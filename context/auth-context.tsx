"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/lib/useFirebaseAuth"
import type { User } from "firebase/auth"

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAILS = ["jasmindustin@gmail.com", "dustin.jasmin@jaspire.co", "andyrowe00@gmail.com"]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const firebaseAuth = useFirebaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!firebaseAuth) {
      return
    }

    const { auth } = firebaseAuth

    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed")
      if (user) {
        const email = user.email || ""
        const isAdminUser = ADMIN_EMAILS.includes(email)
        console.log("User authentication processed")

        setUser(user)
        setIsAdmin(isAdminUser)

        if (isAdminUser) {
          // If user is admin and they're on the home page, redirect to dashboard
          // This prevents redirecting when navigating between dashboard pages
          if (window.location.pathname === "/") {
            console.log("Admin user detected on home page, redirecting to dashboard")
            // Use a small timeout to ensure state is updated before redirect
            setTimeout(() => {
              router.push("/dashboard")
            }, 100)
          }
        } else {
          // If not admin, sign out and stay on current page
          console.log("Non-admin user detected, signing out")
          auth.signOut()
          setUser(null)
          setIsAdmin(false)
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [firebaseAuth, router])

  const signInWithGoogle = async () => {
    if (!firebaseAuth) {
      console.error("Sign-in attempted before Firebase initialized")
      throw new Error("Firebase not initialized yet")
    }
    const { auth, googleProvider } = firebaseAuth
    try {
      console.log("Attempting Google sign in...")
      const result = await auth.signInWithPopup(googleProvider)
      const email = result.user.email || ""
      console.log("Sign-in successful")

      if (!ADMIN_EMAILS.includes(email)) {
        console.log("Non-admin user detected, signing out")
        await auth.signOut()
        throw new Error("Unauthorized: Only admin emails are allowed")
      }

      // No need to redirect here, the onAuthStateChanged will handle it
    } catch (error) {
      console.error("Google Sign-In error:", error)
      throw error
    }
  }

  const signOutUser = async () => {
    if (!firebaseAuth) {
      console.error("Sign-out attempted before Firebase initialized")
      throw new Error("Firebase not initialized")
    }
    const { auth } = firebaseAuth
    await auth.signOut()
    setUser(null)
    setIsAdmin(false)
    // Redirect to home page after sign out
    router.push("/")
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

