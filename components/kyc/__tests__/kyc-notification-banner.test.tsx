import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { KYCNotificationBanner, KYCNotificationCard } from '../kyc-notification-banner'
import { useAuth } from '@/context/auth-context-v2'
import { useKYC } from '@/context/kyc-context'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}))

// Mock auth context
jest.mock('@/context/auth-context-v2', () => ({
  useAuth: jest.fn()
}))

// Mock KYC context
jest.mock('@/context/kyc-context', () => ({
  useKYC: jest.fn()
}))

describe('KYCNotificationBanner', () => {
  const mockPush = jest.fn()
  const mockRefreshKYCStatus = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(usePathname as jest.Mock).mockReturnValue('/dashboard')
    ;(useKYC as jest.Mock).mockReturnValue({
      kycData: { status: 'not_started' },
      refreshKYCStatus: mockRefreshKYCStatus
    })
    
    // Clear sessionStorage
    sessionStorage.clear()
  })

  describe('Visibility Logic', () => {
    it('should show banner when user needs KYC', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      render(<KYCNotificationBanner />)

      expect(screen.getByText(/Complete identity verification/)).toBeInTheDocument()
    })

    it('should not show banner when user has completed KYC', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed'
        }
      })

      render(<KYCNotificationBanner />)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
    })

    it('should not show banner on auth pages', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })
      ;(usePathname as jest.Mock).mockReturnValue('/sign-in')

      render(<KYCNotificationBanner />)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
    })

    it('should not show banner during onboarding', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: false,
          kycLevel: 'none'
        }
      })
      ;(usePathname as jest.Mock).mockReturnValue('/onboarding/welcome')

      render(<KYCNotificationBanner />)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
    })
  })

  describe('Banner States', () => {
    it('should show under review state', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'under_review' },
        refreshKYCStatus: mockRefreshKYCStatus
      })

      render(<KYCNotificationBanner />)

      expect(screen.getByText(/Your identity verification is under review/)).toBeInTheDocument()
      expect(screen.queryByText('Verify Identity')).not.toBeInTheDocument()
    })

    it('should show rejected state', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'rejected' },
        refreshKYCStatus: mockRefreshKYCStatus
      })

      render(<KYCNotificationBanner />)

      expect(screen.getByText(/Your verification was unsuccessful/)).toBeInTheDocument()
      expect(screen.getByText('Retry Verification')).toBeInTheDocument()
    })

    it('should show additional info required state', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'additional_info_required' },
        refreshKYCStatus: mockRefreshKYCStatus
      })

      render(<KYCNotificationBanner />)

      expect(screen.getByText(/Additional information is required/)).toBeInTheDocument()
      expect(screen.getByText('Provide Information')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle verify button click', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      render(<KYCNotificationBanner />)

      const button = screen.getByText('Verify Identity')
      fireEvent.click(button)

      expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
      expect(sessionStorage.getItem('kycRedirectPath')).toBe('/dashboard')
    })

    it('should handle dismiss button', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      render(<KYCNotificationBanner dismissible={true} />)

      const dismissButton = screen.getByRole('button', { name: '' })
      fireEvent.click(dismissButton)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
      expect(sessionStorage.getItem('kycBannerDismissed')).toBe('true')
    })

    it('should respect dismissed state from sessionStorage', () => {
      sessionStorage.setItem('kycBannerDismissed', 'true')
      
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      render(<KYCNotificationBanner />)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
    })
  })

  describe('Banner Variants', () => {
    it('should render inline variant', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      const { container } = render(<KYCNotificationBanner variant="inline" />)

      expect(container.querySelector('.rounded-none')).toBeInTheDocument()
    })

    it('should render floating variant', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      const { container } = render(<KYCNotificationBanner variant="floating" />)

      expect(container.querySelector('.fixed')).toBeInTheDocument()
    })

    it('should position banner at top', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      const { container } = render(<KYCNotificationBanner variant="floating" position="top" />)

      expect(container.querySelector('.top-4')).toBeInTheDocument()
    })

    it('should position banner at bottom', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      const { container } = render(<KYCNotificationBanner variant="floating" position="bottom" />)

      expect(container.querySelector('.bottom-4')).toBeInTheDocument()
    })
  })

  describe('Auto Refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should refresh KYC status periodically', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      render(<KYCNotificationBanner />)

      // Fast forward 1 minute
      jest.advanceTimersByTime(60000)

      expect(mockRefreshKYCStatus).toHaveBeenCalled()
    })
  })
})

describe('KYCNotificationCard', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useKYC as jest.Mock).mockReturnValue({
      kycData: { status: 'not_started' }
    })
  })

  it('should render card when user needs KYC', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: {
        kycLevel: 'none'
      }
    })

    render(<KYCNotificationCard />)

    expect(screen.getByText('Verify Your Identity')).toBeInTheDocument()
    expect(screen.getByText('Complete KYC to access all features')).toBeInTheDocument()
  })

  it('should not render card when user has KYC', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: {
        kycLevel: 'basic'
      }
    })

    render(<KYCNotificationCard />)

    expect(screen.queryByText('Verify Your Identity')).not.toBeInTheDocument()
  })

  it('should handle start verification click', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: {
        kycLevel: 'none'
      }
    })

    render(<KYCNotificationCard />)

    const button = screen.getByText('Start Verification')
    fireEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
  })
})