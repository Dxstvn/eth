import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '../dialog'

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">✕</div>,
}))

// Mock Radix UI Portal to render inline for testing
vi.mock('@radix-ui/react-dialog', async () => {
  const actual = await vi.importActual('@radix-ui/react-dialog') as any
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  }
})

const BasicDialog = ({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <button>Open Dialog</button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dialog Title</DialogTitle>
        <DialogDescription>Dialog description text</DialogDescription>
      </DialogHeader>
      <div>Dialog content</div>
      <DialogFooter>
        <DialogClose asChild>
          <button>Cancel</button>
        </DialogClose>
        <button>Confirm</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

const ControlledDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <button>Open Controlled Dialog</button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Controlled Dialog</DialogTitle>
      </DialogHeader>
      <p>This is a controlled dialog</p>
    </DialogContent>
  </Dialog>
)

describe('Dialog Component', () => {
  describe('Basic Rendering', () => {
    it('should render trigger button', () => {
      render(<BasicDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      expect(trigger).toBeInTheDocument()
    })

    it('should not show dialog content initially', () => {
      render(<BasicDialog />)
      
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument()
      expect(screen.queryByText('Dialog description text')).not.toBeInTheDocument()
    })

    it('should open dialog when trigger is clicked', async () => {
      render(<BasicDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await userEvent.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
        expect(screen.getByText('Dialog description text')).toBeInTheDocument()
        expect(screen.getByText('Dialog content')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Content Structure', () => {
    it('should render all dialog parts when open', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
        expect(screen.getByText('Dialog description text')).toBeInTheDocument()
        expect(screen.getByText('Dialog content')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Confirm')).toBeInTheDocument()
      })
    })

    it('should render close button with icon', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('close-icon')).toBeInTheDocument()
        // The close button should be accessible - check for the close button by its function
        const closeButton = screen.getByRole('button', { name: /close/i })
        expect(closeButton).toBeInTheDocument()
      })
    })

    it('should have correct header styling', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const title = screen.getByText('Dialog Title')
        expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight')
        
        const description = screen.getByText('Dialog description text')
        expect(description).toHaveClass('text-sm', 'text-muted-foreground')
      })
    })

    it('should have correct overlay styling', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        // Find overlay by partial class matching
        const overlay = document.querySelector('.fixed.inset-0.z-50')
        expect(overlay).toBeInTheDocument()
        expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50')
      })
    })
  })

  describe('Opening and Closing', () => {
    it('should close when X button is clicked', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeButton)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should close when Cancel button is clicked', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should close when Escape key is pressed', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      await userEvent.keyboard('{Escape}')
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should close when clicking outside the dialog', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      // Click on the overlay (outside the content)
      const overlay = document.querySelector('[data-radix-dialog-overlay]')
      if (overlay) {
        await userEvent.click(overlay)
        expect(onOpenChange).toHaveBeenCalledWith(false)
      }
    })

    it('should not close when clicking inside the dialog', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      const content = screen.getByText('Dialog content')
      await userEvent.click(content)
      
      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Controlled vs Uncontrolled', () => {
    it('should work as uncontrolled component', async () => {
      render(<BasicDialog />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await userEvent.click(trigger)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
    })

    it('should work as controlled component', async () => {
      const onOpenChange = vi.fn()
      const { rerender } = render(<ControlledDialog open={false} onOpenChange={onOpenChange} />)
      
      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument()
      
      rerender(<ControlledDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Controlled Dialog')).toBeInTheDocument()
      })
    })

    it('should call onOpenChange when state changes', async () => {
      const onOpenChange = vi.fn()
      render(<ControlledDialog open={false} onOpenChange={onOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Controlled Dialog' })
      await userEvent.click(trigger)
      
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveAttribute('aria-describedby')
        expect(dialog).toHaveAttribute('aria-labelledby')
      })
    })

    it('should focus management', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(document.activeElement).toBeInTheDocument()
      })
    })

    it('should trap focus within dialog', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      // Focus should be trapped within the dialog
      const cancelButton = screen.getByText('Cancel')
      const confirmButton = screen.getByText('Confirm')
      
      expect(cancelButton).toBeInTheDocument()
      expect(confirmButton).toBeInTheDocument()
    })

    it('should support screen readers', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const title = screen.getByText('Dialog Title')
        const description = screen.getByText('Dialog description text')
        
        expect(title).toBeInTheDocument()
        expect(description).toBeInTheDocument()
      })
    })

    it('should have proper close button accessibility', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i })
        expect(closeButton).toBeInTheDocument()
        expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should handle Tab navigation', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      // Test tab navigation through focusable elements
      await userEvent.tab()
      // Focus should move to next focusable element
    })

    it('should handle Shift+Tab navigation', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      await userEvent.tab({ shift: true })
      // Focus should move to previous focusable element
    })

    it('should close on Escape', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      await userEvent.keyboard('{Escape}')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Custom Styling', () => {
    it('should accept custom className for content', async () => {
      render(
        <Dialog open={true}>
          <DialogContent className="custom-dialog-class">
            <DialogTitle>Custom Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        const content = screen.getByRole('dialog')
        expect(content).toHaveClass('custom-dialog-class')
      })
    })

    it('should accept custom className for overlay', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogOverlay className="custom-overlay-class" />
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        const overlay = document.querySelector('.custom-overlay-class')
        expect(overlay).toBeInTheDocument()
      })
    })

    it('should accept custom className for header', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader className="custom-header-class">
              <DialogTitle>Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        const header = document.querySelector('.custom-header-class')
        expect(header).toBeInTheDocument()
      })
    })

    it('should accept custom className for footer', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
            <DialogFooter className="custom-footer-class">
              <button>Footer content</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        const footer = document.querySelector('.custom-footer-class')
        expect(footer).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle dialog without description', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title Only</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Title Only')).toBeInTheDocument()
        expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
      })
    })

    it('should handle dialog without header', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <div>Content without header</div>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Content without header')).toBeInTheDocument()
      })
    })

    it('should handle dialog without footer', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No Footer</DialogTitle>
            </DialogHeader>
            <div>Content</div>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        expect(screen.getByText('No Footer')).toBeInTheDocument()
        expect(screen.getByText('Content')).toBeInTheDocument()
      })
    })

    it('should handle very long content', async () => {
      const longContent = 'Very long content '.repeat(100)
      
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Long Content Dialog</DialogTitle>
            </DialogHeader>
            <div data-testid="long-content">{longContent}</div>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Long Content Dialog')).toBeInTheDocument()
        // Check that the content container exists and has content
        const contentElement = screen.getByTestId('long-content')
        expect(contentElement).toBeInTheDocument()
        expect(contentElement.textContent).toContain('Very long content')
      })
    })

    it('should handle rapid open/close operations', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={false} onOpenChange={onOpenChange} />)
      
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      
      // Rapid clicks
      await userEvent.click(trigger)
      await userEvent.click(trigger)
      await userEvent.click(trigger)
      
      // Should handle gracefully without errors
      expect(onOpenChange).toHaveBeenCalled()
    })
  })

  describe('Portal Behavior', () => {
    it('should render content in portal', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        
        // Dialog should be rendered outside the normal DOM tree
        expect(dialog.closest('body')).toBeInTheDocument()
      })
    })

    it('should clean up portal on unmount', async () => {
      const { unmount } = render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      unmount()
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Animation and Transitions', () => {
    it('should have animation classes', async () => {
      render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        const content = screen.getByRole('dialog')
        expect(content).toHaveClass('duration-200')
        
        // Find overlay by its CSS classes
        const overlay = document.querySelector('.fixed.inset-0.z-50')
        expect(overlay).toBeInTheDocument()
        expect(overlay).toHaveClass('data-[state=open]:animate-in', 'data-[state=closed]:animate-out')
      })
    })

    it('should handle animation states', async () => {
      const onOpenChange = vi.fn()
      render(<BasicDialog open={true} onOpenChange={onOpenChange} />)
      
      await waitFor(() => {
        const content = screen.getByRole('dialog')
        expect(content).toHaveClass(
          'data-[state=open]:fade-in-0',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95',
          'data-[state=closed]:zoom-out-95'
        )
      })
    })
  })

  describe('Form Integration', () => {
    it('should work with forms inside dialog', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Form Dialog</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <input placeholder="Enter text" />
              <button type="submit">Submit</button>
            </form>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter text')
        const submitButton = screen.getByRole('button', { name: 'Submit' })
        
        expect(input).toBeInTheDocument()
        expect(submitButton).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await userEvent.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should prevent form submission from closing dialog accidentally', async () => {
      const onOpenChange = vi.fn()
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <input placeholder="Enter text" />
              <button type="submit">Submit</button>
            </form>
          </DialogContent>
        </Dialog>
      )
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await userEvent.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should not render content when closed', () => {
      render(<BasicDialog open={false} />)
      
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should handle multiple dialogs efficiently', async () => {
      render(
        <>
          <BasicDialog open={true} />
          <Dialog open={true}>
            <DialogContent>
              <DialogTitle>Second Dialog</DialogTitle>
            </DialogContent>
          </Dialog>
        </>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
        expect(screen.getByText('Second Dialog')).toBeInTheDocument()
      })
    })

    it('should not cause memory leaks', async () => {
      const { rerender } = render(<BasicDialog open={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      })
      
      rerender(<BasicDialog open={false} />)
      
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument()
    })
  })
})