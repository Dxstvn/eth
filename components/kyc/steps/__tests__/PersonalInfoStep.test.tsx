import React from 'react'
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonalInfoStep } from '../PersonalInfoStep'
import { useAuth } from '@/context/auth-context-v2'
import { useKYCEncryption } from '@/app/(dashboard)/kyc/utils/encryption-helpers'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('@/app/(dashboard)/kyc/utils/encryption-helpers')
vi.mock('next/navigation')

// Mock components
vi.mock('@/components/ui/masked-input', () => ({
  MaskedInput: ({ value, onChange, mask, ...props }: any) => (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="masked-input"
    />
  )
}))

vi.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, onAddressSelect, ...props }: any) => (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="address-autocomplete"
    />
  )
}))

describe('PersonalInfoStep', () => {
  const mockPush = vi.fn()
  const mockEncryptFormData = vi.fn()
  const mockInitializeEncryption = vi.fn()
  const mockIsInitialized = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    
    ;(useRouter as any).mockReturnValue({
      push: mockPush
    })
    
    ;(useAuth as any).mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    })
    
    ;(useKYCEncryption as any).mockReturnValue({
      initialize: mockInitializeEncryption,
      encryptFormData: mockEncryptFormData,
      isInitialized: mockIsInitialized
    })
    
    mockIsInitialized.mockReturnValue(true)
    mockEncryptFormData.mockResolvedValue({
      fullName: 'encrypted_fullname',
      dateOfBirth: 'encrypted_dob',
      ssn: 'encrypted_ssn',
      address: 'encrypted_address',
      phone: 'encrypted_phone',
      email: 'encrypted_email'
    })
    
    // Mock localStorage
    Storage.prototype.setItem = vi.fn()
    Storage.prototype.getItem = vi.fn()
    Storage.prototype.removeItem = vi.fn()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<PersonalInfoStep />)
      
      // Name fields
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/middle name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      
      // Personal info fields
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByText(/social security number/i)).toBeInTheDocument()
      
      // Location fields
      expect(screen.getByLabelText(/nationality/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/country of residence/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/residential address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/postal\/zip code/i)).toBeInTheDocument()
      
      // Contact fields
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      
      // Employment fields
      expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/employer/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/annual income range/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/primary source of funds/i)).toBeInTheDocument()
    })

    it('displays security badges', () => {
      render(<PersonalInfoStep />)
      
      expect(screen.getByText(/256-bit encryption/i)).toBeInTheDocument()
      expect(screen.getByText(/pii protected/i)).toBeInTheDocument()
    })

    it('prefills email from auth context', () => {
      render(<PersonalInfoStep />)
      
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
      expect(emailInput.value).toBe('test@example.com')
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      render(<PersonalInfoStep />)
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/you must be at least 18 years old/i)).toBeInTheDocument()
        expect(screen.getByText(/please enter a valid ssn/i)).toBeInTheDocument()
      })
    })

    it('validates SSN format', async () => {
      render(<PersonalInfoStep />)
      
      const ssnInput = screen.getByTestId('masked-input')
      await user.type(ssnInput, '123456789') // Invalid format
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid ssn/i)).toBeInTheDocument()
      })
    })

    it('validates age requirement', async () => {
      render(<PersonalInfoStep />)
      
      const dobInput = screen.getByLabelText(/date of birth/i)
      const futureDate = format(new Date(), 'yyyy-MM-dd')
      
      fireEvent.change(dobInput, { target: { value: futureDate } })
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/you must be at least 18 years old/i)).toBeInTheDocument()
      })
    })

    it('validates phone number format', async () => {
      render(<PersonalInfoStep />)
      
      const phoneInputs = screen.getAllByTestId('masked-input')
      const phoneInput = phoneInputs[1] // Second masked input is phone
      
      await user.type(phoneInput, '123') // Too short
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
      })
    })

    it('validates email format', async () => {
      render(<PersonalInfoStep />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Encryption', () => {
    it('initializes encryption on mount', async () => {
      mockIsInitialized.mockReturnValue(false)
      
      render(<PersonalInfoStep />)
      
      await waitFor(() => {
        expect(mockInitializeEncryption).toHaveBeenCalledWith('test-uid')
      })
    })

    it('encrypts sensitive data before submission', async () => {
      render(<PersonalInfoStep />)
      
      // Fill out form
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      
      const dobInput = screen.getByLabelText(/date of birth/i)
      fireEvent.change(dobInput, { target: { value: '1990-01-01' } })
      
      const ssnInput = screen.getByTestId('masked-input')
      await user.type(ssnInput, '123-45-6789')
      
      // Select dropdowns
      const nationalityButton = screen.getByRole('combobox', { name: /nationality/i })
      await user.click(nationalityButton)
      await user.click(screen.getByRole('option', { name: /united states/i }))
      
      // Fill remaining required fields
      await user.type(screen.getByLabelText(/residential address/i), '123 Main St')
      await user.type(screen.getByLabelText(/city/i), 'New York')
      
      const stateButton = screen.getByRole('combobox', { name: /state/i })
      await user.click(stateButton)
      await user.click(screen.getByRole('option', { name: /new york/i }))
      
      await user.type(screen.getByLabelText(/postal/i), '10001')
      
      const phoneInputs = screen.getAllByTestId('masked-input')
      await user.type(phoneInputs[1], '+1 (555) 123-4567')
      
      await user.type(screen.getByLabelText(/occupation/i), 'Engineer')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockEncryptFormData).toHaveBeenCalledWith({
          fullName: 'John  Doe',
          dateOfBirth: '1990-01-01',
          ssn: '123-45-6789',
          taxId: '123-45-6789',
          address: expect.stringContaining('123 Main St'),
          phone: expect.any(String),
          email: 'test@example.com'
        })
      })
    })

    it('shows encryption indicator for SSN field', async () => {
      render(<PersonalInfoStep />)
      
      const ssnInput = screen.getByTestId('masked-input')
      await user.type(ssnInput, '123-45-6789')
      
      await waitFor(() => {
        expect(screen.getByText(/encrypted with aes-256/i)).toBeInTheDocument()
      })
    })
  })

  describe('Auto-save', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('auto-saves form data after 2 seconds of inactivity', async () => {
      render(<PersonalInfoStep />)
      
      await user.type(screen.getByLabelText(/first name/i), 'John')
      
      // Fast-forward 2 seconds
      vi.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'kyc_personal_draft',
          expect.stringContaining('John')
        )
      })
    })

    it('displays last saved timestamp', async () => {
      render(<PersonalInfoStep />)
      
      await user.type(screen.getByLabelText(/first name/i), 'John')
      
      vi.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(screen.getByText(/auto-saved/i)).toBeInTheDocument()
      })
    })

    it('can disable auto-save', async () => {
      render(<PersonalInfoStep />)
      
      const autoSaveCheckbox = screen.getByLabelText(/enable auto-save/i)
      await user.click(autoSaveCheckbox)
      
      await user.type(screen.getByLabelText(/first name/i), 'John')
      
      vi.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(localStorage.setItem).not.toHaveBeenCalled()
      })
    })
  })

  describe('SSN Visibility Toggle', () => {
    it('toggles SSN visibility', async () => {
      render(<PersonalInfoStep />)
      
      const ssnInput = screen.getByTestId('masked-input') as HTMLInputElement
      expect(ssnInput.type).toBe('password')
      
      const toggleButton = screen.getByRole('button', { name: '' })
      await user.click(toggleButton)
      
      expect(ssnInput.type).toBe('text')
      
      await user.click(toggleButton)
      expect(ssnInput.type).toBe('password')
    })
  })

  describe('Form Submission', () => {
    it('navigates to documents page on successful submission', async () => {
      render(<PersonalInfoStep />)
      
      // Fill out all required fields
      await fillOutCompleteForm(user, screen)
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/kyc/documents')
      })
    })

    it('clears draft data after successful submission', async () => {
      render(<PersonalInfoStep />)
      
      await fillOutCompleteForm(user, screen)
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('kyc_personal_draft')
      })
    })

    it('displays error message on submission failure', async () => {
      mockEncryptFormData.mockRejectedValueOnce(new Error('Encryption failed'))
      
      render(<PersonalInfoStep />)
      
      await fillOutCompleteForm(user, screen)
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to save personal information/i)).toBeInTheDocument()
      })
    })

    it('disables submit button while submitting', async () => {
      render(<PersonalInfoStep />)
      
      await fillOutCompleteForm(user, screen)
      
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)
      
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent(/saving/i)
    })
  })

  describe('Country-specific behavior', () => {
    it('shows US states when United States is selected', async () => {
      render(<PersonalInfoStep />)
      
      const countryButton = screen.getByRole('combobox', { name: /country of residence/i })
      await user.click(countryButton)
      await user.click(screen.getByRole('option', { name: /united states/i }))
      
      const stateButton = screen.getByRole('combobox', { name: /state/i })
      await user.click(stateButton)
      
      expect(screen.getByRole('option', { name: /new york/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /california/i })).toBeInTheDocument()
    })

    it('shows Other option for non-US countries', async () => {
      render(<PersonalInfoStep />)
      
      const countryButton = screen.getByRole('combobox', { name: /country of residence/i })
      await user.click(countryButton)
      await user.click(screen.getByRole('option', { name: /canada/i }))
      
      const stateButton = screen.getByRole('combobox', { name: /state/i })
      await user.click(stateButton)
      
      expect(screen.getByRole('option', { name: /other/i })).toBeInTheDocument()
    })
  })
})

// Helper function to fill out complete form
async function fillOutCompleteForm(user: any, screen: any) {
  await user.type(screen.getByLabelText(/first name/i), 'John')
  await user.type(screen.getByLabelText(/last name/i), 'Doe')
  
  const dobInput = screen.getByLabelText(/date of birth/i)
  fireEvent.change(dobInput, { target: { value: '1990-01-01' } })
  
  const ssnInput = screen.getByTestId('masked-input')
  await user.type(ssnInput, '123-45-6789')
  
  const nationalityButton = screen.getByRole('combobox', { name: /nationality/i })
  await user.click(nationalityButton)
  await user.click(screen.getByRole('option', { name: /united states/i }))
  
  const countryButton = screen.getByRole('combobox', { name: /country of residence/i })
  await user.click(countryButton)
  await user.click(screen.getByRole('option', { name: /united states/i }))
  
  await user.type(screen.getByLabelText(/residential address/i), '123 Main St')
  await user.type(screen.getByLabelText(/city/i), 'New York')
  
  const stateButton = screen.getByRole('combobox', { name: /state/i })
  await user.click(stateButton)
  await user.click(screen.getByRole('option', { name: /new york/i }))
  
  await user.type(screen.getByLabelText(/postal/i), '10001')
  
  const phoneInputs = screen.getAllByTestId('masked-input')
  await user.type(phoneInputs[1], '15551234567')
  
  await user.type(screen.getByLabelText(/occupation/i), 'Engineer')
  
  const incomeButton = screen.getByRole('combobox', { name: /annual income/i })
  await user.click(incomeButton)
  await user.click(screen.getByRole('option', { name: /50,000 - \$75,000/i }))
  
  const fundsButton = screen.getByRole('combobox', { name: /primary source/i })
  await user.click(fundsButton)
  await user.click(screen.getByRole('option', { name: /employment/i }))
}