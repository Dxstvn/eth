import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth"

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

// Check if Firebase config is valid
const isFirebaseConfigured = firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId;

// Initialize Firebase only if properly configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase is not configured. Please set the required environment variables in Vercel.");
}

// Helper function to get the current user's ID token
export async function getIdToken() {
  if (!auth) {
    throw new Error("Firebase is not configured")
  }
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }
  const idToken = await user.getIdToken(true)
  console.log("Generated ID Token:", idToken)
  return idToken
}

// Export with null checks
export { app, auth, googleProvider, isFirebaseConfigured }
