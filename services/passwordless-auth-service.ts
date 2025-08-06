import { apiClient } from './api/client'
import { auth } from '@/lib/firebase-client'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'

interface SendLinkResponse {
  success: boolean
  message?: string
  error?: string
  link?: string // Only in development
}

interface VerifyTokenResponse {
  success: boolean
  token?: string
  user?: {
    uid: string
    email: string
    emailVerified: boolean
  }
  isNewUser?: boolean
  error?: string
}

class PasswordlessAuthService {
  private readonly EMAIL_KEY = 'clearhold_email_for_signin'
  private readonly RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

  /**
   * Send a passwordless sign-in link to the user's email
   */
  async sendSignInLink(email: string): Promise<SendLinkResponse> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Store email for sign-in completion
      this.storeEmailForSignIn(email)

      // Call backend API with retry logic
      const response = await this.retryRequest(async () => {
        return await apiClient.post<SendLinkResponse>('/auth/passwordless/send-link', {
          email
        })
      })

      return response
    } catch (error: any) {
      console.error('Error sending sign-in link:', error)
      
      // Re-throw validation errors
      if (error.message === 'Please enter a valid email address') {
        throw error
      }
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        throw new Error('Too many attempts. Please try again in 1 hour.')
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      
      throw new Error('Failed to send sign-in link. Please try again.')
    }
  }

  /**
   * Verify the sign-in link and complete authentication
   */
  async verifySignInLink(email: string, link: string): Promise<VerifyTokenResponse> {
    try {
      // Verify this is a valid sign-in link
      if (!isSignInWithEmailLink(auth, link)) {
        throw new Error('Invalid sign-in link')
      }

      // Sign in with Firebase
      const result = await signInWithEmailLink(auth, email, link)
      
      // Get ID token
      const idToken = await result.user.getIdToken()

      // Verify token with backend and get custom JWT
      const response = await apiClient.post<VerifyTokenResponse>('/auth/passwordless/verify-token', {
        idToken
      })

      // Clear stored email after successful sign-in
      this.clearEmailForSignIn()

      return response
    } catch (error: any) {
      console.error('Error verifying sign-in link:', error)
      
      // Re-throw validation errors
      if (error.message === 'Invalid sign-in link') {
        throw error
      }
      
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('This sign-in link has expired or has already been used.')
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('The email address is invalid.')
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      
      throw new Error('Failed to verify sign-in link. Please try again.')
    }
  }

  /**
   * Check if the current URL is a sign-in with email link
   */
  isSignInWithEmailLink(link: string): boolean {
    return isSignInWithEmailLink(auth, link)
  }

  /**
   * Store email in localStorage for sign-in completion
   */
  storeEmailForSignIn(email: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.EMAIL_KEY, email)
    }
  }

  /**
   * Get stored email from localStorage
   */
  getEmailForSignIn(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.EMAIL_KEY)
    }
    return null
  }

  /**
   * Clear stored email from localStorage
   */
  clearEmailForSignIn(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.EMAIL_KEY)
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    request: () => Promise<T>,
    retries: number = this.RETRY_DELAYS.length
  ): Promise<T> {
    let lastError: any

    for (let i = 0; i <= retries; i++) {
      try {
        return await request()
      } catch (error) {
        lastError = error
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error
        }

        // Wait before retrying (except on last attempt)
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAYS[i] || 4000))
        }
      }
    }

    throw lastError
  }

  /**
   * Get remaining rate limit time
   */
  getRateLimitResetTime(email: string): Date | null {
    // This would need to be tracked from server responses
    // For now, return 1 hour from current time when rate limited
    return new Date(Date.now() + 60 * 60 * 1000)
  }

  /**
   * Check if user can resend email (client-side cooldown)
   */
  canResendEmail(lastSentTime: Date, cooldownSeconds: number = 60): boolean {
    const now = new Date()
    const timeDiff = (now.getTime() - lastSentTime.getTime()) / 1000
    return timeDiff >= cooldownSeconds
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(targetTime: Date): string {
    const now = new Date()
    const diff = targetTime.getTime() - now.getTime()
    
    if (diff <= 0) return '0s'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Export singleton instance
export const passwordlessAuthService = new PasswordlessAuthService()

// Export types
export type { SendLinkResponse, VerifyTokenResponse }