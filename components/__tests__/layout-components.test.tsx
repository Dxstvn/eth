import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardLayout from '../layout/dashboard-layout'

// Mock dependencies
const mockUseAuth = vi.fn()
const mockUseRouter = vi.fn()
const mockPush = vi.fn()

vi.mock('@/context/auth-context-v2', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
}))

// Mock components
vi.mock('@/components/loading-screen', () => ({
  default: () => <div data-testid="loading-screen">Loading...</div>,
}))

vi.mock('@/components/sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}))

describe('Layout Components', () => {
  describe('DashboardLayout', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockUseRouter.mockReturnValue({
        push: mockPush,
      })
    })

    describe('Basic Rendering', () => {
      it('should render loading screen when loading', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: true,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
        expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
      })

      it('should render layout with sidebar when authenticated', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      })

      it('should render children content', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        render(
          <DashboardLayout>
            <h1>Page Title</h1>
            <p>Page content</p>
          </DashboardLayout>
        )

        expect(screen.getByText('Page Title')).toBeInTheDocument()
        expect(screen.getByText('Page content')).toBeInTheDocument()
      })
    })

    describe('Authentication Handling', () => {
      it('should redirect to home when not authenticated', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: false,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(mockPush).toHaveBeenCalledWith('/')
      })

      it('should not redirect when loading', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: true,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(mockPush).not.toHaveBeenCalled()
      })

      it('should not redirect when authenticated', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(mockPush).not.toHaveBeenCalled()
      })

      it('should handle auth state changes', () => {
        const { rerender } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        // Start with loading
        mockUseAuth.mockReturnValue({
          user: null,
          loading: true,
        })
        rerender(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )
        expect(screen.getByTestId('loading-screen')).toBeInTheDocument()

        // Then authenticated
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })
        rerender(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      })
    })

    describe('Layout Structure', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })
      })

      it('should have correct layout structure', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const layoutContainer = container.querySelector('.flex.min-h-screen.bg-gray-50')
        expect(layoutContainer).toBeInTheDocument()
      })

      it('should have main content area with proper styling', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const mainContent = container.querySelector('main.flex-1.overflow-auto')
        expect(mainContent).toBeInTheDocument()
      })

      it('should have container with responsive padding', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const contentContainer = container.querySelector('.container.mx-auto.py-8.px-4.md\\:px-6.lg\\:px-8')
        expect(contentContainer).toBeInTheDocument()
      })
    })

    describe('Styling', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })
      })

      it('should have minimum height screen', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const layoutDiv = container.querySelector('.min-h-screen')
        expect(layoutDiv).toBeInTheDocument()
      })

      it('should have gray background', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const layoutDiv = container.querySelector('.bg-gray-50')
        expect(layoutDiv).toBeInTheDocument()
      })

      it('should have flex layout', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const flexContainer = container.querySelector('.flex')
        expect(flexContainer).toBeInTheDocument()
      })

      it('should have responsive padding classes', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const contentContainer = container.querySelector('[class*="px-4"][class*="md:px-6"][class*="lg:px-8"]')
        expect(contentContainer).toBeInTheDocument()
      })
    })

    describe('Accessibility', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })
      })

      it('should have semantic main element', () => {
        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
      })

      it('should maintain document structure', () => {
        const { container } = render(
          <DashboardLayout>
            <h1>Page Title</h1>
            <section>
              <h2>Section Title</h2>
              <p>Content</p>
            </section>
          </DashboardLayout>
        )

        expect(container.querySelector('h1')).toBeInTheDocument()
        expect(container.querySelector('section')).toBeInTheDocument()
        expect(container.querySelector('h2')).toBeInTheDocument()
      })
    })

    describe('Edge Cases', () => {
      it('should handle undefined user gracefully', () => {
        mockUseAuth.mockReturnValue({
          user: undefined,
          loading: false,
        })

        render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        expect(mockPush).toHaveBeenCalledWith('/')
      })

      it('should handle null children', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        const { container } = render(
          <DashboardLayout>
            {null}
          </DashboardLayout>
        )

        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(container.querySelector('main')).toBeInTheDocument()
      })

      it('should handle multiple children', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        render(
          <DashboardLayout>
            <div>Child 1</div>
            <div>Child 2</div>
            <div>Child 3</div>
          </DashboardLayout>
        )

        expect(screen.getByText('Child 1')).toBeInTheDocument()
        expect(screen.getByText('Child 2')).toBeInTheDocument()
        expect(screen.getByText('Child 3')).toBeInTheDocument()
      })
    })

    describe('Performance', () => {
      it('should not cause unnecessary re-renders on auth state change', () => {
        let renderCount = 0
        const TestChild = () => {
          renderCount++
          return <div>Test Content</div>
        }

        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        const { rerender } = render(
          <DashboardLayout>
            <TestChild />
          </DashboardLayout>
        )

        const initialRenderCount = renderCount

        // Re-render with same auth state
        rerender(
          <DashboardLayout>
            <TestChild />
          </DashboardLayout>
        )

        // Should only re-render once for the rerender call
        expect(renderCount).toBe(initialRenderCount + 1)
      })

      it('should cleanup effect on unmount', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: false,
        })

        const { unmount } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        unmount()

        // Should not cause errors
        expect(() => unmount()).not.toThrow()
      })
    })

    describe('Integration', () => {
      it('should work with complex nested content', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        render(
          <DashboardLayout>
            <div className="dashboard-page">
              <header>
                <h1>Dashboard</h1>
              </header>
              <main>
                <section>
                  <h2>Statistics</h2>
                  <div>Charts go here</div>
                </section>
                <section>
                  <h2>Recent Activity</h2>
                  <ul>
                    <li>Activity 1</li>
                    <li>Activity 2</li>
                  </ul>
                </section>
              </main>
              <footer>
                <p>Footer content</p>
              </footer>
            </div>
          </DashboardLayout>
        )

        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Statistics')).toBeInTheDocument()
        expect(screen.getByText('Recent Activity')).toBeInTheDocument()
        expect(screen.getByText('Footer content')).toBeInTheDocument()
      })

      it('should handle dynamic content updates', () => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })

        const { rerender } = render(
          <DashboardLayout>
            <div>Initial Content</div>
          </DashboardLayout>
        )

        expect(screen.getByText('Initial Content')).toBeInTheDocument()

        rerender(
          <DashboardLayout>
            <div>Updated Content</div>
          </DashboardLayout>
        )

        expect(screen.queryByText('Initial Content')).not.toBeInTheDocument()
        expect(screen.getByText('Updated Content')).toBeInTheDocument()
      })
    })

    describe('Responsive Behavior', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: { email: 'test@example.com' },
          loading: false,
        })
      })

      it('should have responsive container', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const contentContainer = container.querySelector('.container')
        expect(contentContainer).toHaveClass('mx-auto')
      })

      it('should have responsive padding', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        const contentContainer = container.querySelector('.container')
        expect(contentContainer).toHaveClass('px-4', 'md:px-6', 'lg:px-8')
      })

      it('should maintain layout on different screen sizes', () => {
        const { container } = render(
          <DashboardLayout>
            <div>Dashboard Content</div>
          </DashboardLayout>
        )

        // Check that flex layout is maintained
        const flexContainer = container.querySelector('.flex')
        expect(flexContainer).toBeInTheDocument()

        // Check that main content area is flexible
        const mainArea = container.querySelector('main.flex-1')
        expect(mainArea).toBeInTheDocument()
      })
    })
  })
})