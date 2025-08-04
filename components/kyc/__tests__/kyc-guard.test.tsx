import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { KYCGuard, withKYCGuard, useKYCGuard } from '../kyc-guard'
import { useAuth } from '@/context/auth-context-v2'
import { useKYC } from '@/context/kyc-context'
import { renderHook } from '@testing-library/react'

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

describe('KYCGuard', () => {
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
  })

  describe('KYCGuard Component', () => {
    it('should render children when user has required KYC level', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed'
        }
      })

      render(
        <KYCGuard requiredLevel="basic">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('should show full page guard when user lacks KYC', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none',
          kycStatus: { status: 'pending' }
        }
      })

      render(
        <KYCGuard requiredLevel="basic" blockingMode="full">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Identity Verification Required')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })
    })

    it('should show banner mode with dimmed content', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      render(
        <KYCGuard requiredLevel="basic" blockingMode="banner">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Identity Verification Required')).toBeInTheDocument()
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.getByText('Protected Content').closest('div')).toHaveClass('opacity-50')
      })
    })

    it('should show modal mode by default', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      render(
        <KYCGuard requiredLevel="basic">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Verification Required')).toBeInTheDocument()
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.getByText('Protected Content').closest('div')).toHaveClass('blur-sm')
      })
    })

    it('should handle Start Verification button click', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      render(
        <KYCGuard requiredLevel="basic" blockingMode="full">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        const button = screen.getByText('Start Verification')
        fireEvent.click(button)
        expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome')
      })
    })

    it('should handle Skip button when onSkip provided', async () => {
      const mockOnSkip = jest.fn()
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      render(
        <KYCGuard requiredLevel="basic" blockingMode="full" onSkip={mockOnSkip}>
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        const button = screen.getByText('Skip for Now')
        fireEvent.click(button)
        expect(mockOnSkip).toHaveBeenCalled()
      })
    })

    it('should check expired KYC status', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { 
            status: 'approved',
            expiryDate: pastDate.toISOString()
          }
        }
      })

      render(
        <KYCGuard requiredLevel="basic">
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Verification Required')).toBeInTheDocument()
      })
    })

    it('should show custom message when provided', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })

      const customMessage = 'Custom KYC message for testing'

      render(
        <KYCGuard requiredLevel="basic" blockingMode="full" customMessage={customMessage}>
          <div>Protected Content</div>
        </KYCGuard>
      )

      await waitFor(() => {
        expect(screen.getByText(customMessage)).toBeInTheDocument()
      })
    })
  })

  describe('withKYCGuard HOC', () => {
    const TestComponent = () => <div>Test Component</div>
    
    it('should wrap component with KYC guard', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed'
        }
      })

      const ProtectedComponent = withKYCGuard(TestComponent, { requiredLevel: 'basic' })
      
      render(<ProtectedComponent />)

      await waitFor(() => {
        expect(screen.getByText('Test Component')).toBeInTheDocument()
      })
    })
  })

  describe('useKYCGuard hook', () => {
    it('should return allowed status for verified user', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'passed'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'approved' }
      })

      const { result } = renderHook(() => useKYCGuard('basic'))

      expect(result.current.isAllowed).toBe(true)
      expect(result.current.reason).toBeNull()
    })

    it('should return not allowed for unverified user', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'none'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'not_started' }
      })

      const { result } = renderHook(() => useKYCGuard('basic'))

      expect(result.current.isAllowed).toBe(false)
      expect(result.current.reason).toBe('Requires basic KYC level')
    })

    it('should check facial verification requirement', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: {
          kycLevel: 'basic',
          kycStatus: { status: 'approved' },
          facialVerificationStatus: 'failed'
        }
      })
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: { status: 'approved' }
      })

      const { result } = renderHook(() => useKYCGuard('basic'))

      expect(result.current.isAllowed).toBe(false)
      expect(result.current.reason).toBe('Facial verification required')
    })
  })
})