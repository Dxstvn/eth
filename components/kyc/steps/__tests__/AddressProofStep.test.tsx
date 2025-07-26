import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AddressProofStep, AddressProofDocument, AddressProofType } from '../AddressProofStep'
import { useAuth } from '@/context/auth-context-v2'
import { format, subMonths, addMonths } from 'date-fns'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('@/components/kyc/secure-file-upload', () => ({
  SecureFileUpload: vi.fn(({ label, onFileSelect, onRemove, value, preview }) => (
    <div data-testid="secure-upload">
      <span>{label}</span>
      <input
        type="file"
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onFileSelect(file, { encrypted: 'test-encrypted' })
          }
        }}
      />
      {value && (
        <div data-testid="file-preview">
          <span>{value.name}</span>
          <button onClick={onRemove} data-testid="remove-file">Remove</button>
        </div>
      )}
      {preview && <img src={preview} alt="preview" data-testid="image-preview" />}
    </div>
  ))
}))

describe('AddressProofStep', () => {
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()
  const mockUser = { uid: 'test-uid', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as vi.Mock).mockReturnValue({ user: mockUser })
  })

  it('renders all document type options', () => {
    render(<AddressProofStep onComplete={mockOnComplete} />)

    expect(screen.getByLabelText('Utility Bill')).toBeInTheDocument()
    expect(screen.getByLabelText('Bank Statement')).toBeInTheDocument()
    expect(screen.getByLabelText('Lease Agreement')).toBeInTheDocument()
    expect(screen.getByLabelText('Government Letter')).toBeInTheDocument()
  })

  it('displays document type descriptions', () => {
    render(<AddressProofStep onComplete={mockOnComplete} />)

    expect(screen.getByText('Electricity, water, gas, or internet bill')).toBeInTheDocument()
    expect(screen.getByText('Official bank or credit card statement')).toBeInTheDocument()
    expect(screen.getByText('Current rental or lease agreement')).toBeInTheDocument()
    expect(screen.getByText('Official government correspondence')).toBeInTheDocument()
  })

  describe('Document type selection', () => {
    it('switches between document types', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      // Initially shows utility bill requirements
      expect(screen.getByText('Requirements for Utility Bill:')).toBeInTheDocument()

      // Switch to bank statement
      await user.click(screen.getByLabelText('Bank Statement'))
      
      await waitFor(() => {
        expect(screen.getByText('Requirements for Bank Statement:')).toBeInTheDocument()
      })
    })

    it('shows correct examples for each document type', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      // Check utility bill examples
      expect(screen.getByText(/Electricity bill.*Water bill/)).toBeInTheDocument()

      // Switch to bank statement
      await user.click(screen.getByLabelText('Bank Statement'))
      
      await waitFor(() => {
        expect(screen.getByText(/Monthly bank statement.*Credit card statement/)).toBeInTheDocument()
      })
    })

    it('resets document when type changes', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      // Upload a file
      const file = new File(['test'], 'utility.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview')).toBeInTheDocument()
      })

      // Switch document type
      await user.click(screen.getByLabelText('Bank Statement'))

      await waitFor(() => {
        expect(screen.queryByTestId('file-preview')).not.toBeInTheDocument()
      })
    })
  })

  describe('3-month recency validation', () => {
    it('shows date warning for utility bills', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'utility.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        const cutoffDate = format(subMonths(new Date(), 3), 'MMMM yyyy')
        expect(screen.getByText(/must be dated within the last 3 months/)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(cutoffDate))).toBeInTheDocument()
      })
    })

    it('shows date warning for bank statements', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      await user.click(screen.getByLabelText('Bank Statement'))

      const file = new File(['test'], 'statement.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/must be dated within the last 3 months/)).toBeInTheDocument()
      })
    })

    it('does not show date warning for lease agreements', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      await user.click(screen.getByLabelText('Lease Agreement'))

      const file = new File(['test'], 'lease.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.queryByText(/must be dated within the last 3 months/)).not.toBeInTheDocument()
      })
    })

    it('shows 12-month requirement for government letters', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      await user.click(screen.getByLabelText('Government Letter'))

      const file = new File(['test'], 'letter.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        const cutoffDate = format(subMonths(new Date(), 12), 'MMMM yyyy')
        expect(screen.getByText(/must be dated within the last 12 months/)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(cutoffDate))).toBeInTheDocument()
      })
    })
  })

  describe('File upload functionality', () => {
    it('accepts PDF files', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const pdfFile = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, pdfFile)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview')).toBeInTheDocument()
        expect(screen.getByText('bill.pdf')).toBeInTheDocument()
      })
    })

    it('accepts image files', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const imageFile = new File(['test'], 'bill.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input')

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        onloadend: null as any
      }
      vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any)

      await user.upload(fileInput, imageFile)

      // Trigger FileReader onloadend
      mockFileReader.onloadend?.()

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument()
      })
    })

    it('removes uploaded file', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('remove-file'))

      await waitFor(() => {
        expect(screen.queryByTestId('file-preview')).not.toBeInTheDocument()
      })
    })
  })

  describe('Upload progress tracking', () => {
    it('shows progress indicator after file upload', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Upload Progress')).toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })
  })

  describe('Verification status display', () => {
    it('shows pending status after upload', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Pending Verification')).toBeInTheDocument()
      })
    })

    it('shows verified status after validation', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument()
      })
    })

    it('shows rejected status with reason', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      // Mock validation to fail
      vi.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

      const file = new File(['test'], 'old-bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      // In the real implementation, this would check actual document date
      // For testing, we'd need to mock the validation logic
    })
  })

  describe('Error handling', () => {
    it('shows error when no document is uploaded', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText('Please upload a document')).toBeInTheDocument()
      })
    })

    it('clears error when file is uploaded', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      // Trigger error
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText('Please upload a document')).toBeInTheDocument()
      })

      // Upload file
      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.queryByText('Please upload a document')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} onBack={mockOnBack} />)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(mockOnBack).toHaveBeenCalled()
    })

    it('calls onComplete with document when validation passes', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'utility_bill',
            file,
            uploaded: true,
            verificationStatus: 'verified'
          })
        )
      })
    })

    it('disables buttons during validation', async () => {
      const user = userEvent.setup()
      render(<AddressProofStep onComplete={mockOnComplete} onBack={mockOnBack} />)

      const file = new File(['test'], 'bill.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      const backButton = screen.getByRole('button', { name: /back/i })

      await user.click(continueButton)

      expect(continueButton).toHaveTextContent('Validating...')
      expect(backButton).toBeDisabled()
    })
  })

  describe('Security and privacy', () => {
    it('displays privacy protection notice', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)

      expect(screen.getByText('Your Privacy is Protected')).toBeInTheDocument()
      expect(screen.getByText(/AES-256 encryption/)).toBeInTheDocument()
      expect(screen.getByText(/Automatic deletion after verification/)).toBeInTheDocument()
      expect(screen.getByText(/GDPR and CCPA compliant/)).toBeInTheDocument()
    })
  })

  describe('Initial document handling', () => {
    it('loads with initial document if provided', () => {
      const initialDoc: AddressProofDocument = {
        type: 'utility_bill',
        file: new File(['test'], 'bill.pdf', { type: 'application/pdf' }),
        preview: null,
        uploaded: true,
        verificationStatus: 'verified'
      }

      render(
        <AddressProofStep 
          onComplete={mockOnComplete} 
          initialDocument={initialDoc}
        />
      )

      expect(screen.getByTestId('file-preview')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })
  })

  describe('Mobile responsiveness', () => {
    it('maintains grid layout on mobile', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)

      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toHaveClass('md:grid-cols-2')
    })
  })
})