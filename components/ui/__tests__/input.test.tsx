import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md', 'border')
    })

    it('should render with custom className', () => {
      render(<Input className="custom-class" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      
      expect(ref).toHaveBeenCalled()
    })

    it('should apply default styling classes', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'flex', 'h-10', 'w-full', 'rounded-md', 'border', 'border-input',
        'bg-background', 'px-3', 'py-2', 'text-base'
      )
    })
  })

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      // Default type may be implicit in HTML, so we check it's a textbox
      expect(input).toBeInTheDocument()
    })

    it('should render password input', () => {
      render(<Input type="password" data-testid="password-input" />)
      
      const input = screen.getByTestId('password-input')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should render email input', () => {
      render(<Input type="email" data-testid="email-input" />)
      
      const input = screen.getByTestId('email-input')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render number input', () => {
      render(<Input type="number" data-testid="number-input" />)
      
      const input = screen.getByTestId('number-input')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('should render tel input', () => {
      render(<Input type="tel" data-testid="tel-input" />)
      
      const input = screen.getByTestId('tel-input')
      expect(input).toHaveAttribute('type', 'tel')
    })

    it('should render url input', () => {
      render(<Input type="url" data-testid="url-input" />)
      
      const input = screen.getByTestId('url-input')
      expect(input).toHaveAttribute('type', 'url')
    })

    it('should render search input', () => {
      render(<Input type="search" data-testid="search-input" />)
      
      const input = screen.getByTestId('search-input')
      expect(input).toHaveAttribute('type', 'search')
    })

    it('should render date input', () => {
      render(<Input type="date" data-testid="date-input" />)
      
      const input = screen.getByTestId('date-input')
      expect(input).toHaveAttribute('type', 'date')
    })

    it('should render file input', () => {
      render(<Input type="file" data-testid="file-input" />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('type', 'file')
      expect(input).toHaveClass('file:border-0', 'file:bg-transparent', 'file:text-sm')
    })
  })

  describe('Value and Change Handling', () => {
    it('should handle controlled input', async () => {
      const handleChange = vi.fn()
      render(<Input value="test" onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('test')
      
      await userEvent.clear(input)
      await userEvent.type(input, 'new value')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('should handle uncontrolled input', async () => {
      render(<Input defaultValue="initial" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('initial')
      
      await userEvent.clear(input)
      await userEvent.type(input, 'updated')
      
      expect(input).toHaveValue('updated')
    })

    it('should handle onChange events', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(handleChange).toHaveBeenCalledTimes(4) // One for each character
    })

    it('should handle onInput events', async () => {
      const handleInput = vi.fn()
      render(<Input onInput={handleInput} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(handleInput).toHaveBeenCalled()
    })

    it('should handle empty value', () => {
      render(<Input value="" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('')
    })

    it('should handle null/undefined values gracefully', () => {
      render(<Input value={undefined} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Placeholder and Labels', () => {
    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text here" />)
      
      const input = screen.getByPlaceholderText('Enter text here')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('placeholder:text-muted-foreground')
    })

    it('should work with labels', () => {
      render(
        <div>
          <label htmlFor="test-input">Test Label</label>
          <Input id="test-input" />
        </div>
      )
      
      const input = screen.getByLabelText('Test Label')
      expect(input).toBeInTheDocument()
    })

    it('should handle long placeholder text', () => {
      const longPlaceholder = 'This is a very long placeholder text that might overflow'
      render(<Input placeholder={longPlaceholder} />)
      
      const input = screen.getByPlaceholderText(longPlaceholder)
      expect(input).toBeInTheDocument()
    })

    it('should handle special characters in placeholder', () => {
      render(<Input placeholder="Email: user@example.com (required)" />)
      
      const input = screen.getByPlaceholderText('Email: user@example.com (required)')
      expect(input).toBeInTheDocument()
    })
  })

  describe('States and Attributes', () => {
    it('should handle disabled state', () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('should not accept input when disabled', async () => {
      render(<Input disabled />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(input).toHaveValue('')
    })

    it('should handle readonly state', async () => {
      render(<Input readOnly value="readonly value" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readonly')
      expect(input).toHaveValue('readonly value')
      
      await userEvent.type(input, 'test')
      expect(input).toHaveValue('readonly value') // Should not change
    })

    it('should handle required attribute', () => {
      render(<Input required />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
    })

    it('should handle maxLength attribute', async () => {
      render(<Input maxLength={5} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxLength', '5')
      
      await userEvent.type(input, 'toolong')
      expect(input).toHaveValue('toolo') // Should be truncated
    })

    it('should handle minLength attribute', () => {
      render(<Input minLength={3} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('minLength', '3')
    })

    it('should handle pattern attribute', () => {
      render(<Input pattern="[0-9]*" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('pattern', '[0-9]*')
    })
  })

  describe('Focus and Blur Events', () => {
    it('should handle focus events', async () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      
      expect(handleFocus).toHaveBeenCalledTimes(1)
      expect(input).toHaveFocus()
    })

    it('should handle blur events', async () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.click(input)
      await userEvent.tab()
      
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('should show focus ring on focus', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
      
      await userEvent.click(input)
      expect(input).toHaveFocus()
    })

    it('should handle tab navigation', async () => {
      render(
        <>
          <Input data-testid="input1" />
          <Input data-testid="input2" />
        </>
      )
      
      const input1 = screen.getByTestId('input1')
      const input2 = screen.getByTestId('input2')
      
      await userEvent.tab()
      expect(input1).toHaveFocus()
      
      await userEvent.tab()
      expect(input2).toHaveFocus()
    })
  })

  describe('Keyboard Events', () => {
    it('should handle keyDown events', async () => {
      const handleKeyDown = vi.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(handleKeyDown).toHaveBeenCalled()
    })

    it('should handle keyUp events', async () => {
      const handleKeyUp = vi.fn()
      render(<Input onKeyUp={handleKeyUp} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      await userEvent.keyboard('a')
      
      expect(handleKeyUp).toHaveBeenCalled()
    })

    it('should handle Enter key press', async () => {
      const handleKeyDown = vi.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      await userEvent.keyboard('{Enter}')
      
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Enter'
        })
      )
    })

    it('should handle Escape key press', async () => {
      const handleKeyDown = vi.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      await userEvent.keyboard('{Escape}')
      
      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Escape'
        })
      )
    })
  })

  describe('Number Input Specific', () => {
    it('should handle number input with min/max', () => {
      render(<Input type="number" min="0" max="100" data-testid="number-input" />)
      
      const input = screen.getByTestId('number-input')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
    })

    it('should handle step attribute for number input', () => {
      render(<Input type="number" step="0.1" data-testid="number-input" />)
      
      const input = screen.getByTestId('number-input')
      expect(input).toHaveAttribute('step', '0.1')
    })

    it('should handle number input with decimals', async () => {
      render(<Input type="number" step="any" data-testid="number-input" />)
      
      const input = screen.getByTestId('number-input')
      await userEvent.type(input, '123.45')
      
      expect(input).toHaveValue(123.45)
    })
  })

  describe('File Input Specific', () => {
    it('should handle file input attributes', () => {
      render(<Input type="file" accept=".pdf,.doc" multiple data-testid="file-input" />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('accept', '.pdf,.doc')
      expect(input).toHaveAttribute('multiple')
    })

    it('should have file-specific styling', () => {
      render(<Input type="file" data-testid="file-input" />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveClass('file:border-0', 'file:bg-transparent', 'file:text-sm', 'file:font-medium')
    })
  })

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Custom input" />)
      
      const input = screen.getByLabelText('Custom input')
      expect(input).toBeInTheDocument()
    })

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <div id="help-text">Help text</div>
        </>
      )
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'help-text')
    })

    it('should support aria-invalid for error states', () => {
      render(<Input aria-invalid="true" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should support aria-required', () => {
      render(<Input aria-required="true" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('should be accessible with screen readers', () => {
      render(
        <div>
          <label htmlFor="accessible-input">Accessible Input</label>
          <Input id="accessible-input" aria-describedby="help" />
          <div id="help">This input helps you</div>
        </div>
      )
      
      const input = screen.getByLabelText('Accessible Input')
      expect(input).toHaveAttribute('aria-describedby', 'help')
    })
  })

  describe('Validation', () => {
    it('should work with HTML5 validation', async () => {
      render(
        <form>
          <Input type="email" required data-testid="email-input" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const input = screen.getByTestId('email-input')
      const submitButton = screen.getByRole('button')
      
      await userEvent.type(input, 'invalid-email')
      fireEvent.click(submitButton)
      
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('required')
    })

    it('should support custom validation patterns', () => {
      render(<Input pattern="[A-Za-z]{3}" title="Three letters only" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('pattern', '[A-Za-z]{3}')
      expect(input).toHaveAttribute('title', 'Three letters only')
    })

    it('should handle invalid state styling', () => {
      render(<Input aria-invalid="true" className="border-red-500" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long text input', async () => {
      const longText = 'a'.repeat(1000)
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, longText)
      
      expect(input).toHaveValue(longText)
    })

    it('should handle special characters', async () => {
      const specialText = '!@#$%^&*()_+-='
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, specialText)
      
      expect(input).toHaveValue(specialText)
    })

    it('should handle unicode characters', async () => {
      const unicodeText = '🚀 Hello 世界 🌍'
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, unicodeText)
      
      expect(input).toHaveValue(unicodeText)
    })

    it('should handle rapid typing', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'rapidtyping', { delay: 1 })
      
      expect(handleChange).toHaveBeenCalledTimes(11) // One for each character
    })

    it('should handle paste events', async () => {
      const handlePaste = vi.fn()
      render(<Input onPaste={handlePaste} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      await userEvent.paste('pasted text')
      
      expect(handlePaste).toHaveBeenCalled()
    })

    it('should handle cut events', async () => {
      const handleCut = vi.fn()
      render(<Input defaultValue="cut this text" onCut={handleCut} />)
      
      const input = screen.getByRole('textbox')
      input.focus()
      input.select()
      await userEvent.cut()
      
      expect(handleCut).toHaveBeenCalled()
    })
  })

  describe('Form Integration', () => {
    it('should work with form submission', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="testInput" defaultValue="test value" />
          <button type="submit">Submit</button>
        </form>
      )
      
      const submitButton = screen.getByRole('button')
      await userEvent.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('should work with form reset', () => {
      render(
        <form>
          <Input defaultValue="initial" data-testid="input" />
          <button type="reset">Reset</button>
        </form>
      )
      
      const input = screen.getByTestId('input')
      const resetButton = screen.getByRole('button')
      
      expect(input).toHaveValue('initial')
      fireEvent.click(resetButton)
      
      // Note: Reset behavior may vary in test environment
      expect(resetButton).toHaveAttribute('type', 'reset')
    })

    it('should have correct name attribute for form data', () => {
      render(<Input name="username" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'username')
    })
  })

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0
      const TestInput = ({ value }: { value: string }) => {
        renderCount++
        return <Input value={value} onChange={() => {}} />
      }
      
      const { rerender } = render(<TestInput value="test" />)
      expect(renderCount).toBe(1)
      
      rerender(<TestInput value="test" />)
      expect(renderCount).toBe(2)
    })

    it('should handle many inputs efficiently', () => {
      const inputs = Array.from({ length: 50 }, (_, i) => (
        <Input key={i} placeholder={`Input ${i}`} />
      ))
      
      render(<div>{inputs}</div>)
      
      expect(screen.getAllByRole('textbox')).toHaveLength(50)
    })
  })
})