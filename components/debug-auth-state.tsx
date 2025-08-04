"use client"

import { useEffect } from "react"
import { auth, isFirebaseConfigured } from "@/lib/firebase-client"

export default function DebugAuthState() {
  useEffect(() => {
    console.log("=== Auth Debug Info ===")
    console.log("1. Firebase configured:", isFirebaseConfigured)
    console.log("2. Firebase auth instance:", !!auth)
    console.log("3. API URL from env:", process.env.NEXT_PUBLIC_API_URL)
    console.log("4. Window location:", window.location.href)
    console.log("5. LocalStorage auth token:", localStorage.getItem('clearhold_auth_token'))
    console.log("6. LocalStorage user profile:", localStorage.getItem('clearhold_user_profile'))
    
    // Check if API client is configured properly
    import('@/services/api-config').then(module => {
      console.log("7. API base URL:", module.API_CONFIG.baseUrl)
    })
    
    // Check auth service state
    import('@/services/auth-service').then(module => {
      const authState = module.authService.getAuthState()
      console.log("8. Auth service state:", authState)
    })
    
    console.log("===================")
  }, [])
  
  return null
}