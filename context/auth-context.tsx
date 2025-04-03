"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth"
import { useFirebase } from "@/components/firebase-provider"

// List of admin emails
const ADMIN_EMAILS = ["jasmindustin@gmail.com", "dustin.jasmin@jaspire.co", "andyrowe00@gmail.com"]

type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  adminSignIn: (email: string, password: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { auth, initialized, initializing } = useFirebase()

  useEffect(() => {
    // If Firebase is still initializing, keep loading true
    if (initializing) {
      return
    }

    // If Firebase failed to initialize, stop loading
    if (!initialized || !auth) {
      console.log("Firebase not initialized, stopping auth loading")
      setLoading(false)
      return
    }

    console.log("Setting up auth state listener")
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          console.log("Auth state changed:", user ? `User: ${user.email}` : "No user")
          setUser(user)
          setIsAdmin(user ? ADMIN_EMAILS.includes(user.email || "") : false)
          setLoading(false)
        },
        (error) => {
          console.error("Auth state change error:", error)
          setLoading(false)
        },
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("Error setting up auth state listener:", error)
      setLoading(false)
    }
  }, [auth, initialized, initializing])

  const adminSignIn = async (email: string, password: string) => {
    if (!initialized || !auth) {
      console.error("Firebase not initialized")
      return false
    }

    if (!ADMIN_EMAILS.includes(email)) {
      throw new Error("Unauthorized access attempt")
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error) {
      console.error("Admin sign in error:", error)
      return false
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!initialized || !auth) {
      throw new Error("Firebase not initialized")
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    if (!initialized || !auth) {
      throw new Error("Firebase not initialized")
    }
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const resetPassword = async (email: string) => {
    if (!initialized || !auth) {
      throw new Error("Firebase not initialized")
    }
    await sendPasswordResetEmail(auth, email)
  }

  const signOut = async () => {
    if (!initialized || !auth) {
      console.error("Firebase not initialized")
      return
    }
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminSignIn, signIn, signUp, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

