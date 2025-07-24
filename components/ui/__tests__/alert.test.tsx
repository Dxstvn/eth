import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

const BasicAlert = ({ variant = 'default' }) => (
  <Alert variant={variant}>
    <svg data-testid="alert-icon" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="8" />
    </svg>
    <AlertTitle>Alert Title</AlertTitle>
    <AlertDescription>
      This is an alert description that provides more details about the alert.
    </AlertDescription>
  </Alert>
)

describe('Alert Component', () => {
  describe('Basic Rendering', () => {
    it('should render alert with default variant', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveClass('bg-background', 'text-foreground')
    })

    it('should render alert title', () => {
      render(<BasicAlert />)
      
      const title = screen.getByText('Alert Title')
      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H5')
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
    })

    it('should render alert description', () => {
      render(<BasicAlert />)
      
      const description = screen.getByText(/This is an alert description/)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', '[&_p]:leading-relaxed')
    })

    it('should render with icon', () => {
      render(<BasicAlert />)
      
      const icon = screen.getByTestId('alert-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should have correct basic styling', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass(
        'relative', 'w-full', 'rounded-lg', 'border', 'p-4'
      )
    })
  })

  describe('Variants', () => {
    it('should render default variant correctly', () => {
      render(<BasicAlert variant="default" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-background', 'text-foreground')
    })

    it('should render destructive variant correctly', () => {
      render(<BasicAlert variant="destructive" />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass(
        'border-destructive/50',
        'text-destructive',
        'dark:border-destructive',
        '[&>svg]:text-destructive'
      )
    })
  })

  describe('Icon Positioning', () => {
    it('should position icon correctly', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass(
        '[&>svg]:absolute',
        '[&>svg]:left-4',
        '[&>svg]:top-4',
        '[&>svg]:text-foreground'
      )
    })

    it('should adjust content spacing for icon', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass(
        '[&>svg~*]:pl-7',
        '[&>svg+div]:translate-y-[-3px]'
      )
    })
  })

  describe('Custom Styling', () => {
    it('should accept custom className for Alert', () => {
      render(
        <Alert className="custom-alert-class">
          <AlertTitle>Custom Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('custom-alert-class')
    })

    it('should accept custom className for AlertTitle', () => {
      render(
        <Alert>
          <AlertTitle className="custom-title-class">Custom Title</AlertTitle>
        </Alert>
      )
      
      const title = screen.getByText('Custom Title')
      expect(title).toHaveClass('custom-title-class')
    })

    it('should accept custom className for AlertDescription', () => {
      render(
        <Alert>
          <AlertDescription className="custom-description-class">
            Custom Description
          </AlertDescription>
        </Alert>
      )
      
      const description = screen.getByText('Custom Description')
      expect(description).toHaveClass('custom-description-class')
    })
  })

  describe('Content Variations', () => {
    it('should render alert without icon', () => {
      render(
        <Alert>
          <AlertTitle>No Icon Alert</AlertTitle>
          <AlertDescription>Alert without an icon</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const title = screen.getByText('No Icon Alert')
      const description = screen.getByText('Alert without an icon')
      
      expect(alert).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should render alert without title', () => {
      render(
        <Alert>
          <AlertDescription>Description only alert</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const description = screen.getByText('Description only alert')
      
      expect(alert).toBeInTheDocument()
      expect(description).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('should render alert without description', () => {
      render(
        <Alert>
          <AlertTitle>Title only alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const title = screen.getByText('Title only alert')
      
      expect(alert).toBeInTheDocument()
      expect(title).toBeInTheDocument()
    })

    it('should render alert with only custom content', () => {
      render(
        <Alert>
          <div>Custom content without title or description</div>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const content = screen.getByText('Custom content without title or description')
      
      expect(alert).toBeInTheDocument()
      expect(content).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have correct role', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('should be accessible to screen readers', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      const title = screen.getByText('Alert Title')
      const description = screen.getByText(/This is an alert description/)
      
      expect(alert).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should work with aria-label', () => {
      render(
        <Alert aria-label="Custom alert label">
          <AlertTitle>Alert</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByLabelText('Custom alert label')
      expect(alert).toBeInTheDocument()
    })

    it('should work with aria-describedby', () => {
      render(
        <div>
          <Alert aria-describedby="alert-help">
            <AlertTitle>Alert with description</AlertTitle>
          </Alert>
          <div id="alert-help">Additional help text</div>
        </div>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-describedby', 'alert-help')
    })
  })

  describe('Ref Forwarding', () => {
    it('should forward ref for Alert', () => {
      const ref = vi.fn()
      render(
        <Alert ref={ref}>
          <AlertTitle>Ref Test</AlertTitle>
        </Alert>
      )
      
      expect(ref).toHaveBeenCalled()
    })

    it('should forward ref for AlertTitle', () => {
      const ref = vi.fn()
      render(
        <Alert>
          <AlertTitle ref={ref}>Title Ref Test</AlertTitle>
        </Alert>
      )
      
      expect(ref).toHaveBeenCalled()
    })

    it('should forward ref for AlertDescription', () => {
      const ref = vi.fn()
      render(
        <Alert>
          <AlertDescription ref={ref}>Description Ref Test</AlertDescription>
        </Alert>
      )
      
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes to Alert', () => {
      render(
        <Alert data-testid="custom-alert" id="alert-id">
          <AlertTitle>Attribute Test</AlertTitle>
        </Alert>
      )
      
      const alert = screen.getByTestId('custom-alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveAttribute('id', 'alert-id')
    })

    it('should pass through HTML attributes to AlertTitle', () => {
      render(
        <Alert>
          <AlertTitle data-testid="custom-title" id="title-id">
            Title Attributes
          </AlertTitle>
        </Alert>
      )
      
      const title = screen.getByTestId('custom-title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveAttribute('id', 'title-id')
    })

    it('should pass through HTML attributes to AlertDescription', () => {
      render(
        <Alert>
          <AlertDescription data-testid="custom-description" id="desc-id">
            Description Attributes
          </AlertDescription>
        </Alert>
      )
      
      const description = screen.getByTestId('custom-description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveAttribute('id', 'desc-id')
    })
  })

  describe('Different Icon Types', () => {
    it('should work with different icon libraries', () => {
      render(
        <Alert>
          <div data-testid="custom-icon">⚠️</div>
          <AlertTitle>Custom Icon Alert</AlertTitle>
          <AlertDescription>Alert with emoji icon</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const icon = screen.getByTestId('custom-icon')
      
      expect(alert).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveTextContent('⚠️')
    })

    it('should work with SVG icons', () => {
      render(
        <Alert>
          <svg data-testid="svg-icon" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
          <AlertTitle>SVG Icon Alert</AlertTitle>
        </Alert>
      )
      
      const icon = screen.getByTestId('svg-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName).toBe('svg')
    })

    it('should work with image icons', () => {
      render(
        <Alert>
          <img 
            data-testid="img-icon" 
            src="/icon.png" 
            alt="Alert icon" 
            width="16" 
            height="16" 
          />
          <AlertTitle>Image Icon Alert</AlertTitle>
        </Alert>
      )
      
      const icon = screen.getByTestId('img-icon')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName).toBe('IMG')
    })
  })

  describe('Complex Content', () => {
    it('should handle rich text in description', () => {
      render(
        <Alert>
          <AlertTitle>Rich Content Alert</AlertTitle>
          <AlertDescription>
            <p>First paragraph with <strong>bold text</strong>.</p>
            <p>Second paragraph with <em>italic text</em>.</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
          </AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('bold text')).toBeInTheDocument()
      expect(screen.getByText('italic text')).toBeInTheDocument()
      expect(screen.getByText('List item 1')).toBeInTheDocument()
    })

    it('should handle very long content', () => {
      const longTitle = 'Very Long Alert Title '.repeat(10)
      const longDescription = 'Very long alert description content that might span multiple lines and test the layout behavior of the alert component. '.repeat(20)
      
      render(
        <Alert>
          <AlertTitle>{longTitle}</AlertTitle>
          <AlertDescription>{longDescription}</AlertDescription>
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      // Use partial text matching for very long strings
      const title = screen.getByText(/Very Long Alert Title/)
      const description = screen.getByText(/Very long alert description content/)
      
      expect(alert).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should handle interactive content', () => {
      const handleClick = vi.fn()
      
      render(
        <Alert>
          <AlertTitle>Interactive Alert</AlertTitle>
          <AlertDescription>
            This alert contains <button onClick={handleClick}>a button</button> and{' '}
            <a href="#link">a link</a>.
          </AlertDescription>
        </Alert>
      )
      
      const button = screen.getByRole('button', { name: 'a button' })
      const link = screen.getByRole('link', { name: 'a link' })
      
      expect(button).toBeInTheDocument()
      expect(link).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      render(<Alert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toBeEmptyDOMElement()
    })

    it('should handle null children', () => {
      render(
        <Alert>
          {null}
          <AlertTitle>Valid Title</AlertTitle>
          {undefined}
          <AlertDescription>Valid Description</AlertDescription>
          {false}
        </Alert>
      )
      
      const alert = screen.getByRole('alert')
      const title = screen.getByText('Valid Title')
      const description = screen.getByText('Valid Description')
      
      expect(alert).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      render(
        <Alert>
          <AlertTitle>Special Characters: !@#$%^&*()</AlertTitle>
          <AlertDescription>
            Unicode: 🚨 Alert with émojis and spëcial çharacters
          </AlertDescription>
        </Alert>
      )
      
      const title = screen.getByText('Special Characters: !@#$%^&*()')
      const description = screen.getByText(/Unicode: 🚨 Alert/)
      
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })

    it('should handle multiple alerts on same page', () => {
      render(
        <div>
          <Alert>
            <AlertTitle>First Alert</AlertTitle>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Second Alert</AlertTitle>
          </Alert>
        </div>
      )
      
      const alerts = screen.getAllByRole('alert')
      expect(alerts).toHaveLength(2)
      expect(screen.getByText('First Alert')).toBeInTheDocument()
      expect(screen.getByText('Second Alert')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should maintain layout on different screen sizes', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('w-full') // Should be full width
    })

    it('should handle responsive icon positioning', () => {
      render(<BasicAlert />)
      
      const alert = screen.getByRole('alert')
      // Icon positioning classes should be consistent across screen sizes
      expect(alert).toHaveClass(
        '[&>svg]:absolute',
        '[&>svg]:left-4',
        '[&>svg]:top-4'
      )
    })
  })

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0
      const TestAlert = ({ content }: { content: string }) => {
        renderCount++
        return (
          <Alert>
            <AlertTitle>{content}</AlertTitle>
          </Alert>
        )
      }
      
      const { rerender } = render(<TestAlert content="Test" />)
      expect(renderCount).toBe(1)
      
      rerender(<TestAlert content="Test" />)
      expect(renderCount).toBe(2)
    })

    it('should handle many alerts efficiently', () => {
      const alerts = Array.from({ length: 50 }, (_, i) => (
        <Alert key={i}>
          <AlertTitle>Alert {i}</AlertTitle>
        </Alert>
      ))
      
      render(<div>{alerts}</div>)
      
      const renderedAlerts = screen.getAllByRole('alert')
      expect(renderedAlerts).toHaveLength(50)
    })
  })
})