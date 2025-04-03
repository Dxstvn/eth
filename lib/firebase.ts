"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { type Auth, getAuth } from "firebase/auth"
import { type Firestore, getFirestore } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Create a class to handle Firebase initialization
class FirebaseClient {
  private static instance: FirebaseClient
  private _app: FirebaseApp | null = null
  private _auth: Auth | null = null
  private _db: Firestore | null = null
  private _initialized = false
  private _initializing = false
  private _initPromise: Promise<void> | null = null

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): FirebaseClient {
    if (!FirebaseClient.instance) {
      FirebaseClient.instance = new FirebaseClient()
    }
    return FirebaseClient.instance
  }

  public async initialize(): Promise<void> {
    // Only initialize once and only on client side
    if (typeof window === "undefined" || this._initialized || this._initializing) {
      return this._initPromise
    }

    this._initializing = true

    this._initPromise = new Promise<void>((resolve, reject) => {
      try {
        // Initialize Firebase app
        console.log("Initializing Firebase app...")
        this._app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

        // Wait a bit to ensure Firebase core is ready before initializing Auth
        setTimeout(() => {
          try {
            console.log("Initializing Firebase Auth...")
            this._auth = getAuth(this._app)

            console.log("Initializing Firestore...")
            this._db = getFirestore(this._app)

            this._initialized = true
            this._initializing = false
            console.log("Firebase fully initialized")
            resolve()
          } catch (error) {
            console.error("Error during Firebase services initialization:", error)
            this._initializing = false
            reject(error)
          }
        }, 500) // Increased delay to ensure Firebase core is ready
      } catch (error) {
        console.error("Error initializing Firebase app:", error)
        this._initializing = false
        reject(error)
      }
    })

    return this._initPromise
  }

  public get app(): FirebaseApp | null {
    return this._app
  }

  public get auth(): Auth | null {
    return this._auth
  }

  public get db(): Firestore | null {
    return this._db
  }

  public get initialized(): boolean {
    return this._initialized
  }
}

// Export a singleton instance
const firebaseClient = FirebaseClient.getInstance()

// Initialize Firebase on module load (client-side only)
if (typeof window !== "undefined") {
  firebaseClient.initialize().catch((error) => {
    console.error("Failed to initialize Firebase:", error)
  })
}

export { firebaseClient }

