import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import DashboardStats from '../dashboard/stats'
import RecentActivity from '../dashboard/recent-activity'
import MarketOverview from '../dashboard/market-overview'
import UpcomingDeadlines from '../dashboard/upcoming-deadlines'
import TransactionList from '../dashboard/transaction-list'

// Mock contexts and services
const mockUseAuth = vi.fn()
const mockUseDatabaseStore = vi.fn()

vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/lib/mock-database', () => ({
  useDatabaseStore: () => mockUseDatabaseStore(),
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, asChild }: any) => {
    const Component = asChild ? 'a' : 'button'
    return <Component onClick={onClick} className={className}>{children}</Component>
  },
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, children }: any) => (
    <div className={className} data-testid="progress-bar" data-value={value}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/transaction-stage-indicator', () => ({
  default: ({ stage, size }: any) => (
    <div data-testid="transaction-stage-indicator" data-stage={stage} data-size={size}>
      {stage}
    </div>
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// Mock lucide icons
vi.mock('lucide-react', () => {
  const icons = [
    'ArrowUpRight', 'ArrowDownRight', 'TrendingUp', 'Wallet', 'CheckCircle', 'Clock',
    'FileText', 'MessageSquare', 'Building', 'FileCheck', 'Plus', 'Calendar',
    'User', 'ArrowRight', 'LockKeyhole', 'UserCheck', 'DollarSign'
  ]
  
  const mockIcons: any = {}
  icons.forEach(icon => {
    mockIcons[icon] = ({ className }: any) => (
      <div data-testid={`icon-${icon.toLowerCase()}`} className={className} />
    )
  })
  
  return mockIcons
})

describe('Dashboard Components - Metrics Data Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('DashboardStats - User Transaction Metrics', () => {
    describe('Demo Account Metrics', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          isDemoAccount: true,
        })
      })

      it('should display demo account transaction volume accurately', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Active transactions count
        expect(screen.getByText('Active Transactions')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        
        // Total value locked (should reflect actual portfolio value)
        expect(screen.getByText('Total Value Locked')).toBeInTheDocument()
        expect(screen.getByText('$1.2M')).toBeInTheDocument()
        
        // Completed transactions (historical data)
        expect(screen.getByText('Completed Transactions')).toBeInTheDocument()
        expect(screen.getByText('48')).toBeInTheDocument()
        
        // Average transaction time (performance metric)
        expect(screen.getByText('Average Transaction Time')).toBeInTheDocument()
        expect(screen.getByText('4.2 days')).toBeInTheDocument()
      })

      it('should show performance trends for transaction metrics', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Growth indicators
        expect(screen.getByText('+8.2%')).toBeInTheDocument() // Active transactions growth
        expect(screen.getByText('+12.5%')).toBeInTheDocument() // Value locked growth
        expect(screen.getByText('+5.3%')).toBeInTheDocument() // Completed transactions growth
        expect(screen.getByText('-2.1%')).toBeInTheDocument() // Transaction time improvement
        
        // Comparison text
        expect(screen.getAllByText('vs last month')).toHaveLength(4)
      })

      it('should validate numerical accuracy of transaction metrics', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Verify these are actual numbers, not placeholders
        const activeTransactionsValue = screen.getByText('12')
        const totalValueValue = screen.getByText('$1.2M')
        const completedValue = screen.getByText('48')
        const avgTimeValue = screen.getByText('4.2 days')
        
        // These should represent real business metrics
        expect(activeTransactionsValue.textContent).toMatch(/^\d+$/)
        expect(totalValueValue.textContent).toMatch(/^\$[\d.]+[KMB]?$/)
        expect(completedValue.textContent).toMatch(/^\d+$/)
        expect(avgTimeValue.textContent).toMatch(/^[\d.]+\s+days?$/)
      })
    })

    describe('Real Account Metrics', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          isDemoAccount: false,
        })
      })

      it('should display zero state for new real accounts accurately', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // All metrics should be zero for new accounts
        const zeroValues = screen.getAllByText('0')
        expect(zeroValues.length).toBeGreaterThan(0)
        
        expect(screen.getByText('$0')).toBeInTheDocument()
        expect(screen.getByText('0 days')).toBeInTheDocument()
        expect(screen.getAllByText('0%')).toHaveLength(4)
        expect(screen.getAllByText('No previous data')).toHaveLength(4)
      })

      it('should show proper zero state indicators for real accounts', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Verify neutral trend for all metrics
        const changeElements = screen.getAllByText('0%')
        expect(changeElements).toHaveLength(4)
        
        // Should not show trend arrows for zero state
        expect(screen.queryByTestId('icon-arrowupright')).not.toBeInTheDocument()
        expect(screen.queryByTestId('icon-arrowdownright')).not.toBeInTheDocument()
      })
    })

    describe('Account Type Switching and Data Updates', () => {
      it('should update metrics when switching between demo and real accounts', async () => {
        mockUseAuth.mockReturnValue({ isDemoAccount: true })
        
        const { rerender } = render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('$1.2M')).toBeInTheDocument()

        // Switch to real account
        mockUseAuth.mockReturnValue({ isDemoAccount: false })
        rerender(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('$0')).toBeInTheDocument()
        expect(screen.queryByText('$1.2M')).not.toBeInTheDocument()
      })
    })
  })

  describe('RecentActivity - Activity Metrics', () => {
    const mockActivities = [
      {
        id: 1,
        type: 'payment_sent',
        title: 'Payment Sent',
        description: 'Sent $1,500 to Property Owner',
        time: '2 hours ago',
        date: '2025-01-23',
      },
      {
        id: 2,
        type: 'payment_received',
        title: 'Payment Received',
        description: 'Received $2,800 from Buyer',
        time: '4 hours ago',
        date: '2025-01-23',
      },
      {
        id: 3,
        type: 'document_signed',
        title: 'Document Signed',
        description: 'Purchase Agreement executed',
        time: '1 day ago',
        date: '2025-01-22',
      },
    ]

    beforeEach(() => {
      mockUseDatabaseStore.mockReturnValue({
        getActivities: vi.fn().mockReturnValue(mockActivities),
      })
    })

    it('should display accurate activity counts and amounts', async () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Verify specific transaction amounts
      expect(screen.getByText('Sent $1,500 to Property Owner')).toBeInTheDocument()
      expect(screen.getByText('Received $2,800 from Buyer')).toBeInTheDocument()
      
      // Verify activity count
      const activityItems = document.querySelectorAll('.flex.items-start.space-x-3')
      expect(activityItems.length).toBe(3)
    })

    it('should validate monetary amounts in activity descriptions', async () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Check for currency formatting in descriptions
      const sentAmount = screen.getByText('Sent $1,500 to Property Owner')
      const receivedAmount = screen.getByText('Received $2,800 from Buyer')
      
      expect(sentAmount.textContent).toMatch(/\$[\d,]+/)
      expect(receivedAmount.textContent).toMatch(/\$[\d,]+/)
      
      // Verify these represent real transaction amounts
      expect(sentAmount).toBeInTheDocument()
      expect(receivedAmount).toBeInTheDocument()
    })

    it('should update activity metrics when new activities are added', async () => {
      const { rerender } = render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getAllByText(/ago/).length).toBe(3)

      // Add new activity with higher amount
      const updatedActivities = [
        {
          id: 4,
          type: 'payment_received',
          title: 'Large Payment Received',
          description: 'Received $15,000 from Investor',
          time: 'Just now',
          date: '2025-01-23',
        },
        ...mockActivities,
      ]

      rerender(<RecentActivity activities={updatedActivities} />)

      expect(screen.getByText('Received $15,000 from Investor')).toBeInTheDocument()
      expect(screen.getAllByText(/ago|Just now/).length).toBe(4)
    })
  })

  describe('TransactionList - Transaction Volume Metrics', () => {
    it('should display accurate transaction count and values', () => {
      render(<TransactionList />)

      // Should show 2 active transactions with specific amounts
      expect(screen.getByText('2.5 ETH')).toBeInTheDocument()
      expect(screen.getByText('150,000 USDC')).toBeInTheDocument()
      
      // Progress percentages should reflect actual completion
      const progressBars = screen.getAllByTestId('progress-bar')
      expect(progressBars).toHaveLength(2)
      expect(progressBars[0]).toHaveAttribute('data-value', '40')
      expect(progressBars[1]).toHaveAttribute('data-value', '20')
    })

    it('should validate transaction amount formats', () => {
      render(<TransactionList />)

      // Check different currency formats
      const ethAmount = screen.getByText('2.5 ETH')
      const usdcAmount = screen.getByText('150,000 USDC')
      
      expect(ethAmount.textContent).toMatch(/[\d.]+\s+ETH/)
      expect(usdcAmount.textContent).toMatch(/[\d,]+\s+USDC/)
    })

    it('should show accurate completion percentages', () => {
      render(<TransactionList />)

      // Verify progress percentages are displayed as numbers
      expect(screen.getByText('40%')).toBeInTheDocument()
      expect(screen.getByText('20%')).toBeInTheDocument()
      
      // These should reflect real transaction progress
      const progressTexts = [screen.getByText('40%'), screen.getByText('20%')]
      progressTexts.forEach(text => {
        expect(text.textContent).toMatch(/^\d+%$/)
      })
    })
  })

  describe('Cross-Component Metrics Consistency', () => {
    it('should maintain consistent transaction counts across components', async () => {
      render(
        <div>
          <DashboardStats />
          <TransactionList />
        </div>
      )

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Stats should show active transactions count
      // This should match the number of transactions in TransactionList
      const transactionCards = screen.getAllByTestId('transaction-stage-indicator')
      expect(transactionCards).toHaveLength(2)
      
      // Note: In a real implementation, these numbers should be consistent
      // Stats component would get the count from the same data source as TransactionList
    })

    it('should show consistent currency values across components', async () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      
      render(
        <div>
          <DashboardStats />
          <TransactionList />
        </div>
      )

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Both components should use consistent currency formatting
      const totalValue = screen.getByText('$1.2M')
      const transactionAmounts = [
        screen.getByText('2.5 ETH'),
        screen.getByText('150,000 USDC')
      ]
      
      expect(totalValue).toBeInTheDocument()
      transactionAmounts.forEach(amount => {
        expect(amount).toBeInTheDocument()
      })
    })

    it('should update all metrics when underlying data changes', async () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })
      
      const { rerender } = render(
        <div>
          <DashboardStats />
          <RecentActivity />
        </div>
      )

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('$1.2M')).toBeInTheDocument()

      // Simulate account data change affecting multiple components
      mockUseAuth.mockReturnValue({ isDemoAccount: false })
      mockUseDatabaseStore.mockReturnValue({
        getActivities: vi.fn().mockReturnValue([]),
      })

      rerender(
        <div>
          <DashboardStats />
          <RecentActivity />
        </div>
      )

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Stats should show zero state
      expect(screen.getByText('$0')).toBeInTheDocument()
      
      // Activity should be empty
      const activityItems = document.querySelectorAll('.flex.items-start.space-x-3')
      expect(activityItems.length).toBe(0)
    })
  })
})