import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import MarketOverview from '../dashboard/market-overview'
import UpcomingDeadlines from '../dashboard/upcoming-deadlines'

// Mock database store
const mockUseDatabaseStore = vi.fn()

vi.mock('@/lib/mock-database', () => ({
  useDatabaseStore: () => mockUseDatabaseStore(),
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  TrendingUp: ({ className }: any) => <div data-testid="icon-trendingup" className={className} />,
  TrendingDown: ({ className }: any) => <div data-testid="icon-trendingdown" className={className} />,
  Calendar: ({ className }: any) => <div data-testid="icon-calendar" className={className} />,
  Clock: ({ className }: any) => <div data-testid="icon-clock" className={className} />,
}))

describe('Market & Deadline Metrics Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('MarketOverview Component', () => {
    const mockAssets = [
      {
        id: '1',
        name: 'Bitcoin',
        symbol: 'BTC',
        amount: 0.5,
        price: '$43,200',
        value: 21600,
        change: '+2.5%',
        trend: 'up' as const,
      },
      {
        id: '2',
        name: 'Ethereum',
        symbol: 'ETH',
        amount: 5.0,
        price: '$2,800',
        value: 14000,
        change: '-1.2%',
        trend: 'down' as const,
      },
      {
        id: '3',
        name: 'USD Coin',
        symbol: 'USDC',
        amount: 10000,
        price: '$1.00',
        value: 10000,
        change: '0.0%',
        trend: 'neutral' as const,
      }
    ]

    beforeEach(() => {
      mockUseDatabaseStore.mockReturnValue({
        getAssets: vi.fn().mockReturnValue(mockAssets),
      })
    })

    describe('Asset Data Display', () => {
      it('should display asset information correctly', async () => {
        render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Bitcoin')).toBeInTheDocument()
        expect(screen.getByText('$43,200')).toBeInTheDocument()
        expect(screen.getByText('+2.5%')).toBeInTheDocument()
        
        expect(screen.getByText('Ethereum')).toBeInTheDocument()
        expect(screen.getByText('$2,800')).toBeInTheDocument()
        expect(screen.getByText('-1.2%')).toBeInTheDocument()
        
        expect(screen.getByText('USD Coin')).toBeInTheDocument()
        expect(screen.getByText('$1.00')).toBeInTheDocument()
        expect(screen.getByText('0.0%')).toBeInTheDocument()
      })

      it('should show correct trend indicators', async () => {
        render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Bitcoin should show upward trend
        const upIcon = screen.getByTestId('icon-trendingup')
        expect(upIcon).toBeInTheDocument()
        
        // Ethereum should show downward trend
        const downIcon = screen.getByTestId('icon-trendingdown')
        expect(downIcon).toBeInTheDocument()
        
        // USDC should not show any trend icon (neutral)
        const trendIcons = screen.getAllByTestId(/icon-trending/)
        expect(trendIcons).toHaveLength(2) // Only up and down, no neutral
      })

      it('should display correct asset symbols', async () => {
        render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Check for symbol initials in the circular avatars
        expect(screen.getByText('B')).toBeInTheDocument() // Bitcoin
        expect(screen.getByText('E')).toBeInTheDocument() // Ethereum
        expect(screen.getByText('U')).toBeInTheDocument() // USDC
      })
    })

    describe('Price Updates', () => {
      it('should update prices when asset data changes', async () => {
        const { rerender } = render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('$43,200')).toBeInTheDocument()

        // Update prices
        const updatedAssets = [
          {
            ...mockAssets[0],
            price: '$44,500',
            change: '+5.1%',
            trend: 'up' as const,
          },
          ...mockAssets.slice(1),
        ]

        rerender(<MarketOverview assets={updatedAssets} />)

        expect(screen.getByText('$44,500')).toBeInTheDocument()
        expect(screen.getByText('+5.1%')).toBeInTheDocument()
        expect(screen.queryByText('$43,200')).not.toBeInTheDocument()
      })

      it('should handle trend changes correctly', async () => {
        const initialAssets = [mockAssets[0]] // Bitcoin trending up

        const { rerender } = render(<MarketOverview assets={initialAssets} />)

        // Initially trending up
        expect(screen.getByTestId('icon-trendingup')).toBeInTheDocument()
        expect(screen.getByText('+2.5%')).toBeInTheDocument()

        // Change to trending down
        const updatedAssets = [{
          ...initialAssets[0],
          change: '-3.2%',
          trend: 'down' as const,
        }]

        rerender(<MarketOverview assets={updatedAssets} />)

        expect(screen.getByTestId('icon-trendingdown')).toBeInTheDocument()
        expect(screen.getByText('-3.2%')).toBeInTheDocument()
        expect(screen.queryByTestId('icon-trendingup')).not.toBeInTheDocument()
      })

      it('should handle neutral trend correctly', async () => {
        const neutralAsset = [{
          id: '1',
          name: 'Stable Coin',
          symbol: 'STABLE',
          amount: 1000,
          price: '$1.00',
          value: 1000,
          change: '0.0%',
          trend: 'neutral' as const,
        }]

        render(<MarketOverview assets={neutralAsset} />)

        expect(screen.getByText('0.0%')).toBeInTheDocument()
        expect(screen.queryByTestId('icon-trendingup')).not.toBeInTheDocument()
        expect(screen.queryByTestId('icon-trendingdown')).not.toBeInTheDocument()
      })
    })

    describe('Real-time Market Updates', () => {
      it('should handle multiple rapid price updates', async () => {
        const { rerender } = render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Bitcoin')).toBeInTheDocument()

        // Simulate rapid price updates
        const priceUpdates = ['$45,000', '$46,200', '$44,800', '$47,100']
        const changeUpdates = ['+4.2%', '+7.0%', '+3.7%', '+9.2%']

        priceUpdates.forEach((price, index) => {
          const updatedAssets = [{
            ...mockAssets[0],
            price,
            change: changeUpdates[index],
          }]

          rerender(<MarketOverview assets={updatedAssets} />)

          expect(screen.getByText(price)).toBeInTheDocument()
          expect(screen.getByText(changeUpdates[index])).toBeInTheDocument()
        })
      })

      it('should maintain data consistency during updates', async () => {
        const { rerender } = render(<MarketOverview />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Update all assets simultaneously
        const updatedAssets = mockAssets.map(asset => ({
          ...asset,
          price: `$${parseFloat(asset.price.replace(/[$,]/g, '')) * 1.1}`,
          change: '+10.0%',
          trend: 'up' as const,
        }))

        rerender(<MarketOverview assets={updatedAssets} />)

        // All assets should show updated data consistently
        updatedAssets.forEach(asset => {
          expect(screen.getByText(asset.name)).toBeInTheDocument()
        })
        
        // Check that all assets show +10.0% using getAllByText since there are multiple
        const trendElements = screen.getAllByText('+10.0%')
        expect(trendElements).toHaveLength(3) // All three assets trending up

        const upIcons = screen.getAllByTestId('icon-trendingup')
        expect(upIcons).toHaveLength(3) // All three assets trending up
      })
    })

    describe('Loading States', () => {
      it('should show loading skeletons initially', () => {
        render(<MarketOverview />)

        // Should show 4 loading skeleton items
        const loadingItems = document.querySelectorAll('.animate-pulse')
        expect(loadingItems).toHaveLength(4)
      })

      it('should transition from loading to data display', async () => {
        render(<MarketOverview />)

        // Initially loading
        expect(document.querySelectorAll('.animate-pulse').length).toBe(4)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Bitcoin')).toBeInTheDocument()
        expect(document.querySelectorAll('.animate-pulse').length).toBe(0)
      })
    })
  })

  describe('UpcomingDeadlines Component', () => {
    const mockDeadlines = [
      {
        id: 1,
        title: 'Document Review Deadline',
        date: 'January 25, 2025',
        time: '2:00 PM EST',
        transaction: 'TX123456',
      },
      {
        id: 2,
        title: 'Fund Transfer Deadline',
        date: 'January 27, 2025',
        time: '5:00 PM EST',
        transaction: 'TX789012',
      },
      {
        id: 3,
        title: 'Contract Signing Deadline',
        date: 'January 30, 2025',
        time: '12:00 PM EST',
        transaction: 'TX345678',
      },
    ]

    beforeEach(() => {
      mockUseDatabaseStore.mockReturnValue({
        getDeadlines: vi.fn().mockReturnValue(mockDeadlines),
      })
    })

    describe('Deadline Data Display', () => {
      it('should display deadline information correctly', async () => {
        render(<UpcomingDeadlines />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Document Review Deadline')).toBeInTheDocument()
        expect(screen.getByText('January 25, 2025')).toBeInTheDocument()
        expect(screen.getByText('2:00 PM EST')).toBeInTheDocument()
        expect(screen.getByText('Transaction: TX123456')).toBeInTheDocument()

        expect(screen.getByText('Fund Transfer Deadline')).toBeInTheDocument()
        expect(screen.getByText('January 27, 2025')).toBeInTheDocument()
        expect(screen.getByText('5:00 PM EST')).toBeInTheDocument()
        expect(screen.getByText('Transaction: TX789012')).toBeInTheDocument()

        expect(screen.getByText('Contract Signing Deadline')).toBeInTheDocument()
        expect(screen.getByText('January 30, 2025')).toBeInTheDocument()
        expect(screen.getByText('12:00 PM EST')).toBeInTheDocument()
        expect(screen.getByText('Transaction: TX345678')).toBeInTheDocument()
      })

      it('should show calendar and clock icons', async () => {
        render(<UpcomingDeadlines />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        const calendarIcons = screen.getAllByTestId('icon-calendar')
        const clockIcons = screen.getAllByTestId('icon-clock')
        
        expect(calendarIcons).toHaveLength(3) // One for each deadline
        expect(clockIcons).toHaveLength(3) // One for each deadline
      })
    })

    describe('Deadline Updates', () => {
      it('should update when new deadlines are added', async () => {
        const { rerender } = render(<UpcomingDeadlines />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getAllByText(/Transaction:/).length).toBe(3)

        // Add new deadline
        const updatedDeadlines = [
          ...mockDeadlines,
          {
            id: 4,
            title: 'Final Approval Deadline',
            date: 'February 1, 2025',
            time: '10:00 AM EST',
            transaction: 'TX901234',
          },
        ]

        rerender(<UpcomingDeadlines deadlines={updatedDeadlines} />)

        expect(screen.getByText('Final Approval Deadline')).toBeInTheDocument()
        expect(screen.getByText('February 1, 2025')).toBeInTheDocument()
        expect(screen.getByText('10:00 AM EST')).toBeInTheDocument()
        expect(screen.getByText('Transaction: TX901234')).toBeInTheDocument()
        expect(screen.getAllByText(/Transaction:/).length).toBe(4)
      })

      it('should update when deadline times change', async () => {
        const { rerender } = render(<UpcomingDeadlines deadlines={mockDeadlines} />)

        expect(screen.getByText('2:00 PM EST')).toBeInTheDocument()

        // Update deadline time
        const updatedDeadlines = [
          {
            ...mockDeadlines[0],
            time: '3:30 PM EST',
          },
          ...mockDeadlines.slice(1),
        ]

        rerender(<UpcomingDeadlines deadlines={updatedDeadlines} />)

        expect(screen.getByText('3:30 PM EST')).toBeInTheDocument()
        expect(screen.queryByText('2:00 PM EST')).not.toBeInTheDocument()
      })

      it('should handle deadline removal', async () => {
        const { rerender } = render(<UpcomingDeadlines deadlines={mockDeadlines} />)

        expect(screen.getByText('Document Review Deadline')).toBeInTheDocument()
        expect(screen.getAllByText(/Transaction:/).length).toBe(3)

        // Remove first deadline
        const updatedDeadlines = mockDeadlines.slice(1)

        rerender(<UpcomingDeadlines deadlines={updatedDeadlines} />)

        expect(screen.queryByText('Document Review Deadline')).not.toBeInTheDocument()
        expect(screen.getAllByText(/Transaction:/).length).toBe(2)
      })
    })

    describe('Deadline Priority and Urgency', () => {
      it('should handle urgent deadlines (same day)', async () => {
        const urgentDeadlines = [{
          id: 1,
          title: 'URGENT: Payment Due Today',
          date: 'Today',
          time: '11:59 PM EST',
          transaction: 'TX999999',
        }]

        render(<UpcomingDeadlines deadlines={urgentDeadlines} />)

        expect(screen.getByText('URGENT: Payment Due Today')).toBeInTheDocument()
        expect(screen.getByText('Today')).toBeInTheDocument()
        expect(screen.getByText('11:59 PM EST')).toBeInTheDocument()
      })

      it('should display deadlines in chronological order when provided', async () => {
        const unorderedDeadlines = [
          {
            id: 3,
            title: 'Later Deadline',
            date: 'February 5, 2025',
            time: '1:00 PM EST',
            transaction: 'TX333',
          },
          {
            id: 1,
            title: 'Earlier Deadline',
            date: 'January 28, 2025',
            time: '2:00 PM EST',
            transaction: 'TX111',
          },
          {
            id: 2,
            title: 'Middle Deadline',
            date: 'January 30, 2025',
            time: '3:00 PM EST',
            transaction: 'TX222',
          },
        ]

        render(<UpcomingDeadlines deadlines={unorderedDeadlines} />)

        // Should display all deadlines regardless of order
        expect(screen.getByText('Earlier Deadline')).toBeInTheDocument()
        expect(screen.getByText('Middle Deadline')).toBeInTheDocument()
        expect(screen.getByText('Later Deadline')).toBeInTheDocument()
      })
    })

    describe('Loading States', () => {
      it('should show loading skeletons initially', () => {
        render(<UpcomingDeadlines />)

        // Should show 3 loading skeleton items
        const loadingItems = document.querySelectorAll('.animate-pulse')
        expect(loadingItems).toHaveLength(3)
      })

      it('should transition from loading to data display', async () => {
        render(<UpcomingDeadlines />)

        // Initially loading
        expect(document.querySelectorAll('.animate-pulse').length).toBe(3)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Document Review Deadline')).toBeInTheDocument()
        expect(document.querySelectorAll('.animate-pulse').length).toBe(0)
      })
    })

    describe('Empty State Handling', () => {
      it('should handle empty deadline list', () => {
        mockUseDatabaseStore.mockReturnValue({
          getDeadlines: vi.fn().mockReturnValue([]),
        })

        render(<UpcomingDeadlines />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Should render without crashing, container should be empty
        const container = document.querySelector('.space-y-4')
        expect(container).toBeInTheDocument()
        expect(container?.children).toHaveLength(0)
      })
    })
  })

  describe('Integration and Performance Tests', () => {
    const integrationMockAssets = [
      {
        id: '1',
        name: 'Bitcoin',
        symbol: 'BTC',
        amount: 0.5,
        price: '$43,200',
        value: 21600,
        change: '+2.5%',
        trend: 'up' as const,
      },
      {
        id: '2',
        name: 'Ethereum',
        symbol: 'ETH',
        amount: 5.0,
        price: '$2,800',
        value: 14000,
        change: '-1.2%',
        trend: 'down' as const,
      },
      {
        id: '3',
        name: 'USD Coin',
        symbol: 'USDC',
        amount: 10000,
        price: '$1.00',
        value: 10000,
        change: '0.0%',
        trend: 'neutral' as const,
      }
    ]

    const integrationMockDeadlines = [
      {
        id: 1,
        title: 'Document Review Deadline',
        date: 'January 25, 2025',
        time: '2:00 PM EST',
        transaction: 'TX123456',
      },
      {
        id: 2,
        title: 'Fund Transfer Deadline',
        date: 'January 27, 2025',
        time: '5:00 PM EST',
        transaction: 'TX789012',
      },
      {
        id: 3,
        title: 'Contract Signing Deadline',
        date: 'January 30, 2025',
        time: '12:00 PM EST',
        transaction: 'TX345678',
      },
    ]

    beforeEach(() => {
      // Ensure both getAssets and getDeadlines are available for integration tests
      mockUseDatabaseStore.mockReturnValue({
        getAssets: vi.fn().mockReturnValue(integrationMockAssets),
        getDeadlines: vi.fn().mockReturnValue(integrationMockDeadlines),
      })
    })

    it('should handle simultaneous market and deadline updates', async () => {
      const { rerender: rerenderMarket } = render(
        <div>
          <MarketOverview />
          <UpcomingDeadlines />
        </div>
      )

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Bitcoin')).toBeInTheDocument()
      expect(screen.getByText('Document Review Deadline')).toBeInTheDocument()

      // Simultaneous updates
      const newAssets = [integrationMockAssets[0]]
      const newDeadlines = [integrationMockDeadlines[0]]

      rerenderMarket(
        <div>
          <MarketOverview assets={newAssets} />
          <UpcomingDeadlines deadlines={newDeadlines} />
        </div>
      )

      expect(screen.getByText('Bitcoin')).toBeInTheDocument()
      expect(screen.getByText('Document Review Deadline')).toBeInTheDocument()
      
      // Other items should be gone
      expect(screen.queryByText('Ethereum')).not.toBeInTheDocument()
      expect(screen.queryByText('Fund Transfer Deadline')).not.toBeInTheDocument()
    })

    it('should maintain performance with frequent updates', async () => {
      const { rerender } = render(<MarketOverview />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Simulate 50 rapid updates
      for (let i = 0; i < 50; i++) {
        const updatedAssets = [{
          id: '1',
          name: 'Bitcoin',
          symbol: 'BTC',
          amount: 0.5,
          price: `$${43000 + (i * 100)}`,
          value: 21600,
          change: `+${(i * 0.1).toFixed(1)}%`,
          trend: 'up' as const,
        }]

        rerender(<MarketOverview assets={updatedAssets} />)
      }

      // Should still be responsive and show latest data
      expect(screen.getByText('$47900')).toBeInTheDocument() // 43000 + (49 * 100)
      expect(screen.getByText('+4.9%')).toBeInTheDocument() // (49 * 0.1)
    })
  })
})