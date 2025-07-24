import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardStats from '../stats'
import TransactionCard from '../transaction-card'
import RecentActivity from '../recent-activity'
import DashboardHeader from '../header'
import DashboardSidebar from '../sidebar'

// Mock all external dependencies
vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => ({ isDemoAccount: false, user: { email: 'test@example.com' }, signOut: vi.fn() }),
}))

vi.mock('@/context/sidebar-context', () => ({
  useSidebar: () => ({ expanded: true, toggleSidebar: vi.fn() }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useMobile: () => false,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/lib/mock-database', () => ({
  useDatabaseStore: () => ({
    getActivities: () => [],
  }),
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}))

vi.mock('@/components/transaction-stage-indicator', () => ({
  default: ({ stage }: any) => <div data-testid="stage-indicator">{stage}</div>,
}))

vi.mock('@/components/connection-status-indicator', () => ({
  default: () => <div data-testid="connection-status">Connected</div>,
}))

// Mock all Lucide icons
vi.mock('lucide-react', () => {
  const icons = [
    'ArrowUpRight', 'ArrowDownRight', 'TrendingUp', 'Wallet', 'CheckCircle', 'Clock',
    'ArrowRight', 'FileText', 'LockKeyhole', 'UserCheck', 'DollarSign', 'Building',
    'Calendar', 'User', 'Menu', 'LogOut', 'ChevronLeft', 'ChevronRight', 'MessageSquare',
    'LayoutDashboard', 'Users', 'Settings', 'HelpCircle', 'X', 'Plus'
  ]
  
  const mockIcons: any = {}
  icons.forEach(icon => {
    mockIcons[icon] = ({ className }: any) => (
      <div data-testid={icon.toLowerCase().replace(/([A-Z])/g, '-$1').substring(1)} className={className} />
    )
  })
  
  return mockIcons
})

// Mock transaction data
const mockTransaction = {
  id: 'TX123456',
  propertyAddress: '123 Main Street, Anytown, CA 90210',
  amount: '$500,000',
  status: 'in_escrow',
  counterparty: 'John Smith',
  date: '2024-01-15',
  progress: 65,
}

const mockActivities = [
  {
    id: 1,
    type: 'payment_sent',
    title: 'Payment Sent',
    description: 'Escrow payment sent',
    time: '2 hours ago',
    date: '2024-01-15',
  },
]

describe('Dashboard Components - Basic Functionality', () => {
  describe('DashboardStats', () => {
    it('should render loading state initially', () => {
      render(<DashboardStats />)
      
      // Check for skeleton loading elements
      const skeletons = document.querySelectorAll('.bg-neutral-200')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should have correct grid layout classes', () => {
      render(<DashboardStats />)
      
      const container = document.querySelector('.grid')
      expect(container).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-6')
    })
  })

  describe('TransactionCard', () => {
    it('should render transaction information correctly', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      expect(screen.getByText('123 Main Street, Anytown, CA 90210')).toBeInTheDocument()
      expect(screen.getByText('TX123456')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('$500,000')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('should render stage indicator', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveTextContent('in_escrow')
    })

    it('should render progress bar', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-value', '65')
    })

    it('should have view details link', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const link = screen.getByRole('link', { name: /view details/i })
      expect(link).toHaveAttribute('href', '/transactions/TX123456')
    })

    it('should have proper styling classes', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Find the actual card container (outer div)
      const cardContainer = document.querySelector('.bg-white.rounded-lg')
      expect(cardContainer).toBeInTheDocument()
      expect(cardContainer).toHaveClass('bg-white', 'rounded-lg', 'border', 'shadow-sm')
    })
  })

  describe('RecentActivity', () => {
    it('should render with provided activities', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
      expect(screen.getByText('Escrow payment sent')).toBeInTheDocument()
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    })

    it('should render loading state when no activities provided', () => {
      render(<RecentActivity />)

      // Check for skeleton loading
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should render with correct styling for activities', () => {
      render(<RecentActivity activities={mockActivities} />)

      // Check for activity styling - icon container with green background for payment_sent
      const iconContainer = document.querySelector('.bg-green-100.text-green-600')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should have proper container styling', () => {
      render(<RecentActivity activities={mockActivities} />)

      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
    })

    it('should handle empty activities gracefully', () => {
      render(<RecentActivity activities={[]} />)

      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
    })
  })

  describe('DashboardHeader', () => {
    const mockSetSidebarOpen = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should render header with user avatar', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByText('T')).toBeInTheDocument() // Initial from test@example.com
    })

    it('should render connection status', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })

    it('should render toggle button for desktop', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      // Check for button with title attribute
      const toggleButton = document.querySelector('button[title="Collapse sidebar"]')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should have proper header styling', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-white', 'border-b', 'h-16', 'flex', 'items-center')
    })
  })

  describe('DashboardSidebar', () => {
    const mockSetOpen = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should render navigation items', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Transactions')).toBeInTheDocument()
      expect(screen.getByText('Wallet')).toBeInTheDocument()
      expect(screen.getByText('Contacts')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render ClearHold branding', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('ClearHold')).toBeInTheDocument()
      expect(screen.getByText('CH')).toBeInTheDocument()
    })

    it('should render new transaction button', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const newTxButton = screen.getByRole('link', { name: /new transaction/i })
      expect(newTxButton).toHaveAttribute('href', '/transactions/new')
    })

    it('should render user profile section', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('T')).toBeInTheDocument() // User initial
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should have proper navigation links', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions')
      expect(screen.getByRole('link', { name: /wallet/i })).toHaveAttribute('href', '/wallet')
    })

    it('should render navigation items with proper structure', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      // Check for navigation structure - nav elements and links
      const navLinks = screen.getAllByRole('link')
      expect(navLinks.length).toBeGreaterThan(5) // Should have navigation links
    })
  })

  describe('Integration Tests', () => {
    it('should render multiple components together without conflicts', () => {
      const mockSetSidebarOpen = vi.fn()
      const mockSetOpen = vi.fn()

      render(
        <div>
          <DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />
          <DashboardSidebar open={true} setOpen={mockSetOpen} />
          <DashboardStats />
          <TransactionCard transaction={mockTransaction} />
          <RecentActivity activities={mockActivities} />
        </div>
      )

      // Check that key elements from each component are present
      expect(screen.getByRole('banner')).toBeInTheDocument() // Header
      expect(screen.getByText('ClearHold')).toBeInTheDocument() // Sidebar
      expect(screen.getByText('123 Main Street, Anytown, CA 90210')).toBeInTheDocument() // Transaction card
      expect(screen.getByText('Payment Sent')).toBeInTheDocument() // Recent activity
    })

    it('should have consistent styling across components', () => {
      render(
        <div>
          <TransactionCard transaction={mockTransaction} />
          <RecentActivity activities={mockActivities} />
        </div>
      )

      // Check for consistent spacing and styling
      const containers = document.querySelectorAll('.space-y-2, .space-y-4')
      expect(containers.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      const mockSetSidebarOpen = vi.fn()
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have proper link accessibility', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const link = screen.getByRole('link', { name: /view details/i })
      expect(link).toHaveAttribute('href')
    })

    it('should have navigation structure', () => {
      const mockSetOpen = vi.fn()
      
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(5) // Should have multiple navigation links
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      render(<DashboardStats />)

      const grid = document.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
    })

    it('should have responsive padding classes', () => {
      const mockSetSidebarOpen = vi.fn()
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('px-4', 'md:px-6')
    })

    it('should have mobile-friendly layout', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const flexContainer = document.querySelector('.flex-col')
      expect(flexContainer).toHaveClass('md:flex-row')
    })
  })
})