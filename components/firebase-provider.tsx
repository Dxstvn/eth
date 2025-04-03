"use client"

import type React from "react"
import { useEffect, useState, createContext, useContext } from "react"
import { firebaseClient } from "@/lib/firebase"
import type { FirebaseApp } from "firebase/app"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"

// Create a context for Firebase
type FirebaseContextType = {
  app: FirebaseApp | null
  auth: Auth | null
  db: Firestore | null
  initialized: boolean
  initializing: boolean
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  initialized: false,
  initializing: false,
})

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FirebaseContextType>({
    app: null,
    auth: null,
    db: null,
    initialized: false,
    initializing: true,
  })

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    let isMounted = true

    const initializeFirebase = async () => {
      try {
        await firebaseClient.initialize()

        if (isMounted) {
          setState({
            app: firebaseClient.app,
            auth: firebaseClient.auth,
            db: firebaseClient.db,
            initialized: firebaseClient.initialized,
            initializing: false,
          })
        }
      } catch (error) {
        console.error("Error initializing Firebase in provider:", error)
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            initializing: false,
          }))
        }
      }
    }

    // Start initialization
    initializeFirebase()

    // Check status periodically until initialized
    const checkInterval = setInterval(() => {
      if (firebaseClient.initialized && isMounted) {
        setState({
          app: firebaseClient.app,
          auth: firebaseClient.auth,
          db: firebaseClient.db,
          initialized: true,
          initializing: false,
        })
        clearInterval(checkInterval)
      }
    }, 100)

    return () => {
      isMounted = false
      clearInterval(checkInterval)
    }
  }, [])

  return <FirebaseContext.Provider value={state}>{children}</FirebaseContext.Provider>
}

// Hook to use Firebase
export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}

