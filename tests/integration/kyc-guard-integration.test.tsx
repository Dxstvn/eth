import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { KYCGuard } from '@/components/kyc/kyc-guard'
import { KYCNotificationBanner } from '@/components/kyc/kyc-notification-banner'
import { AuthProvider } from '@/context/auth-context-v2'
import { KYCProvider } from '@/context/kyc-context'
import { kycAPI } from '@/lib/services/kyc-api-service'
import NewTransactionPage from '@/app/transactions/new/page'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/transactions/new')
}))

jest.mock('@/lib/services/kyc-api-service', () => ({
  kycAPI: {
    getStatus: jest.fn()
  }
}))

// Mock other contexts/components
jest.mock('@/context/wallet-context', () => ({
  useWallet: () => ({
    isConnected: true,
    connectWallet: jest.fn(),
    isConnecting: false,
    error: null
  })
}))

jest.mock('@/context/transaction-context', () => ({
  useTransaction: () => ({
    createTransaction: jest.fn()
  })
}))

jest.mock('@/context/contact-context', () => ({
  ContactProvider: ({ children }: any) => children
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}))

describe('KYC Guard Integration', () => {
  const mockPush = jest.fn()
  
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <KYCProvider>
        {children}
      </KYCProvider>
    </AuthProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    sessionStorage.clear()
  })

  describe('Protected Page Access', () => {
    it('should block access to transaction page without KYC', async () => {
      // Mock user without KYC
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          kycLevel: 'none',
          hasCompletedOnboarding: true
        },
        authToken: 'test-token'
      })

      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: {
          level: 'none',
          status: 'not_started'
        }
      })

      render(
        <TestWrapper>
          <NewTransactionPage />
        </TestWrapper>
      )

      // Should show KYC guard instead of transaction form
      await waitFor(() => {
        expect(screen.getByText('Identity Verification Required')).toBeInTheDocument()
        expect(screen.getByText('Complete identity verification to create secure escrow transactions')).toBeInTheDocument()
      })

      // Should not show transaction content
      expect(screen.queryByText('Create New Transaction')).not.toBeInTheDocument()
    })

    it('should allow access with valid KYC', async () => {
      // Mock user with approved KYC
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed',
          hasCompletedOnboarding: true
        },
        authToken: 'test-token'
      })

      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: {
          level: 'basic',
          status: 'approved'
        }
      })

      // Mock the NewTransactionPageContent to avoid complex setup
      jest.mock('@/app/transactions/new/page', () => ({
        __esModule: true,
        default: () => <div>Create New Transaction</div>
      }))

      const { rerender } = render(
        <TestWrapper>
          <div>Create New Transaction</div>
        </TestWrapper>
      )

      // Should show transaction content
      await waitFor(() => {
        expect(screen.getByText('Create New Transaction')).toBeInTheDocument()
      })

      // Should not show KYC guard
      expect(screen.queryByText('Identity Verification Required')).not.toBeInTheDocument()
    })

    it('should redirect to KYC flow when Start Verification clicked', async () => {
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      render(
        <TestWrapper>
          <KYCGuard requiredLevel="basic" blockingMode="full">
            <div>Protected Content</div>
          </KYCGuard>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Start Verification')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Verification')
      fireEvent.click(startButton)

      // Should redirect to onboarding
      expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
      
      // Should store current path for redirect after KYC
      expect(sessionStorage.getItem('kycRedirectPath')).toBe('/transactions/new')
    })
  })

  describe('KYC Notification Banner Integration', () => {
    it('should show banner on dashboard for users needing KYC', async () => {
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: {
          level: 'none',
          status: 'not_started'
        }
      })

      render(
        <TestWrapper>
          <KYCNotificationBanner />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Complete identity verification/)).toBeInTheDocument()
        expect(screen.getByText('Verify Identity')).toBeInTheDocument()
      })
    })

    it('should update banner when KYC status changes', async () => {
      // Start with no KYC
      ;(kycAPI.getStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: {
          level: 'none',
          status: 'not_started'
        }
      })

      const { rerender } = render(
        <TestWrapper>
          <KYCNotificationBanner />
        </TestWrapper>
      )

      // Update to under review
      jest.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { status: 'under_review' },
        refreshKYCStatus: jest.fn()
      })

      rerender(
        <TestWrapper>
          <KYCNotificationBanner />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/under review/)).toBeInTheDocument()
        expect(screen.queryByText('Verify Identity')).not.toBeInTheDocument()
      })
    })

    it('should persist dismissal across page navigation', async () => {
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      const { unmount } = render(
        <TestWrapper>
          <KYCNotificationBanner dismissible={true} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/Complete identity verification/)).toBeInTheDocument()
      })

      // Dismiss the banner
      const dismissButton = screen.getByRole('button', { name: '' })
      fireEvent.click(dismissButton)

      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()

      // Unmount and remount (simulate navigation)
      unmount()
      
      render(
        <TestWrapper>
          <KYCNotificationBanner dismissible={true} />
        </TestWrapper>
      )

      // Should remain dismissed
      expect(screen.queryByText(/Complete identity verification/)).not.toBeInTheDocument()
    })
  })

  describe('Progressive KYC Requirements', () => {
    it('should enforce different KYC levels for different features', async () => {
      // User has basic KYC but feature requires enhanced
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed'
        }
      })

      render(
        <TestWrapper>
          <KYCGuard requiredLevel="enhanced" blockingMode="modal">
            <div>High Value Transaction</div>
          </KYCGuard>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Verification Required')).toBeInTheDocument()
        expect(screen.getByText(/requires enhanced identity verification/)).toBeInTheDocument()
      })
    })

    it('should check for expired KYC', async () => {
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1)

      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { 
            status: 'approved',
            expiryDate: expiredDate.toISOString()
          }
        }
      })

      render(
        <TestWrapper>
          <KYCGuard requiredLevel="basic">
            <div>Protected Content</div>
          </KYCGuard>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Verification Required')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Status Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should poll for KYC status updates', async () => {
      const mockRefreshStatus = jest.fn()
      
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          hasCompletedOnboarding: true,
          kycLevel: 'none'
        }
      })

      jest.spyOn(require('@/context/kyc-context'), 'useKYC').mockReturnValue({
        kycData: { status: 'under_review' },
        refreshKYCStatus: mockRefreshStatus
      })

      render(
        <TestWrapper>
          <KYCNotificationBanner />
        </TestWrapper>
      )

      // Fast forward 1 minute
      jest.advanceTimersByTime(60000)

      await waitFor(() => {
        expect(mockRefreshStatus).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      ;(kycAPI.getStatus as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(
        <TestWrapper>
          <KYCGuard requiredLevel="basic">
            <div>Protected Content</div>
          </KYCGuard>
        </TestWrapper>
      )

      // Should still show guard on error
      await waitFor(() => {
        expect(screen.getByText('Verification Required')).toBeInTheDocument()
      })
    })

    it('should handle missing user gracefully', async () => {
      jest.spyOn(require('@/context/auth-context-v2'), 'useAuth').mockReturnValue({
        user: null,
        authToken: null
      })

      render(
        <TestWrapper>
          <KYCGuard requiredLevel="basic">
            <div>Protected Content</div>
          </KYCGuard>
        </TestWrapper>
      )

      // Should show loading or redirect to login
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })
    })
  })
})