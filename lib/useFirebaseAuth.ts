"use client"

import { useState, useEffect } from "react"

interface FirebaseAuth {
  auth: any
  googleProvider: any
}

export function useFirebaseAuth(): FirebaseAuth | null {
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuth | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      console.log("Skipping Firebase init: not in browser")
      return
    }

    const initializeFirebase = () => {
      const firebase = window.firebase
      if (!firebase) {
        console.log("Firebase not yet loaded")
        return
      }

      try {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        }

        console.log("Firebase initialization started")

        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig)
        }
        const app = firebase.app()
        console.log("Firebase app initialized successfully")

        const authInstance = firebase.auth()
        console.log("Auth instance created successfully")

        const googleProviderInstance = new firebase.auth.GoogleAuthProvider()
        console.log("Google provider created successfully")

        setFirebaseAuth({ auth: authInstance, googleProvider: googleProviderInstance })
      } catch (error) {
        console.error("Firebase initialization error:", error)
      }
    }

    if (window.firebaseLoaded) {
      initializeFirebase()
    } else {
      const checkFirebaseLoaded = setInterval(() => {
        if (window.firebaseLoaded) {
          clearInterval(checkFirebaseLoaded)
          initializeFirebase()
        }
      }, 100) // Check every 100ms

      return () => clearInterval(checkFirebaseLoaded)
    }
  }, [])

  return firebaseAuth
}

