import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardSidebar from '../sidebar'

// Mock contexts and hooks
const mockUseAuth = vi.fn()
const mockUseSidebar = vi.fn()
const mockUseMobile = vi.fn()
const mockUsePathname = vi.fn()

vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/context/sidebar-context', () => ({
  useSidebar: () => mockUseSidebar(),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useMobile: () => mockUseMobile(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, title, ...props }: any) => (
    <a href={href} className={className} title={title} {...props}>
      {children}
    </a>
  ),
}))

// Mock ScrollArea component
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: ({ className }: any) => <div data-testid="layout-dashboard" className={className} />,
  Wallet: ({ className }: any) => <div data-testid="wallet" className={className} />,
  Users: ({ className }: any) => <div data-testid="users" className={className} />,
  Settings: ({ className }: any) => <div data-testid="settings" className={className} />,
  HelpCircle: ({ className }: any) => <div data-testid="help-circle" className={className} />,
  X: ({ className }: any) => <div data-testid="x" className={className} />,
  Plus: ({ className }: any) => <div data-testid="plus" className={className} />,
  ChevronLeft: ({ className }: any) => <div data-testid="chevron-left" className={className} />,
  ChevronRight: ({ className }: any) => <div data-testid="chevron-right" className={className} />,
  FileText: ({ className }: any) => <div data-testid="file-text" className={className} />,
}))

const mockUser = {
  email: 'john.doe@example.com',
  uid: 'user123',
}

const mockSetOpen = vi.fn()
const mockToggleSidebar = vi.fn()

describe('DashboardSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isDemoAccount: false,
    })
    mockUseSidebar.mockReturnValue({
      expanded: true,
      toggleSidebar: mockToggleSidebar,
    })
    mockUseMobile.mockReturnValue(false)
    mockUsePathname.mockReturnValue('/dashboard')
  })

  describe('Mobile Sidebar', () => {
    beforeEach(() => {
      mockUseMobile.mockReturnValue(true)
    })

    it('should render mobile sidebar when open', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('ClearHold')).toBeInTheDocument()
      expect(screen.getByText('New Transaction')).toBeInTheDocument()
    })

    it('should not be visible when closed', () => {
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const sidebar = screen.getByText('ClearHold').closest('.fixed')
      expect(sidebar).toHaveClass('-translate-x-full')
    })

    it('should show backdrop when open', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const backdrop = document.querySelector('.bg-gray-600.bg-opacity-75')
      expect(backdrop).toBeInTheDocument()
    })

    it('should close when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const backdrop = document.querySelector('.bg-gray-600.bg-opacity-75')
      await user.click(backdrop!)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should close when X button is clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const closeButton = screen.getByTestId('x').closest('button')
      await user.click(closeButton!)

      expect(mockSetOpen).toHaveBeenCalledWith(false)
    })

    it('should render all navigation items', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Transactions')).toBeInTheDocument()
      expect(screen.getByText('Wallet')).toBeInTheDocument()
      expect(screen.getByText('Contacts')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
    })

    it('should show user profile at bottom', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('JD')).toBeInTheDocument() // Initials
    })
  })

  describe('Desktop Sidebar', () => {
    beforeEach(() => {
      mockUseMobile.mockReturnValue(false)
    })

    it('should render expanded sidebar by default', () => {
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      expect(screen.getByText('ClearHold')).toBeInTheDocument()
      expect(screen.getByText('New Transaction')).toBeInTheDocument()
    })

    it('should render collapsed sidebar when not expanded', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      // Should show only CH logo, not full text
      expect(screen.getByText('CH')).toBeInTheDocument()
      expect(screen.queryByText('ClearHold')).not.toBeInTheDocument()
    })

    it('should have correct width when expanded', () => {
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const sidebar = screen.getByText('ClearHold').closest('.w-64')
      expect(sidebar).toBeInTheDocument()
    })

    it('should have correct width when collapsed', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const sidebar = screen.getByText('CH').closest('.w-20')
      expect(sidebar).toBeInTheDocument()
    })

    it('should show expand/collapse toggle button', () => {
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
    })

    it('should call toggleSidebar when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const toggleButton = screen.getByTestId('chevron-left').closest('button')
      await user.click(toggleButton!)

      expect(mockToggleSidebar).toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('should highlight transaction subroutes', () => {
      mockUsePathname.mockReturnValue('/transactions/new')
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const transactionLink = screen.getByText('Transactions').closest('a')
      expect(transactionLink).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('should have correct navigation links', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions')
      expect(screen.getByRole('link', { name: /wallet/i })).toHaveAttribute('href', '/wallet')
      expect(screen.getByRole('link', { name: /contacts/i })).toHaveAttribute('href', '/contacts')
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
      expect(screen.getByRole('link', { name: /help & support/i })).toHaveAttribute('href', '/support')
    })

    it('should render navigation icons', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByTestId('layout-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('file-text')).toBeInTheDocument()
      expect(screen.getByTestId('wallet')).toBeInTheDocument()
      expect(screen.getByTestId('users')).toBeInTheDocument()
      expect(screen.getByTestId('settings')).toBeInTheDocument()
      expect(screen.getByTestId('help-circle')).toBeInTheDocument()
    })

    it('should show tooltips for collapsed navigation items', () => {
      // Ensure we have the right mock state
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      mockUseMobile.mockReturnValue(false)
      mockUsePathname.mockReturnValue('/dashboard')

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      // Each navigation item should have a title when collapsed
      const dashboardLink = screen.getByTestId('layout-dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('title', 'Dashboard')
      
      const transactionsLink = screen.getByTestId('file-text').closest('a')
      expect(transactionsLink).toHaveAttribute('title', 'Transactions')
      
      const walletLink = screen.getByTestId('wallet').closest('a')
      expect(walletLink).toHaveAttribute('title', 'Wallet')
    })
  })

  describe('New Transaction Button', () => {
    it('should render new transaction button on mobile', () => {
      mockUseMobile.mockReturnValue(true)
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const newTransactionButton = screen.getByRole('link', { name: /new transaction/i })
      expect(newTransactionButton).toHaveAttribute('href', '/transactions/new')
      expect(screen.getByTestId('plus')).toBeInTheDocument()
    })

    it('should render full-width button when expanded on desktop', () => {
      mockUseMobile.mockReturnValue(false)
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const newTransactionButton = screen.getByRole('link', { name: /new transaction/i })
      expect(newTransactionButton).toHaveAttribute('href', '/transactions/new')
    })

    it('should render icon-only button when collapsed on desktop', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      mockUseMobile.mockReturnValue(false)

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      // Find the New Transaction button by its plus icon
      const plusIcon = screen.getByTestId('plus')
      const newTransactionButton = plusIcon.closest('a')
      
      expect(newTransactionButton).toHaveAttribute('href', '/transactions/new')
      
      // When collapsed, button should be icon-only (w-12 h-12 p-0 classes)
      expect(newTransactionButton).toHaveClass('w-12', 'h-12', 'p-0')
      
      // Should contain only plus icon, no text
      expect(plusIcon).toBeInTheDocument()
      expect(newTransactionButton).not.toHaveTextContent('New Transaction')
    })
  })

  describe('User Profile Section', () => {
    it('should generate correct initials from email', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should generate display name from email', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should handle complex email formats', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'jane_mary.smith@company.com' },
        isDemoAccount: false,
      })

      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('JM')).toBeInTheDocument() // Initials
      expect(screen.getByText('Jane Mary Smith')).toBeInTheDocument() // Display name
    })

    it('should show only avatar when collapsed on desktop', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      mockUseMobile.mockReturnValue(false)

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      expect(screen.getByText('JD')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should handle missing user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isDemoAccount: false,
      })

      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('U')).toBeInTheDocument() // Default initials
      expect(screen.getByText('User')).toBeInTheDocument() // Default name
    })
  })

  describe('Logo and Branding', () => {
    it('should render ClearHold logo on mobile', () => {
      mockUseMobile.mockReturnValue(true)
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('CH')).toBeInTheDocument()
      expect(screen.getByText('ClearHold')).toBeInTheDocument()
    })

    it('should render full logo when expanded on desktop', () => {
      mockUseMobile.mockReturnValue(false)
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      expect(screen.getByText('CH')).toBeInTheDocument()
      expect(screen.getByText('ClearHold')).toBeInTheDocument()
    })

    it('should render only CH when collapsed on desktop', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      mockUseMobile.mockReturnValue(false)

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      expect(screen.getByText('CH')).toBeInTheDocument()
      expect(screen.queryByText('ClearHold')).not.toBeInTheDocument()
    })

    it('should link logo to dashboard', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const logoLink = screen.getByText('ClearHold').closest('a')
      expect(logoLink).toHaveAttribute('href', '/dashboard')
    })
  })

  describe('Styling and Layout', () => {
    it('should have correct mobile sidebar classes', () => {
      mockUseMobile.mockReturnValue(true)
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const sidebar = screen.getByText('ClearHold').closest('.fixed')
      expect(sidebar).toHaveClass(
        'fixed',
        'inset-y-0',
        'left-0',
        'z-50',
        'w-64',
        'bg-white',
        'transition-transform',
        'duration-300',
        'ease-in-out',
        'border-r',
        'border-gray-200'
      )
    })

    it('should have correct desktop sidebar classes', () => {
      mockUseMobile.mockReturnValue(false)
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const sidebar = screen.getByText('ClearHold').closest('.relative')
      expect(sidebar).toHaveClass(
        'relative',
        'h-screen',
        'bg-white',
        'border-r',
        'border-gray-200',
        'transition-all',
        'duration-300',
        'ease-in-out'
      )
    })

    it('should have proper navigation item styling', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveClass(
        'flex',
        'items-center',
        'gap-3',
        'rounded-md',
        'px-3',
        'py-2.5',
        'text-sm',
        'font-medium',
        'transition-colors'
      )
    })
  })

  describe('Accessibility', () => {
    it('should have proper navigation structure', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should have accessible close button on mobile', () => {
      mockUseMobile.mockReturnValue(true)
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const closeButton = screen.getByTestId('x').closest('button')
      expect(closeButton).toBeInTheDocument()
    })

    it('should have proper link accessibility', () => {
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('should provide tooltips for collapsed state', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      mockUseMobile.mockReturnValue(false)

      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const dashboardLink = screen.getByTestId('layout-dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('title', 'Dashboard')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long email addresses', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'very.long.email.address.that.might.overflow@verylongdomain.example.com' },
        isDemoAccount: false,
      })

      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('VL')).toBeInTheDocument() // Initials should still work
    })

    it('should handle email with special characters', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'user+tag@example.com' },
        isDemoAccount: false,
      })

      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      expect(screen.getByText('UT')).toBeInTheDocument() // user, tag initials
    })

    it('should handle rapid toggle interactions', async () => {
      const user = userEvent.setup()
      mockUseMobile.mockReturnValue(false)
      
      render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)

      const toggleButton = screen.getByTestId('chevron-left').closest('button')
      
      // Rapid clicks
      await user.click(toggleButton!)
      await user.click(toggleButton!)
      await user.click(toggleButton!)

      expect(mockToggleSidebar).toHaveBeenCalledTimes(3)
    })

    it('should handle missing navigation state', () => {
      mockUsePathname.mockReturnValue(null)
      
      render(<DashboardSidebar open={true} setOpen={mockSetOpen} />)

      // Should still render navigation without active states
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily on prop changes', () => {
      const { rerender } = render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)
      
      // Change non-affecting props
      rerender(<DashboardSidebar open={false} setOpen={mockSetOpen} />)
      
      expect(screen.getByText('ClearHold')).toBeInTheDocument()
    })

    it('should handle state changes efficiently', () => {
      const { rerender } = render(<DashboardSidebar open={false} setOpen={mockSetOpen} />)
      
      // Change sidebar state
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      
      rerender(<DashboardSidebar open={false} setOpen={mockSetOpen} />)
      
      expect(screen.getByText('CH')).toBeInTheDocument()
    })
  })
})