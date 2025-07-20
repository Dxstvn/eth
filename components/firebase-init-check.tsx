"use client"

import { useEffect, useState } from "react"
import { auth, isFirebaseConfigured } from "@/lib/firebase-client"

export default function FirebaseInitCheck() {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if Firebase Auth is initialized
    if (auth) {
      console.log("Firebase Auth is initialized")
      setIsInitialized(true)
    } else if (!isFirebaseConfigured) {
      console.warn("Firebase is not configured. Environment variables are missing.")
      // Don't log as error since this is expected when env vars aren't set
    } else {
      console.warn("Firebase Auth initialization pending")
    }
  }, [])

  // This component doesn't render anything visible
  return null
}
