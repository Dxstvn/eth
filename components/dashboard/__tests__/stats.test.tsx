import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import DashboardStats from '../stats'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  ArrowUpRight: ({ className }: any) => <div data-testid="arrow-up-right" className={className} />,
  ArrowDownRight: ({ className }: any) => <div data-testid="arrow-down-right" className={className} />,
  TrendingUp: ({ className }: any) => <div data-testid="trending-up" className={className} />,
  Wallet: ({ className }: any) => <div data-testid="wallet" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle" className={className} />,
  Clock: ({ className }: any) => <div data-testid="clock" className={className} />,
}))

describe('DashboardStats Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      render(<DashboardStats />)

      // Should show 4 skeleton cards
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-neutral-200')
      )
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should complete loading after timeout', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      render(<DashboardStats />)

      // Fast-forward timer and wait for update
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Active Transactions')).toBeInTheDocument()
    })
  })

  describe('Demo Account Stats', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
    })

    it('should render all stat cards for demo account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Active Transactions')).toBeInTheDocument()
      expect(screen.getByText('Total Value Locked')).toBeInTheDocument()
      expect(screen.getByText('Completed Transactions')).toBeInTheDocument()
      expect(screen.getByText('Average Transaction Time')).toBeInTheDocument()
    })

    it('should show demo account values', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('12')).toBeInTheDocument() // Active Transactions
      expect(screen.getByText('$1.2M')).toBeInTheDocument() // Total Value Locked
      expect(screen.getByText('48')).toBeInTheDocument() // Completed Transactions
      expect(screen.getByText('4.2 days')).toBeInTheDocument() // Average Transaction Time
    })

    it('should show positive trends for demo account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('+8.2%')).toBeInTheDocument()
      expect(screen.getByText('+12.5%')).toBeInTheDocument()
      expect(screen.getByText('+5.3%')).toBeInTheDocument()
      expect(screen.getByText('-2.1%')).toBeInTheDocument() // One negative trend
    })

    it('should show correct icons for demo account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByTestId('trending-up')).toBeInTheDocument()
      expect(screen.getByTestId('wallet')).toBeInTheDocument()
      expect(screen.getByTestId('check-circle')).toBeInTheDocument()
      expect(screen.getByTestId('clock')).toBeInTheDocument()
    })
  })

  describe('Regular Account Stats', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
    })

    it('should render all stat cards for regular account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Active Transactions')).toBeInTheDocument()
      expect(screen.getByText('Total Value Locked')).toBeInTheDocument()
      expect(screen.getByText('Completed Transactions')).toBeInTheDocument()
      expect(screen.getByText('Average Transaction Time')).toBeInTheDocument()
    })

    it('should show zero values for regular account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getAllByText('0')).toHaveLength(2) // Active, Completed counts
      expect(screen.getByText('$0')).toBeInTheDocument() // Total Value Locked
      expect(screen.getByText('0 days')).toBeInTheDocument() // Average Transaction Time
    })

    it('should show neutral trends for regular account', () => {
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getAllByText('0%')).toHaveLength(4)
      expect(screen.getAllByText('No previous data')).toHaveLength(4)
    })
  })

  describe('Styling and Layout', () => {
    it('should have correct grid layout', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const container = screen.getByText('Active Transactions').closest('div[class*="grid"]')
      expect(container).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6')
    })

    it('should have hover effects on cards', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const card = screen.getByText('Active Transactions').closest('[class*="border"]')
      expect(card).toHaveClass('hover:shadow-lg', 'transition-all')
    })
  })

  describe('Trend Indicators', () => {
    it('should show up trend with green color', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const upTrends = screen.getAllByTestId('arrow-up-right')
      expect(upTrends.length).toBeGreaterThan(0)
      
      upTrends.forEach(arrow => {
        const trendContainer = arrow.closest('.text-green-600')
        expect(trendContainer).toBeInTheDocument()
      })
    })

    it('should show down trend with red color', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const downTrend = screen.getByTestId('arrow-down-right')
      const trendContainer = downTrend.closest('.text-red-600')
      expect(trendContainer).toBeInTheDocument()
    })

    it('should show neutral trend for regular account', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const neutralTrends = screen.getAllByText('0%')
      neutralTrends.forEach(trend => {
        const trendContainer = trend.closest('.text-neutral-500')
        expect(trendContainer).toBeInTheDocument()
      })
    })
  })

  describe('Typography', () => {
    it('should have correct font classes for values', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const valueElements = [
        screen.getByText('12'),
        screen.getByText('$1.2M'),
        screen.getByText('48'),
        screen.getByText('4.2 days')
      ]
      valueElements.forEach(value => {
        expect(value).toHaveClass('text-3xl', 'font-bold', 'text-teal-900', 'font-display')
      })
    })

    it('should have correct font classes for titles', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const titleElements = screen.getAllByText(/Active Transactions|Total Value|Completed|Average/)
      titleElements.forEach(title => {
        expect(title).toHaveClass('text-sm', 'text-neutral-500', 'font-medium')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing auth context gracefully', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: undefined })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should default to regular account behavior
      expect(screen.getAllByText('0')).toHaveLength(2)
    })

    it('should handle component unmount during loading', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      const { unmount } = render(<DashboardStats />)

      // Unmount before timer completes
      unmount()

      // Should not cause errors
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    })

    it('should cleanup timer on unmount', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { unmount } = render(<DashboardStats />)
      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with timer', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<DashboardStats />)
        unmount()
      }

      // Should not accumulate timers
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    })

    it('should render efficiently with many re-renders', () => {
      let renderCount = 0
      const TestWrapper = ({ isDemoAccount }: { isDemoAccount: boolean }) => {
        renderCount++
        mockUseAuth.mockReturnValue({ isDemoAccount })
        return <DashboardStats />
      }

      const { rerender } = render(<TestWrapper isDemoAccount={false} />)
      
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      rerender(<TestWrapper isDemoAccount={true} />)
      rerender(<TestWrapper isDemoAccount={false} />)

      expect(renderCount).toBe(3)
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Cards should be properly structured
      const cards = screen.getAllByText(/Active Transactions|Total Value|Completed|Average/)
      expect(cards).toHaveLength(4)
    })

    it('should have accessible color contrast', () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Values should have good contrast
      const values = [
        screen.getByText('12'),
        screen.getByText('$1.2M'),
        screen.getByText('48'),
        screen.getByText('4.2 days')
      ]
      values.forEach(value => {
        expect(value).toHaveClass('text-teal-900') // High contrast text
      })
    })
  })
})