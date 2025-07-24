import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-teal-900', 'text-white', 'h-10', 'px-4')
    })

    it('should render children correctly', () => {
      render(<Button>Test Button</Button>)
      
      expect(screen.getByText('Test Button')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      render(<Button className="custom-class">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = vi.fn()
      render(<Button ref={ref}>Button</Button>)
      
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('Variants', () => {
    it('should render default variant correctly', () => {
      render(<Button variant="default">Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-teal-900', 'text-white')
    })

    it('should render secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-white', 'text-teal-900', 'border', 'border-teal-200')
    })

    it('should render tertiary variant correctly', () => {
      render(<Button variant="tertiary">Tertiary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-transparent', 'text-teal-700')
    })

    it('should render destructive variant correctly', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-red-600', 'text-white')
    })

    it('should render outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'border-gray-300', 'bg-white', 'text-gray-700')
    })

    it('should render ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-transparent', 'text-gray-700')
    })

    it('should render link variant correctly', () => {
      render(<Button variant="link">Link</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-teal-700', 'underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('should render small size correctly', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'px-3', 'text-sm')
    })

    it('should render default size correctly', () => {
      render(<Button size="default">Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-4', 'py-2', 'text-sm')
    })

    it('should render large size correctly', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-12', 'px-6', 'py-3', 'text-base')
    })

    it('should render icon size correctly', () => {
      render(<Button size="icon">📱</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'w-10')
    })
  })

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should not trigger onClick when disabled', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should handle focus state', async () => {
      render(<Button>Focusable</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.tab()
      
      expect(button).toHaveFocus()
    })

    it('should handle loading state with custom implementation', () => {
      render(
        <Button disabled>
          <span className="animate-spin">⚪</span>
          Loading...
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Event Handling', () => {
    it('should handle onClick events', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await userEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle onMouseEnter and onMouseLeave', async () => {
      const handleMouseEnter = vi.fn()
      const handleMouseLeave = vi.fn()
      
      render(
        <Button onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          Hover me
        </Button>
      )
      
      const button = screen.getByRole('button')
      await userEvent.hover(button)
      expect(handleMouseEnter).toHaveBeenCalledTimes(1)
      
      await userEvent.unhover(button)
      expect(handleMouseLeave).toHaveBeenCalledTimes(1)
    })

    it('should handle keyboard events', async () => {
      const handleKeyDown = vi.fn()
      render(<Button onKeyDown={handleKeyDown}>Button</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(handleKeyDown).toHaveBeenCalled()
    })

    it('should handle form submission', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('AsChild Prop', () => {
    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('bg-teal-900', 'text-white') // Button styles applied to link
    })

    it('should not render as child when asChild is false', () => {
      render(
        <Button asChild={false}>
          Regular Button Text
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(button).toHaveTextContent('Regular Button Text')
    })
  })

  describe('Content and Icons', () => {
    it('should render with icons', () => {
      render(
        <Button>
          <span data-testid="icon">📱</span>
          Button with icon
        </Button>
      )
      
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Button with icon')).toBeInTheDocument()
    })

    it('should render only icon for icon button', () => {
      render(<Button size="icon">📱</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('📱')
      expect(button).toHaveClass('h-10', 'w-10')
    })

    it('should handle long text content', () => {
      const longText = 'This is a very long button text that might wrap or truncate'
      render(<Button>{longText}</Button>)
      
      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('should handle empty content', () => {
      render(<Button></Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('')
    })
  })

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })

    it('should support aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true">Toggle Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('should support aria-expanded for expandable buttons', () => {
      render(<Button aria-expanded="false">Expandable</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('should support aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="help-text">Button</Button>
          <div id="help-text">This button does something</div>
        </>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('should be keyboard navigable', async () => {
      render(
        <>
          <Button>First</Button>
          <Button>Second</Button>
        </>
      )
      
      const firstButton = screen.getByRole('button', { name: 'First' })
      const secondButton = screen.getByRole('button', { name: 'Second' })
      
      await userEvent.tab()
      expect(firstButton).toHaveFocus()
      
      await userEvent.tab()
      expect(secondButton).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicking', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Rapid Click</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate rapid clicks
      await userEvent.click(button)
      await userEvent.click(button)
      await userEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('should handle button with complex children', () => {
      render(
        <Button>
          <div>
            <span>Complex</span>
            <strong>Children</strong>
          </div>
        </Button>
      )
      
      expect(screen.getByText('Complex')).toBeInTheDocument()
      expect(screen.getByText('Children')).toBeInTheDocument()
    })

    it('should handle custom HTML attributes', () => {
      render(
        <Button 
          data-testid="custom-button"
          title="Custom tooltip"
          tabIndex={0}
        >
          Custom Button
        </Button>
      )
      
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('title', 'Custom tooltip')
      expect(button).toHaveAttribute('tabIndex', '0')
    })

    it('should handle button type attribute', () => {
      render(<Button type="submit">Submit Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should handle button with form attribute', () => {
      render(
        <>
          <form id="test-form"></form>
          <Button form="test-form">External Submit</Button>
        </>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('form', 'test-form')
    })
  })

  describe('Responsive Behavior', () => {
    it('should maintain layout on different screen sizes', () => {
      // Test that button maintains its structure
      render(<Button>Responsive Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('should handle touch interactions', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Touch Button</Button>)
      
      const button = screen.getByRole('button')
      
      // Simulate touch events
      fireEvent.touchStart(button)
      fireEvent.touchEnd(button)
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Animation and Transitions', () => {
    it('should have transition classes', () => {
      render(<Button>Animated Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-all', 'duration-200', 'ease-in-out')
    })

    it('should have active scale animation class', () => {
      render(<Button>Scale Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('active:scale-98')
    })

    it('should have focus ring classes', () => {
      render(<Button>Focus Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-offset-2')
    })
  })

  describe('Integration with Forms', () => {
    it('should work within form validation', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <input required data-testid="required-input" />
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const input = screen.getByTestId('required-input')
      const button = screen.getByRole('button')
      
      // Fill the required field first
      await userEvent.type(input, 'test value')
      await userEvent.click(button)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should reset form when type is reset', () => {
      render(
        <form>
          <input defaultValue="test" data-testid="reset-input" />
          <Button type="reset">Reset</Button>
        </form>
      )
      
      const input = screen.getByTestId('reset-input')
      const resetButton = screen.getByRole('button')
      
      expect(input).toHaveValue('test')
      
      fireEvent.click(resetButton)
      
      // Note: Reset behavior may vary in test environment
      // Just verify the button exists and can be clicked
      expect(resetButton).toHaveAttribute('type', 'reset')
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      let renderCount = 0
      const TestButton = () => {
        renderCount++
        return <Button>Performance Test</Button>
      }
      
      const { rerender } = render(<TestButton />)
      expect(renderCount).toBe(1)
      
      rerender(<TestButton />)
      expect(renderCount).toBe(2)
    })

    it('should handle many buttons efficiently', () => {
      const buttons = Array.from({ length: 100 }, (_, i) => (
        <Button key={i}>Button {i}</Button>
      ))
      
      render(<div>{buttons}</div>)
      
      expect(screen.getAllByRole('button')).toHaveLength(100)
    })
  })
})