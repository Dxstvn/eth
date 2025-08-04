"use client"

import { useEffect, useState } from "react"
import { API_CONFIG } from "@/services/api-config"

export default function DebugPage() {
  const [results, setResults] = useState<any>({})
  
  useEffect(() => {
    async function runTests() {
      const testResults: any = {}
      
      // Test 1: Check environment variables
      testResults.env = {
        API_URL: process.env.NEXT_PUBLIC_API_URL,
        FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
        FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
        FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Not set",
      }
      
      // Test 2: Check API config
      testResults.apiConfig = {
        baseUrl: API_CONFIG.baseUrl,
        hasNgrok: API_CONFIG.baseUrl?.includes('ngrok')
      }
      
      // Test 3: Try direct API call with ngrok header
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (API_CONFIG.baseUrl?.includes('ngrok')) {
          headers['ngrok-skip-browser-warning'] = 'true'
        }
        
        const response = await fetch(`${API_CONFIG.baseUrl}/health`, {
          headers,
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          testResults.healthCheck = { success: true, data }
        } else {
          testResults.healthCheck = { success: false, status: response.status }
        }
      } catch (error: any) {
        testResults.healthCheck = { success: false, error: error.message }
      }
      
      // Test 4: Check localStorage
      testResults.localStorage = {
        authToken: localStorage.getItem('clearhold_auth_token') ? 'Present' : 'Not found',
        userProfile: localStorage.getItem('clearhold_user_profile') ? 'Present' : 'Not found',
      }
      
      // Test 5: Check Firebase
      try {
        const { auth, isFirebaseConfigured } = await import('@/lib/firebase-client')
        testResults.firebase = {
          configured: isFirebaseConfigured,
          authExists: !!auth
        }
      } catch (error: any) {
        testResults.firebase = { error: error.message }
      }
      
      setResults(testResults)
    }
    
    runTests()
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ClearHold Debug Page</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}