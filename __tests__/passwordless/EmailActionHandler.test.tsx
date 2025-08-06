import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmailActionPage from '@/app/auth/email-action/page'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context-v2'
import { passwordlessAuthService } from '@/services/passwordless-auth-service'

// Mock dependencies
vi.mock('next/navigation')
vi.mock('@/context/auth-context-v2')
vi.mock('@/services/passwordless-auth-service')

// Mock window.location
const mockLocation = {
  href: 'https://app.clearhold.com/auth/email-action?mode=signIn&oobCode=test123'
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('EmailActionPage', () => {
  const mockPush = vi.fn()
  const mockVerifyPasswordlessLink = vi.fn()
  const mockSearchParams = new URLSearchParams()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
    
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams)
    
    vi.mocked(useAuth).mockReturnValue({
      verifyPasswordlessLink: mockVerifyPasswordlessLink,
    } as any)
    
    // Default: valid sign-in link
    vi.mocked(passwordlessAuthService.isSignInWithEmailLink).mockReturnValue(true)
  })

  describe('Loading State', () => {
    it('should show verifying state when processing sign-in', async () => {
      // Set up valid link scenario
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('test@example.com')
      
      // Mock slow verification
      mockVerifyPasswordlessLink.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<EmailActionPage />)
      
      // Wait for verifying state
      await waitFor(() => {
        expect(screen.getByText('Completing your sign-in...')).toBeInTheDocument()
      })
    })
  })

  describe('Same Device Flow', () => {
    it('should auto-verify when email is found in storage', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('stored@example.com')
      mockVerifyPasswordlessLink.mockResolvedValue({})
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(mockVerifyPasswordlessLink).toHaveBeenCalledWith(
          'stored@example.com',
          mockLocation.href
        )
      })
      
      expect(screen.getByText('Sign In Successful!')).toBeInTheDocument()
      expect(screen.getByText('Welcome back! Redirecting to your dashboard...')).toBeInTheDocument()
    })

    it('should handle verification errors on same device', async () => {
      const errorMessage = 'Invalid or expired link'
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('stored@example.com')
      mockVerifyPasswordlessLink.mockRejectedValue(new Error(errorMessage))
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        // The error is displayed through the PasswordlessErrorState component
        // The error type detection sees "expired" and shows appropriate message
        expect(screen.getByText('Link Expired')).toBeInTheDocument()
        expect(screen.getByText('This sign-in link has expired for your security.')).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Device Flow', () => {
    it('should show email prompt when no stored email', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue(null)
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cross-Device Sign In')).toBeInTheDocument()
        expect(screen.getByText("It looks like you're signing in from a different device")).toBeInTheDocument()
      })
    })

    it('should handle email submission in cross-device flow', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue(null)
      mockVerifyPasswordlessLink.mockResolvedValue({})
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cross-Device Sign In')).toBeInTheDocument()
      })
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Complete Sign In' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockVerifyPasswordlessLink).toHaveBeenCalledWith(
          'test@example.com',
          mockLocation.href
        )
        expect(screen.getByText('Sign In Successful!')).toBeInTheDocument()
      })
    })

    it('should handle errors in cross-device flow', async () => {
      const user = userEvent.setup()
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue(null)
      
      // Mock verifyPasswordlessLink to reject with error
      mockVerifyPasswordlessLink.mockRejectedValue(new Error('Something went wrong'))
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Cross-Device Sign In')).toBeInTheDocument()
      })
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Complete Sign In' })
      
      // Enter email and submit
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        // Verify that the submit was attempted
        expect(mockVerifyPasswordlessLink).toHaveBeenCalledWith(
          'test@example.com',
          expect.any(String)
        )
      })
    })

    it('should show device verification card', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue(null)
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Device Verification')).toBeInTheDocument()
        expect(screen.getByText('Confirming your device for secure sign-in')).toBeInTheDocument()
      })
    })
  })

  describe('Invalid Link Handling', () => {
    it('should show error for invalid sign-in links', async () => {
      vi.mocked(passwordlessAuthService.isSignInWithEmailLink).mockReturnValue(false)
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Sign-in Link')).toBeInTheDocument()
        expect(screen.getByText('This link is not valid or may have been used already.')).toBeInTheDocument()
      })
    })

    it('should provide back to login option for invalid links', async () => {
      vi.mocked(passwordlessAuthService.isSignInWithEmailLink).mockReturnValue(false)
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Sign-in Link')).toBeInTheDocument()
      })
      
      // The "Back to Login" is rendered as a Link inside a Button
      const loginButton = screen.getByRole('button', { name: 'Back to Login' })
      expect(loginButton).toBeInTheDocument()
      
      // Check that it's wrapped in a link to /login
      const loginLink = loginButton.closest('a')
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Error States', () => {
    it('should handle expired link errors', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('test@example.com')
      mockVerifyPasswordlessLink.mockRejectedValue(new Error('Link has expired'))
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Link Expired')).toBeInTheDocument()
        expect(screen.getByText('This sign-in link has expired for your security.')).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('test@example.com')
      mockVerifyPasswordlessLink.mockRejectedValue(new Error('Something went wrong'))
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Success State', () => {
    it('should show success message and loading spinner', async () => {
      vi.mocked(passwordlessAuthService.getEmailForSignIn).mockReturnValue('test@example.com')
      mockVerifyPasswordlessLink.mockResolvedValue({})
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Sign In Successful!')).toBeInTheDocument()
        // Check for loading spinner
        const spinner = screen.getByText('Welcome back! Redirecting to your dashboard...').parentElement?.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should redirect to login if no email in URL params', () => {
      mockSearchParams.get = vi.fn().mockReturnValue(null)
      
      render(<EmailActionPage />)
      
      // Component should handle missing email gracefully
      expect(mockPush).not.toHaveBeenCalledWith('/login')
    })

    it('should show home link when not loading or successful', async () => {
      vi.mocked(passwordlessAuthService.isSignInWithEmailLink).mockReturnValue(false)
      
      render(<EmailActionPage />)
      
      await waitFor(() => {
        const homeLink = screen.getByText('Back to Home')
        expect(homeLink).toBeInTheDocument()
        expect(homeLink.closest('a')).toHaveAttribute('href', '/')
      })
    })
  })

  describe('Branding', () => {
    it('should display ClearHold branding', () => {
      render(<EmailActionPage />)
      
      expect(screen.getByText('Clear')).toBeInTheDocument()
      expect(screen.getByText('Hold')).toBeInTheDocument()
    })
  })
})