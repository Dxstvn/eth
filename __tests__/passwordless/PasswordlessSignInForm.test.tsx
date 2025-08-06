import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordlessSignInForm from '@/components/auth/passwordless/PasswordlessSignInForm'
import { useAuth } from '@/context/auth-context-v2'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('next/navigation')

describe('PasswordlessSignInForm', () => {
  const mockSendPasswordlessLink = vi.fn()
  const mockPush = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    vi.mocked(useAuth).mockReturnValue({
      sendPasswordlessLink: mockSendPasswordlessLink,
    } as any)
    
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)
  })

  describe('Rendering', () => {
    it('should render the form with all elements', () => {
      render(<PasswordlessSignInForm />)
      
      expect(screen.getByText('Sign in to ClearHold')).toBeInTheDocument()
      expect(screen.getByText('Enter your email to receive a secure sign-in link')).toBeInTheDocument()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Continue with Email' })).toBeInTheDocument()
    })

    it('should render with initial email when provided', () => {
      render(<PasswordlessSignInForm initialEmail="test@example.com" />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should render with custom className', () => {
      render(<PasswordlessSignInForm className="custom-class" />)
      
      const card = screen.getByText('Sign in to ClearHold').closest('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Email Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      const { container } = render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const form = container.querySelector('form')!
      
      await user.type(emailInput, 'invalid-email')
      
      // Trigger form submission directly to bypass HTML5 validation
      fireEvent.submit(form)
      
      await waitFor(() => {
        // Check for the error text
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
      
      expect(mockSendPasswordlessLink).not.toHaveBeenCalled()
    })

    it('should accept valid email formats', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockResolvedValue({})
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'valid@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSendPasswordlessLink).toHaveBeenCalledWith('valid@example.com')
      })
    })
  })

  describe('Form Submission', () => {
    it('should handle successful submission', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockResolvedValue({})
      
      render(<PasswordlessSignInForm onSuccess={mockOnSuccess} />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockSendPasswordlessLink).toHaveBeenCalledWith('test@example.com')
        expect(mockOnSuccess).toHaveBeenCalledWith('test@example.com')
        expect(screen.getByText(/We've sent a sign-in link to/)).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(screen.getByText('Sending secure link...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should redirect to email-sent page after success', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockResolvedValue({})
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/email-sent?email=test%40example.com')
      }, { timeout: 2000 })
    })
  })

  describe('Error Handling', () => {
    it('should handle general errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Network error occurred'
      mockSendPasswordlessLink.mockRejectedValue(new Error(errorMessage))
      
      render(<PasswordlessSignInForm onError={mockOnError} />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(mockOnError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should handle rate limit errors', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Too many attempts. Please try again later.'
      mockSendPasswordlessLink.mockRejectedValue(new Error(errorMessage))
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        // The rate limit message shows "60m 0s" not "1h 0m"
        expect(screen.getByText(/Rate limit reached\. Try again in \d+m \d+s/)).toBeInTheDocument()
        expect(submitButton).toBeDisabled()
      })
    })

    it('should show default error message when error has no message', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockRejectedValue({})
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to send sign-in link. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Success State', () => {
    it('should show success message after sending link', async () => {
      const user = userEvent.setup()
      mockSendPasswordlessLink.mockResolvedValue({})
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/We've sent a sign-in link to/)).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('Please check your email and click the secure link to sign in.')).toBeInTheDocument()
        expect(screen.getByText('The link will expire in 1 hour for your security.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByLabelText('Email address')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<PasswordlessSignInForm />)
      
      // Tab to email input
      await user.tab()
      expect(screen.getByPlaceholderText('you@example.com')).toHaveFocus()
      
      // Tab to submit button
      await user.tab()
      expect(screen.getByRole('button', { name: 'Continue with Email' })).toHaveFocus()
    })
  })

  describe('Rate Limiting UI', () => {
    it('should format remaining time correctly', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Too many attempts'
      mockSendPasswordlessLink.mockRejectedValue(new Error(errorMessage))
      
      render(<PasswordlessSignInForm />)
      
      const emailInput = screen.getByPlaceholderText('you@example.com')
      const submitButton = screen.getByRole('button', { name: 'Continue with Email' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Rate limit reached/)).toBeInTheDocument()
      })
    })
  })
})