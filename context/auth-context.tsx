"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import LoadingScreen from "@/components/loading-screen"
import { useAuthStore } from "@/lib/mock-firebase-auth"

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_EMAILS = [
  "jasmindustin@gmail.com",
  "dustin.jasmin@jaspire.co",
  "andyrowe00@gmail.com",
  "demo@cryptoescrow.com",
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, signInWithGoogle: mockSignInWithGoogle, signOut: mockSignOut } = useAuthStore()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (user) {
      const email = user.email || ""
      const isAdminUser = ADMIN_EMAILS.includes(email)
      setIsAdmin(isAdminUser)

      if (isAdminUser) {
        // If user is admin and they're on the home page, redirect to dashboard
        if (window.location.pathname === "/") {
          // Use a small timeout to ensure state is updated before redirect
          setTimeout(() => {
            router.push("/dashboard")
          }, 100)
        }
      }
    } else {
      setIsAdmin(false)
    }
  }, [user, router])

  const signInWithGoogle = async () => {
    try {
      await mockSignInWithGoogle()
      // No need to redirect here, the useEffect will handle it
    } catch (error) {
      console.error("Google Sign-In error:", error)
      throw error
    }
  }

  const signOut = async () => {
    await mockSignOut()
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
