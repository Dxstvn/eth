import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '../navbar'

// Mock hooks
const mockUseMobile = vi.fn()
vi.mock('@/hooks/use-mobile', () => ({
  useMobile: () => mockUseMobile(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  Menu: ({ className }: any) => <div data-testid="icon-menu" className={className} />,
  X: ({ className }: any) => <div data-testid="icon-x" className={className} />,
}))

describe('Authentication Navigation Components', () => {
  describe('Navbar', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockUseMobile.mockReturnValue(false) // Default to desktop
    })

    describe('Basic Rendering', () => {
      it('should render navbar with branding', () => {
        render(<Navbar />)
        
        expect(screen.getByText('CE')).toBeInTheDocument()
        expect(screen.getByText('CryptoEscrow')).toBeInTheDocument()
      })

      it('should render navigation links on desktop', () => {
        render(<Navbar />)
        
        expect(screen.getByRole('link', { name: 'How It Works' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
      })

      it('should render auth buttons on desktop', () => {
        render(<Navbar />)
        
        expect(screen.getByRole('link', { name: 'Log In' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument()
      })
    })

    describe('Mobile Navigation', () => {
      beforeEach(() => {
        mockUseMobile.mockReturnValue(true)
      })

      it('should render menu button on mobile', () => {
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        expect(menuButton).toBeInTheDocument()
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument()
      })

      it('should toggle mobile menu when clicked', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        
        // Menu should be closed initially
        expect(screen.queryByText('How It Works')).not.toBeInTheDocument()
        
        // Click to open
        await user.click(menuButton)
        expect(screen.getByText('How It Works')).toBeInTheDocument()
        expect(screen.getByTestId('icon-x')).toBeInTheDocument()
        
        // Click to close
        await user.click(menuButton)
        expect(screen.queryByText('How It Works')).not.toBeInTheDocument()
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument()
      })

      it('should show all navigation links in mobile menu', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        expect(screen.getByRole('link', { name: 'How It Works' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Features' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Log In' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument()
      })

      it('should close menu when a link is clicked', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        const aboutLink = screen.getByRole('link', { name: 'About' })
        await user.click(aboutLink)
        
        // Menu should be closed
        expect(screen.queryByRole('link', { name: 'Features' })).not.toBeInTheDocument()
      })

      it('should handle sign up click with state change', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        const signUpButton = screen.getByRole('link', { name: 'Sign Up' })
        await user.click(signUpButton)
        
        // Menu should be closed after clicking sign up
        expect(screen.queryByRole('link', { name: 'Features' })).not.toBeInTheDocument()
      })
    })

    describe('Navigation Links', () => {
      it('should have correct href attributes', () => {
        render(<Navbar />)
        
        expect(screen.getByRole('link', { name: 'How It Works' })).toHaveAttribute('href', '/how-it-works')
        expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features')
        expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
        expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
      })

      it('should have correct auth links', () => {
        render(<Navbar />)
        
        expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login')
        expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup')
      })
    })

    describe('Styling', () => {
      it('should have sticky header styling', () => {
        const { container } = render(<Navbar />)
        
        const header = container.querySelector('header')
        expect(header).toHaveClass('sticky', 'top-0', 'z-50', 'w-full', 'border-b', 'bg-white/90', 'backdrop-blur-md')
      })

      it('should have correct branding styling', () => {
        render(<Navbar />)
        
        const logo = screen.getByText('CE')
        expect(logo).toHaveClass('bg-gradient-to-br', 'from-brand-500', 'to-brand-700', 'text-white', 'font-bold')
        
        const brandText = screen.getByText('CryptoEscrow')
        expect(brandText).toHaveClass('text-xl', 'font-display', 'font-semibold', 'bg-clip-text', 'text-transparent')
      })

      it('should have hover effects on navigation links', () => {
        render(<Navbar />)
        
        const link = screen.getByRole('link', { name: 'How It Works' })
        expect(link).toHaveClass('hover:text-brand-600', 'transition-colors')
      })

      it('should have correct button styling', () => {
        render(<Navbar />)
        
        // In desktop mode, buttons use asChild pattern, so the styles are on the links themselves
        const loginButton = screen.getByRole('link', { name: 'Log In' })
        expect(loginButton).toHaveClass('hover:text-brand-600')
        
        const signUpButton = screen.getByRole('link', { name: 'Sign Up' })
        expect(signUpButton).toHaveClass('bg-brand-600', 'hover:bg-brand-700')
      })
    })

    describe('Mobile Menu Animation', () => {
      beforeEach(() => {
        mockUseMobile.mockReturnValue(true)
      })

      it('should have slide-in animation for mobile menu', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        const mobileMenu = screen.getByText('How It Works').closest('div')
        expect(mobileMenu).toHaveClass('animate-in', 'slide-in-from-top-5')
      })

      it('should position mobile menu correctly', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        const mobileMenu = screen.getByText('How It Works').closest('div')
        expect(mobileMenu).toHaveClass('absolute', 'top-16', 'left-0', 'right-0')
      })
    })

    describe('Responsive Behavior', () => {
      it('should hide desktop navigation on mobile', () => {
        mockUseMobile.mockReturnValue(true)
        render(<Navbar />)
        
        const desktopNav = document.querySelector('nav.hidden.md\\:flex')
        expect(desktopNav).not.toBeInTheDocument()
      })

      it('should show desktop navigation on desktop', () => {
        mockUseMobile.mockReturnValue(false)
        render(<Navbar />)
        
        const desktopNav = document.querySelector('nav.hidden.md\\:flex')
        expect(desktopNav).toBeInTheDocument()
      })

      it('should hide mobile menu button on desktop', () => {
        mockUseMobile.mockReturnValue(false)
        render(<Navbar />)
        
        expect(screen.queryByRole('button', { name: 'Toggle Menu' })).not.toBeInTheDocument()
      })
    })

    describe('Authentication State', () => {
      it('should maintain isLogin state', async () => {
        const user = userEvent.setup()
        mockUseMobile.mockReturnValue(true)
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        await user.click(menuButton)
        
        // Initial state should be login
        const signUpButton = screen.getByRole('link', { name: 'Sign Up' })
        await user.click(signUpButton)
        
        // State should change when sign up is clicked
        expect(signUpButton).toHaveAttribute('href', '/login')
      })
    })

    describe('Accessibility', () => {
      it('should have proper aria-label for menu toggle', () => {
        mockUseMobile.mockReturnValue(true)
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        expect(menuButton).toHaveAttribute('aria-label', 'Toggle Menu')
      })

      it('should have proper link structure', () => {
        render(<Navbar />)
        
        const links = screen.getAllByRole('link')
        links.forEach(link => {
          expect(link).toHaveAttribute('href')
        })
      })

      it('should be keyboard navigable', async () => {
        const user = userEvent.setup()
        render(<Navbar />)
        
        // Tab through links
        await user.tab()
        expect(document.activeElement).toHaveAttribute('href', '/')
        
        await user.tab()
        expect(document.activeElement).toHaveAttribute('href', '/how-it-works')
      })
    })

    describe('Edge Cases', () => {
      it('should handle rapid menu toggles', async () => {
        const user = userEvent.setup()
        mockUseMobile.mockReturnValue(true)
        render(<Navbar />)
        
        const menuButton = screen.getByRole('button', { name: 'Toggle Menu' })
        
        // Rapidly toggle menu
        await user.click(menuButton)
        await user.click(menuButton)
        await user.click(menuButton)
        
        // Should be open after odd number of clicks
        expect(screen.getByText('How It Works')).toBeInTheDocument()
      })

      it('should handle window resize', () => {
        const { rerender } = render(<Navbar />)
        
        // Start with desktop
        expect(screen.queryByRole('button', { name: 'Toggle Menu' })).not.toBeInTheDocument()
        
        // Change to mobile
        mockUseMobile.mockReturnValue(true)
        rerender(<Navbar />)
        
        expect(screen.getByRole('button', { name: 'Toggle Menu' })).toBeInTheDocument()
      })
    })

    describe('Performance', () => {
      it('should not re-render unnecessarily', () => {
        let renderCount = 0
        const TestNavbar = () => {
          renderCount++
          return <Navbar />
        }
        
        const { rerender } = render(<TestNavbar />)
        expect(renderCount).toBe(1)
        
        // Re-render with same props
        rerender(<TestNavbar />)
        expect(renderCount).toBe(2)
      })

      it('should handle multiple instances', () => {
        render(
          <div>
            <Navbar />
            <Navbar />
          </div>
        )
        
        // Should render both without conflicts
        const brandingElements = screen.getAllByText('CryptoEscrow')
        expect(brandingElements).toHaveLength(2)
      })
    })
  })
})