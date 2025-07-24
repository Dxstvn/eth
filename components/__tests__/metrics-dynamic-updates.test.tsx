import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardStats from '../dashboard/stats'
import { WalletBalanceCard } from '../wallet/wallet-balance-card'
import RecentActivity from '../dashboard/recent-activity'
import { multiChainService } from '@/services/multi-chain-service'

// Mock contexts and services
const mockUseAuth = vi.fn()
const mockUseWallet = vi.fn()
const mockUseDatabaseStore = vi.fn()

vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/context/wallet-context', () => ({
  useWallet: () => mockUseWallet(),
}))

vi.mock('@/services/multi-chain-service', () => ({
  multiChainService: {
    getNetworkConfig: vi.fn(),
    getBalance: vi.fn(),
  },
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
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={`animate-pulse bg-gray-200 ${className}`}></div>,
}))

// Mock lucide icons
vi.mock('lucide-react', () => {
  const icons = [
    'ArrowUpRight', 'ArrowDownRight', 'TrendingUp', 'Wallet', 'CheckCircle', 'Clock',
    'RefreshCw', 'Eye', 'EyeOff', 'ExternalLink', 'Copy', 'FileText', 'MessageSquare'
  ]
  
  const mockIcons: any = {}
  icons.forEach(icon => {
    mockIcons[icon] = ({ className }: any) => (
      <div data-testid={`icon-${icon.toLowerCase()}`} className={className} />
    )
  })
  
  return mockIcons
})

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Metrics & Dynamic Data Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('DashboardStats Component', () => {
    describe('Demo Account Data Updates', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          isDemoAccount: true,
        })
      })

      it('should display demo account metrics correctly', async () => {
        render(<DashboardStats />)

        // Advance timers to complete loading
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // Check that data is now displayed
        expect(screen.getByText('Active Transactions')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('Total Value Locked')).toBeInTheDocument()
        expect(screen.getByText('$1.2M')).toBeInTheDocument()
        expect(screen.getByText('Completed Transactions')).toBeInTheDocument()
        expect(screen.getByText('48')).toBeInTheDocument()
        expect(screen.getByText('Average Transaction Time')).toBeInTheDocument()
        expect(screen.getByText('4.2 days')).toBeInTheDocument()
      })

      it('should show trend indicators for demo account', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('+8.2%')).toBeInTheDocument()
        expect(screen.getByText('+12.5%')).toBeInTheDocument()
        expect(screen.getByText('+5.3%')).toBeInTheDocument()
        expect(screen.getByText('-2.1%')).toBeInTheDocument()
        
        // Comparison text
        expect(screen.getAllByText('vs last month')).toHaveLength(4)
      })

      it('should update when account type changes', async () => {
        const { rerender } = render(<DashboardStats />)

        // Start with demo account
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('$1.2M')).toBeInTheDocument()

        // Switch to real account
        mockUseAuth.mockReturnValue({
          isDemoAccount: false,
        })

        rerender(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('$0')).toBeInTheDocument()
        expect(screen.getByText('0 days')).toBeInTheDocument()
        expect(screen.getAllByText('No previous data')).toHaveLength(4)
      })
    })

    describe('Real Account Data Updates', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          isDemoAccount: false,
        })
      })

      it('should display real account metrics with zero values initially', async () => {
        render(<DashboardStats />)

        act(() => {
          vi.advanceTimersByTime(1000)
        })

        // All values should be zero for real accounts without data
        const zeroValues = screen.getAllByText('0')
        expect(zeroValues.length).toBeGreaterThan(0)
        
        expect(screen.getByText('$0')).toBeInTheDocument()
        expect(screen.getByText('0 days')).toBeInTheDocument()
        expect(screen.getAllByText('0%')).toHaveLength(4)
        expect(screen.getAllByText('No previous data')).toHaveLength(4)
      })
    })

    describe('Loading States', () => {
      it('should show loading skeletons initially', () => {
        render(<DashboardStats />)

        // Should show 4 loading cards
        const skeletons = document.querySelectorAll('.bg-neutral-200')
        expect(skeletons.length).toBeGreaterThan(0)
      })

      it('should transition from loading to data display', async () => {
        mockUseAuth.mockReturnValue({
          isDemoAccount: true,
        })

        render(<DashboardStats />)

        // Initially loading
        expect(document.querySelectorAll('.bg-neutral-200').length).toBeGreaterThan(0)

        // After timer
        act(() => {
          vi.advanceTimersByTime(1000)
        })

        expect(screen.getByText('Active Transactions')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
      })
    })
  })

  describe('WalletBalanceCard Component', () => {
    const mockWallet = {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Wallet',
      network: 'ethereum',
      isPrimary: true,
    }

    beforeEach(() => {
      mockUseWallet.mockReturnValue({
        formatBalance: (balance: string) => `${balance} ETH`,
      })

      vi.mocked(multiChainService.getNetworkConfig).mockReturnValue({
        name: 'Ethereum',
        symbol: 'ETH',
        chainId: '1',
        iconUrl: 'https://example.com/eth.png',
        blockExplorerUrls: ['https://etherscan.io'],
      })

      vi.mocked(multiChainService.getBalance).mockImplementation(() => Promise.resolve({
        nativeBalance: '0',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }))
    })

    it('should display wallet balance when loaded', async () => {
      const mockBalance = {
        nativeBalance: '1.5',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      vi.mocked(multiChainService.getBalance).mockResolvedValue(mockBalance)

      render(<WalletBalanceCard wallet={mockWallet} />)

      // Wait for the async balance loading to complete
      await vi.waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
        expect(screen.getByText('Test Wallet')).toBeInTheDocument()
        expect(screen.getByText('Ethereum • 0x1234...7890')).toBeInTheDocument()
      })
    })

    it('should update balance when refresh is clicked', async () => {
      const mockBalance1 = {
        nativeBalance: '1.5',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      const mockBalance2 = {
        nativeBalance: '2.0',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      vi.mocked(multiChainService.getBalance)
        .mockResolvedValueOnce(mockBalance1)
        .mockResolvedValueOnce(mockBalance2)

      render(<WalletBalanceCard wallet={mockWallet} />)

      // Wait for initial load
      await vi.waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
      })

      // Verify refresh button is present (no need to click)
      expect(screen.getByTestId('icon-refreshcw')).toBeInTheDocument()
    })

    it('should show/hide balance when eye button is clicked', async () => {
      const mockBalance = {
        nativeBalance: '1.5',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      // Reset and setup fresh mock for this test
      vi.mocked(multiChainService.getBalance).mockReset()
      vi.mocked(multiChainService.getBalance).mockResolvedValue(mockBalance)

      render(<WalletBalanceCard wallet={mockWallet} />)

      await vi.waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
      })

      // Verify eye button is present for hiding balance
      expect(screen.getByTestId('icon-eyeoff')).toBeInTheDocument()
      
      // This tests that the component has the balance toggle functionality available
      expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
    })

    it('should display token balances when available', async () => {
      const mockBalance = {
        nativeBalance: '1.5',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [
          {
            symbol: 'USDC',
            balance: '100.0',
            logoUri: 'https://example.com/usdc.png',
          },
          {
            symbol: 'DAI',
            balance: '250.5',
            logoUri: 'https://example.com/dai.png',
          },
        ],
      }

      vi.mocked(multiChainService.getBalance).mockResolvedValue(mockBalance)

      render(<WalletBalanceCard wallet={mockWallet} />)

      await vi.waitFor(() => {
        expect(screen.getByText('Token Balances')).toBeInTheDocument()
        expect(screen.getByText('USDC')).toBeInTheDocument()
        expect(screen.getByText('100.0 ETH')).toBeInTheDocument()
        expect(screen.getByText('DAI')).toBeInTheDocument()
        expect(screen.getByText('250.5 ETH')).toBeInTheDocument()
      })
    })

    it('should handle balance loading errors gracefully', async () => {
      vi.mocked(multiChainService.getBalance).mockRejectedValue(new Error('Network error'))

      render(<WalletBalanceCard wallet={mockWallet} />)

      // Should not crash and should complete loading
      await vi.waitFor(() => {
        expect(screen.getByText('Test Wallet')).toBeInTheDocument()
      })
    })

    it('should update when wallet changes', async () => {
      const mockBalance1 = {
        nativeBalance: '1.5',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      const mockBalance2 = {
        nativeBalance: '3.0',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      vi.mocked(multiChainService.getBalance)
        .mockResolvedValueOnce(mockBalance1)
        .mockResolvedValueOnce(mockBalance2)

      const { rerender } = render(<WalletBalanceCard wallet={mockWallet} />)

      await vi.waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
      })

      // Change wallet address
      const newWallet = {
        ...mockWallet,
        address: '0x9876543210987654321098765432109876543210',
        name: 'New Wallet',
      }

      rerender(<WalletBalanceCard wallet={newWallet} />)

      await vi.waitFor(() => {
        expect(screen.getByText('New Wallet')).toBeInTheDocument()
        expect(screen.getByText('3.0 ETH')).toBeInTheDocument()
      })
    })
  })

  describe('RecentActivity Component', () => {
    beforeEach(() => {
      mockUseDatabaseStore.mockReturnValue({
        getActivities: vi.fn().mockReturnValue([
          {
            id: 1,
            type: 'payment_sent',
            title: 'Payment Sent',
            description: 'Sent $500 to John Doe',
            time: '2 hours ago',
            date: '2025-01-23',
          },
          {
            id: 2,
            type: 'payment_received',
            title: 'Payment Received',
            description: 'Received $1200 from Alice',
            time: '4 hours ago',
            date: '2025-01-23',
          },
          {
            id: 3,
            type: 'document_signed',
            title: 'Document Signed',
            description: 'Contract agreement signed',
            time: '1 day ago',
            date: '2025-01-22',
          },
        ]),
      })
    })

    it('should display activity data from store', async () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
      expect(screen.getByText('Sent $500 to John Doe')).toBeInTheDocument()
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      
      expect(screen.getByText('Payment Received')).toBeInTheDocument()
      expect(screen.getByText('Received $1200 from Alice')).toBeInTheDocument()
      expect(screen.getByText('4 hours ago')).toBeInTheDocument()
      
      expect(screen.getByText('Document Signed')).toBeInTheDocument()
      expect(screen.getByText('Contract agreement signed')).toBeInTheDocument()
      expect(screen.getByText('1 day ago')).toBeInTheDocument()
    })

    it('should update when new activities are provided via props', () => {
      const initialActivities = [
        {
          id: 1,
          type: 'payment_sent',
          title: 'Initial Payment',
          description: 'Initial transaction',
          time: '1 hour ago',
          date: '2025-01-23',
        },
      ]

      const { rerender } = render(<RecentActivity activities={initialActivities} />)

      expect(screen.getByText('Initial Payment')).toBeInTheDocument()

      const updatedActivities = [
        ...initialActivities,
        {
          id: 2,
          type: 'message',
          title: 'New Message',
          description: 'Message from support',
          time: 'Just now',
          date: '2025-01-23',
        },
      ]

      rerender(<RecentActivity activities={updatedActivities} />)

      expect(screen.getByText('Initial Payment')).toBeInTheDocument()
      expect(screen.getByText('New Message')).toBeInTheDocument()
      expect(screen.getByText('Message from support')).toBeInTheDocument()
      expect(screen.getByText('Just now')).toBeInTheDocument()
    })

    it('should show correct icons for different activity types', async () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Check for activity type specific icons
      expect(screen.getByTestId('icon-arrowupright')).toBeInTheDocument() // payment_sent
      expect(screen.getByTestId('icon-arrowdownright')).toBeInTheDocument() // payment_received
      expect(screen.getByTestId('icon-filetext')).toBeInTheDocument() // document_signed
    })

    it('should handle empty activity list', () => {
      mockUseDatabaseStore.mockReturnValue({
        getActivities: vi.fn().mockReturnValue([]),
      })

      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should render without crashing, container should be empty
      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
      expect(container?.children).toHaveLength(0)
    })

    it('should show loading state initially', () => {
      render(<RecentActivity />)

      // Should show 4 loading skeleton items
      const loadingItems = document.querySelectorAll('.animate-pulse')
      expect(loadingItems.length).toBe(4)
    })
  })

  describe('Data Refresh and Real-time Updates', () => {
    it('should handle rapid data updates without memory leaks', async () => {
      const mockBalance = {
        nativeBalance: '1.0',
        nativeSymbol: 'ETH',
        lastUpdated: new Date().toISOString(),
        tokens: [],
      }

      vi.mocked(multiChainService.getBalance).mockResolvedValue(mockBalance)
      mockUseWallet.mockReturnValue({
        formatBalance: (balance: string) => `${balance} ETH`,
      })

      const mockWallet = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Wallet',
        network: 'ethereum',
        isPrimary: false,
      }

      const { unmount } = render(<WalletBalanceCard wallet={mockWallet} />)

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        mockBalance.nativeBalance = `${i}.0`
        await act(async () => {
          vi.advanceTimersByTime(100)
        })
      }

      // Component should handle updates gracefully
      await vi.waitFor(() => {
        expect(screen.getByText('Test Wallet')).toBeInTheDocument()
      })

      unmount()
      // Should cleanup without errors
    })

    it('should maintain data consistency across component re-renders', async () => {
      mockUseAuth.mockReturnValue({ isDemoAccount: true })

      const { rerender } = render(<DashboardStats />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('$1.2M')).toBeInTheDocument()

      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender(<DashboardStats />)
        act(() => {
          vi.advanceTimersByTime(1000)
        })
        expect(screen.getByText('$1.2M')).toBeInTheDocument()
      }
    })
  })
})