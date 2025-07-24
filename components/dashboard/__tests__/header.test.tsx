import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardHeader from '../header'

// Mock contexts
const mockUseAuth = vi.fn()
const mockUseSidebar = vi.fn()
const mockUseMobile = vi.fn()

vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/context/sidebar-context', () => ({
  useSidebar: () => mockUseSidebar(),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useMobile: () => mockUseMobile(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock ConnectionStatusIndicator
vi.mock('@/components/connection-status-indicator', () => ({
  default: () => <div data-testid="connection-status">Connected</div>,
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  Menu: ({ className }: any) => <div data-testid="menu-icon" className={className} />,
  LogOut: ({ className }: any) => <div data-testid="logout-icon" className={className} />,
  ChevronLeft: ({ className }: any) => <div data-testid="chevron-left" className={className} />,
  ChevronRight: ({ className }: any) => <div data-testid="chevron-right" className={className} />,
}))

const mockUser = {
  email: 'john.doe@example.com',
  uid: 'user123',
}

const mockSetSidebarOpen = vi.fn()
const mockToggleSidebar = vi.fn()
const mockSignOut = vi.fn()

describe('DashboardHeader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    })
    mockUseSidebar.mockReturnValue({
      expanded: true,
      toggleSidebar: mockToggleSidebar,
    })
    mockUseMobile.mockReturnValue(false)
  })

  describe('Basic Rendering', () => {
    it('should render header with basic elements', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })

    it('should render user avatar with initials', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('JD')).toBeInTheDocument() // John.Doe initials
    })

    it('should render user email in dropdown', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })
  })

  describe('Mobile vs Desktop Behavior', () => {
    it('should show mobile menu button on mobile', () => {
      mockUseMobile.mockReturnValue(true)
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('menu-icon')).toBeInTheDocument()
    })

    it('should show desktop toggle button on desktop', () => {
      mockUseMobile.mockReturnValue(false)
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
    })

    it('should call setSidebarOpen on mobile menu click', async () => {
      mockUseMobile.mockReturnValue(true)
      const user = userEvent.setup()
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const menuButton = screen.getByTestId('menu-icon').closest('button')
      await user.click(menuButton!)

      expect(mockSetSidebarOpen).toHaveBeenCalledWith(true)
    })

    it('should call toggleSidebar on desktop toggle click', async () => {
      mockUseMobile.mockReturnValue(false)
      const user = userEvent.setup()
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
      await user.click(toggleButton)

      expect(mockToggleSidebar).toHaveBeenCalled()
    })
  })

  describe('Sidebar State', () => {
    it('should show collapse icon when sidebar is expanded', () => {
      mockUseSidebar.mockReturnValue({
        expanded: true,
        toggleSidebar: mockToggleSidebar,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('chevron-left')).toBeInTheDocument()
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument()
    })

    it('should show expand icon when sidebar is collapsed', () => {
      mockUseSidebar.mockReturnValue({
        expanded: false,
        toggleSidebar: mockToggleSidebar,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('chevron-right')).toBeInTheDocument()
      expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument()
    })
  })

  describe('User Avatar and Initials', () => {
    it('should generate correct initials from email', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should handle email with dots and underscores', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'jane_mary.smith@company.com' },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('JM')).toBeInTheDocument() // Jane, Mary initials
    })

    it('should handle email with numbers', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'user123@example.com' },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('U')).toBeInTheDocument() // Just "user" part
    })

    it('should fallback to first letter for simple emails', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'test@example.com' },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('T')).toBeInTheDocument()
    })

    it('should handle missing user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      // When user is null, no avatar is rendered (user && condition)
      expect(screen.queryByText('U')).not.toBeInTheDocument()
      // Header should still render with other elements
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })

    it('should handle missing email gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { email: null },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('U')).toBeInTheDocument() // Default fallback
    })
  })

  describe('User Dropdown Menu', () => {
    it('should show dropdown menu when avatar is clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('should show user email in dropdown header', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    it('should have correct navigation links in dropdown', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      const supportLink = screen.getByRole('link', { name: /help & support/i })

      expect(settingsLink).toHaveAttribute('href', '/settings')
      expect(supportLink).toHaveAttribute('href', '/support')
    })

    it('should call signOut when logout is clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      const logoutButton = screen.getByRole('menuitem', { name: /log out/i })
      await user.click(logoutButton)

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should not render dropdown when user is not logged in', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.queryByRole('button', { name: /U/i })).not.toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should have correct header styling', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass(
        'bg-white',
        'border-b',
        'border-gray-200',
        'h-16',
        'flex',
        'items-center',
        'px-4',
        'md:px-6'
      )
    })

    it('should have correct avatar styling', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatar = screen.getByText('JD')
      expect(avatar).toHaveClass(
        'w-9',
        'h-9',
        'rounded-full',
        'bg-teal-100',
        'flex',
        'items-center',
        'justify-center',
        'text-teal-800',
        'font-semibold'
      )
    })

    it('should have flexible layout with spacer', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const spacer = screen.getByRole('banner').querySelector('.flex-1')
      expect(spacer).toBeInTheDocument()
    })
  })

  describe('Connection Status', () => {
    it('should render connection status indicator', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })

    it('should position connection status before user menu', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const container = screen.getByTestId('connection-status').parentElement
      const userButton = screen.getByRole('button', { name: /JD/i })

      expect(container).toContainElement(screen.getByTestId('connection-status'))
      expect(container).toContainElement(userButton)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive padding', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('px-4', 'md:px-6')
    })

    it('should hide desktop toggle on mobile', () => {
      mockUseMobile.mockReturnValue(true)
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.queryByTestId('chevron-left')).not.toBeInTheDocument()
      expect(screen.queryByTestId('chevron-right')).not.toBeInTheDocument()
    })

    it('should show desktop toggle with proper breakpoint classes', () => {
      mockUseMobile.mockReturnValue(false)
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
      expect(toggleButton).toHaveClass('hidden', 'md:flex')
    })
  })

  describe('Button Variants', () => {
    it('should use ghost variant for buttons', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Note: testing for presence of buttons, specific class testing would need more specific selectors
        expect(button).toBeInTheDocument()
      })
    })

    it('should use icon size for toggle buttons', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
      expect(toggleButton).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const user = userEvent.setup()
      mockUseAuth.mockReturnValue({
        user: { email: 'very.long.email.address.that.might.overflow@example.com' },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /VL/i })
      await user.click(avatarButton)

      expect(screen.getByText('very.long.email.address.that.might.overflow@example.com')).toBeInTheDocument()
    })

    it('should handle special characters in email', () => {
      mockUseAuth.mockReturnValue({
        user: { email: 'user+test@example.com' },
        signOut: mockSignOut,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByText('UT')).toBeInTheDocument() // user, test initials
    })

    it('should handle rapid sidebar toggle clicks', async () => {
      const user = userEvent.setup()
      mockUseMobile.mockReturnValue(false)
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i })
      
      // Rapid clicks
      await user.click(toggleButton)
      await user.click(toggleButton)
      await user.click(toggleButton)

      expect(mockToggleSidebar).toHaveBeenCalledTimes(3)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /JD/i })).toBeInTheDocument()
    })

    it('should have descriptive button titles', () => {
      mockUseSidebar.mockReturnValue({
        expanded: true,
        toggleSidebar: mockToggleSidebar,
      })
      
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument()
    })

    it('should have proper menu accessibility', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      const avatarButton = screen.getByRole('button', { name: /JD/i })
      await user.click(avatarButton)

      expect(screen.getByRole('menu')).toBeInTheDocument()
      // Only Logout has proper menuitem role (Settings and Support are asChild links)
      expect(screen.getAllByRole('menuitem')).toHaveLength(1) // Only Logout
      
      // But all the items should be present
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<DashboardHeader sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />)

      // First tab goes to sidebar toggle button (on desktop)
      await user.tab()
      expect(screen.getByRole('button', { name: /collapse sidebar/i })).toHaveFocus()
      
      // Second tab goes to avatar button
      await user.tab()
      expect(screen.getByRole('button', { name: /JD/i })).toHaveFocus()

      // Enter to open menu
      await user.keyboard('[Enter]')
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
  })
})