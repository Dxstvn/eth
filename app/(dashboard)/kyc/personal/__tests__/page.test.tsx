import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import KYCPersonalPage from '../page'
import { useAuth } from '@/context/auth-context-v2'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('next/navigation')
vi.mock('../../utils/encryption-helpers', () => ({
  useKYCEncryption: () => ({
    initialize: vi.fn(),
    encryptFormData: vi.fn().mockResolvedValue({
      fullName: { data: 'encrypted', salt: 'salt', iv: 'iv' },
      ssn: { data: 'encrypted', salt: 'salt', iv: 'iv' },
    }),
    isInitialized: vi.fn().mockReturnValue(true),
  }),
  KYCEncryptionUtils: {
    maskSensitiveData: vi.fn((value) => value.replace(/./g, '*')),
    validateField: vi.fn().mockReturnValue(true),
  },
}))

describe('KYCPersonalPage', () => {
  const mockPush = vi.fn()
  const mockUser = { uid: 'test-uid', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({ user: mockUser })
    ;(useRouter as any).mockReturnValue({ push: mockPush })
  })

  it('renders all form fields correctly', () => {
    render(<KYCPersonalPage />)

    // Personal info fields
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/middle name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/social security number/i)).toBeInTheDocument()
    
    // Contact fields
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    
    // Employment fields
    expect(screen.getByLabelText(/occupation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/annual income range/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/primary source of funds/i)).toBeInTheDocument()
  })

  it('shows encryption indicators', () => {
    render(<KYCPersonalPage />)

    expect(screen.getByText(/256-bit Encryption/i)).toBeInTheDocument()
    expect(screen.getByText(/PII Protected/i)).toBeInTheDocument()
  })

  it('validates SSN format', async () => {
    const user = userEvent.setup()
    render(<KYCPersonalPage />)

    const ssnInput = screen.getByPlaceholderText(/XXX-XX-XXXX/i)
    await user.type(ssnInput, '123456789')
    
    // Should be formatted as 123-45-6789
    expect(ssnInput).toHaveValue('123-45-6789')
  })

  it('toggles SSN visibility', async () => {
    const user = userEvent.setup()
    render(<KYCPersonalPage />)

    const ssnInput = screen.getByPlaceholderText(/XXX-XX-XXXX/i)
    expect(ssnInput).toHaveAttribute('type', 'password')

    // Find and click the visibility toggle
    const toggleButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('button')
    if (toggleButton) {
      await user.click(toggleButton)
      expect(ssnInput).toHaveAttribute('type', 'text')
    }
  })

  it('formats phone number correctly', async () => {
    const user = userEvent.setup()
    render(<KYCPersonalPage />)

    const phoneInput = screen.getByPlaceholderText(/\+1 \(555\) 123-4567/i)
    await user.type(phoneInput, '15551234567')
    
    // Should be formatted
    expect(phoneInput).toHaveValue('+1 (555) 123-4567')
  })

  it('enables auto-save by default', () => {
    render(<KYCPersonalPage />)

    const autoSaveCheckbox = screen.getByLabelText(/enable auto-save/i)
    expect(autoSaveCheckbox).toBeChecked()
  })

  it('validates age requirement', async () => {
    const user = userEvent.setup()
    render(<KYCPersonalPage />)

    const dobInput = screen.getByLabelText(/date of birth/i)
    
    // Set date to make user under 18
    const underageDate = new Date()
    underageDate.setFullYear(underageDate.getFullYear() - 17)
    await user.type(dobInput, underageDate.toISOString().split('T')[0])

    const submitButton = screen.getByRole('button', { name: /continue/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/must be at least 18 years old/i)).toBeInTheDocument()
    })
  })

  it('submits form with encrypted data', async () => {
    const user = userEvent.setup()
    render(<KYCPersonalPage />)

    // Fill out required fields
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
    await user.type(screen.getByPlaceholderText(/XXX-XX-XXXX/i), '123456789')
    
    // Select dropdowns
    await user.click(screen.getByText(/select nationality/i))
    await user.click(screen.getByText('United States'))
    
    await user.click(screen.getByText(/select country/i))
    await user.click(screen.getAllByText('United States')[1])

    await user.type(screen.getByLabelText(/residential address/i), '123 Main St')
    await user.type(screen.getByLabelText(/city/i), 'New York')
    
    await user.click(screen.getByText(/select state/i))
    await user.click(screen.getByText('New York'))
    
    await user.type(screen.getByLabelText(/postal/i), '10001')
    await user.type(screen.getByPlaceholderText(/\+1 \(555\) 123-4567/i), '15551234567')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/occupation/i), 'Engineer')
    
    await user.click(screen.getByText(/select income range/i))
    await user.click(screen.getByText('$50,000 - $75,000'))
    
    await user.click(screen.getByText(/select source/i))
    await user.click(screen.getByText('Employment/Salary'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: /continue/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/kyc/documents')
    })
  })
})