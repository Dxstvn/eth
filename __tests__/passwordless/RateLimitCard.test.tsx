import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import RateLimitCard from '@/components/auth/passwordless/RateLimitCard'

describe('RateLimitCard', () => {
  const mockOnRetry = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render with all required elements', () => {
      const resetTime = new Date(Date.now() + 3600000) // 1 hour from now
      
      render(
        <RateLimitCard
          resetTime={resetTime}
          attemptsRemaining={0}
          maxAttempts={3}
        />
      )
      
      expect(screen.getByText('Rate Limit Reached')).toBeInTheDocument()
      expect(screen.getByText('Too many sign-in attempts. Please wait before trying again.')).toBeInTheDocument()
      expect(screen.getByText('Rate limit will reset in approximately 1 hour')).toBeInTheDocument()
      expect(screen.getByText('This limit helps protect your account from unauthorized access attempts.')).toBeInTheDocument()
    })

    it('should show attempts indicator', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
          maxAttempts={3}
        />
      )
      
      expect(screen.getByText('Attempts used')).toBeInTheDocument()
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('should show progress bar', () => {
      const { container } = render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={1}
          maxAttempts={3}
        />
      )
      
      const progressBar = container.querySelector('.bg-gradient-to-r')
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' })
    })
  })

  describe('Alternative Sign-in Methods', () => {
    it('should show alternative methods by default', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
        />
      )
      
      expect(screen.getByText('Try another method:')).toBeInTheDocument()
      expect(screen.getByText('Sign in with password')).toBeInTheDocument()
      expect(screen.getByText('Reset your password')).toBeInTheDocument()
    })

    it('should hide alternatives when showAlternatives is false', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
          showAlternatives={false}
        />
      )
      
      expect(screen.queryByText('Try another method:')).not.toBeInTheDocument()
    })

    it('should have correct links for alternatives', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
        />
      )
      
      const passwordLink = screen.getByText('Sign in with password').closest('a')
      expect(passwordLink).toHaveAttribute('href', '/login?method=password')
      
      const resetLink = screen.getByText('Reset your password').closest('a')
      expect(resetLink).toHaveAttribute('href', '/forgot-password')
    })
  })

  describe('Retry Functionality', () => {
    it('should not show retry button before reset time', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
          onRetry={mockOnRetry}
        />
      )
      
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })

    it('should show retry button after reset time', async () => {
      // Start with a time in the past so retry is immediately available
      const resetTime = Date.now() - 1000 // Already past reset time
      
      render(
        <RateLimitCard
          resetTime={resetTime}
          attemptsRemaining={0}
          onRetry={mockOnRetry}
        />
      )
      
      // Component should immediately show retry button
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', () => {
      const resetTime = Date.now() - 1000 // Already past reset time
      
      render(
        <RateLimitCard
          resetTime={resetTime}
          attemptsRemaining={0}
          onRetry={mockOnRetry}
        />
      )
      
      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)
      expect(mockOnRetry).toHaveBeenCalled()
    })
  })

  describe('Security Message', () => {
    it('should show security explanation', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
        />
      )
      
      expect(screen.getByText('Why this limit?')).toBeInTheDocument()
      expect(screen.getByText('We limit sign-in attempts to protect your account from unauthorized access attempts.')).toBeInTheDocument()
    })
  })

  describe('Support Information', () => {
    it('should show support contact information', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
        />
      )
      
      expect(screen.getByText('Need immediate access?')).toBeInTheDocument()
      const supportLink = screen.getByText('Contact support')
      expect(supportLink).toHaveAttribute('href', '/support')
    })
  })

  describe('Time Display', () => {
    it('should accept Date object for resetTime', () => {
      const resetDate = new Date(Date.now() + 3600000)
      
      render(
        <RateLimitCard
          resetTime={resetDate}
          attemptsRemaining={0}
        />
      )
      
      expect(screen.getByText('Rate limit will reset in approximately 1 hour')).toBeInTheDocument()
    })

    it('should accept number (timestamp) for resetTime', () => {
      const resetTimestamp = Date.now() + 3600000
      
      render(
        <RateLimitCard
          resetTime={resetTimestamp}
          attemptsRemaining={0}
        />
      )
      
      expect(screen.getByText('Rate limit will reset in approximately 1 hour')).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
          className="custom-class"
        />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Icons', () => {
    it('should display appropriate icons', () => {
      render(
        <RateLimitCard
          resetTime={Date.now() + 3600000}
          attemptsRemaining={0}
        />
      )
      
      // Check for various icons used in the component
      expect(screen.getByText('Rate Limit Reached').parentElement?.querySelector('svg')).toBeInTheDocument()
    })
  })
})