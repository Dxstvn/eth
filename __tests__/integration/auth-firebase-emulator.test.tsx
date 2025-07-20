/**
 * Firebase Emulator Integration Tests
 * 
 * These tests use Firebase emulators to test authentication flows.
 * They create test users and verify frontend authentication with backend endpoints.
 */

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Remove Firebase mocks for this test file
const originalMocks = jest.genMockFromModule('firebase/auth')
jest.unmock('firebase/auth')
jest.unmock('firebase/app')
jest.unmock('firebase/firestore')

// Firebase emulator configuration
const firebaseConfig = {
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project-emulator',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: 'test-app-id-emulator',
}

// Initialize test Firebase app
const testApp = initializeApp(firebaseConfig, 'emulator-test-app')
const testAuth = getAuth(testApp)
const testFirestore = getFirestore(testApp)

// Connect to emulators
try {
  connectAuthEmulator(testAuth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(testFirestore, 'localhost', 8080)
} catch (error: any) {
  console.warn('Emulators already connected:', error.message)
}

const STAGING_API_URL = 'https://api.clearhold.app'

describe('Firebase Emulator Integration Tests', () => {
  let createdUsers: any[] = []

  beforeEach(async () => {
    // Sign out any existing user
    if (testAuth.currentUser) {
      await signOut(testAuth)
    }
    createdUsers = []
  })

  afterEach(async () => {
    // Clean up created users
    for (const user of createdUsers) {
      try {
        if (user && user.delete) {
          await user.delete()
        }
      } catch (error: any) {
        console.warn('Failed to delete test user:', error.message)
      }
    }
    
    // Sign out any remaining user
    if (testAuth.currentUser) {
      await signOut(testAuth)
    }
  })

  describe('Firebase Emulator User Creation', () => {
    it('should create a test user with Firebase emulator', async () => {
      const testEmail = `test-user-${Date.now()}@example.com`
      const testPassword = 'TestPassword123!'

      const userCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword)
      createdUsers.push(userCredential.user)
      
      expect(userCredential.user).toBeDefined()
      expect(userCredential.user.email).toBe(testEmail)
      expect(userCredential.user.uid).toBeDefined()
      expect(typeof userCredential.user.uid).toBe('string')

      // Verify user is signed in
      expect(testAuth.currentUser).toBe(userCredential.user)
      expect(testAuth.currentUser?.email).toBe(testEmail)
    })

    it('should sign in with existing Firebase emulator user', async () => {
      const testEmail = `signin-user-${Date.now()}@example.com`
      const testPassword = 'SignInTest123!'

      // Create user first
      const createCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword)
      const originalUid = createCredential.user.uid
      createdUsers.push(createCredential.user)
      
      // Sign out
      await signOut(testAuth)
      expect(testAuth.currentUser).toBeNull()

      // Sign in with created user
      const signInCredential = await signInWithEmailAndPassword(testAuth, testEmail, testPassword)
      
      expect(signInCredential.user.email).toBe(testEmail)
      expect(signInCredential.user.uid).toBe(originalUid)
      expect(testAuth.currentUser).toBe(signInCredential.user)
    })

    it('should generate Firebase ID tokens for backend authentication', async () => {
      const testEmail = `token-user-${Date.now()}@example.com`
      const testPassword = 'TokenTest123!'

      const userCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword)
      createdUsers.push(userCredential.user)

      // Get ID token
      const idToken = await userCredential.user.getIdToken()
      
      expect(idToken).toBeDefined()
      expect(typeof idToken).toBe('string')
      expect(idToken.length).toBeGreaterThan(50)

      // Verify token has expected structure (JWT-like)
      const tokenParts = idToken.split('.')
      expect(tokenParts.length).toBe(3) // header.payload.signature
    })
  })

  describe('Backend Integration with Firebase Tokens', () => {
    it('should call backend authentication endpoint with Firebase ID token', async () => {
      const testEmail = `backend-test-${Date.now()}@example.com`
      const testPassword = 'BackendTest123!'

      // Create user in Firebase emulator
      const userCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword)
      createdUsers.push(userCredential.user)
      
      const idToken = await userCredential.user.getIdToken()

      // Test direct backend call with token
      const response = await fetch(`${STAGING_API_URL}/auth/signInGoogle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: idToken,
        }),
      })

      // The backend might return an error for emulator tokens, but it should respond properly
      expect(response).toBeDefined()
      expect(response.status).toBeDefined()
      
      // Check that response is proper JSON
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')

      const data = await response.json()
      expect(data).toBeDefined()
      
      // We expect either success or a proper error response
      if (response.ok) {
        expect(data).toHaveProperty('user')
        expect(data).toHaveProperty('token')
      } else {
        expect(data).toHaveProperty('error')
      }
    })

    it('should validate token format before sending to backend', async () => {
      const testEmail = `validation-${Date.now()}@example.com`
      const testPassword = 'ValidationTest123!'

      const userCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword)
      createdUsers.push(userCredential.user)
      
      const idToken = await userCredential.user.getIdToken()

      // Validate token before using it
      expect(idToken).toBeDefined()
      expect(typeof idToken).toBe('string')
      expect(idToken.trim()).toBe(idToken) // No whitespace
      expect(idToken.length).toBeGreaterThan(100) // Reasonable minimum length
      
      // Should be base64-like format (JWT)
      const parts = idToken.split('.')
      expect(parts.length).toBe(3)
      
      // Each part should be base64-encoded
      for (const part of parts) {
        expect(part.length).toBeGreaterThan(0)
        expect(/^[A-Za-z0-9_-]+$/.test(part)).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle Firebase authentication errors properly', async () => {
      // Test invalid email format
      await expect(
        createUserWithEmailAndPassword(testAuth, 'invalid-email', 'password123')
      ).rejects.toThrow()

      // Test weak password
      await expect(
        createUserWithEmailAndPassword(testAuth, 'test@example.com', '123')
      ).rejects.toThrow()

      // Test sign in with non-existent user
      await expect(
        signInWithEmailAndPassword(testAuth, 'nonexistent@example.com', 'password123')
      ).rejects.toThrow()
    })

    it('should handle backend errors when using invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token'
      
      const response = await fetch(`${STAGING_API_URL}/auth/signInGoogle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: invalidToken,
        }),
      })

      expect(response.ok).toBe(false)
      expect([400, 401, 422]).toContain(response.status)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })
}) 