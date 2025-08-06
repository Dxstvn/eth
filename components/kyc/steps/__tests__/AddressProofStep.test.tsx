import React from 'react'
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddressProofStep } from '../AddressProofStep'
import { useAuth } from '@/context/auth-context-v2'
import { format, subMonths } from 'date-fns'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('@/components/kyc/secure-file-upload', () => ({
  SecureFileUpload: ({ label, onFileSelect, onRemove, value, preview, description, ...props }: any) => (
    <div data-testid={`secure-upload-${props.id}`}>
      <label>{label}</label>
      {description && <p>{description}</p>}
      <input
        type="file"
        data-testid={`file-input-${props.id}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onFileSelect(file, { encrypted: 'mock-encrypted-data' })
          }
        }}
      />
      {value && (
        <div>
          <span data-testid={`file-name-${props.id}`}>{value.name}</span>
          <button
            data-testid={`remove-${props.id}`}
            onClick={() => onRemove()}
          >
            Remove
          </button>
        </div>
      )}
      {preview && <img data-testid={`preview-${props.id}`} src={preview} alt="Preview" />}
    </div>
  )
}))

describe('AddressProofStep', () => {
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()
  const user = userEvent.setup()

  // Helper to create a mock file
  const createMockFile = (name: string, type: string = 'image/png', lastModified?: number) => {
    const file = new File(['test'], name, { type, lastModified })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB
    return file
  }

  // Helper to create a mock FileReader
  const mockFileReader = () => {
    const reader = {
      readAsDataURL: vi.fn(),
      onloadend: null as any,
      result: 'data:image/png;base64,mock-image-data'
    }
    vi.spyOn(window, 'FileReader').mockImplementation(() => reader as any)
    return reader
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    ;(useAuth as any).mockReturnValue({
      user: { uid: 'test-user-123' }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders all address proof types', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      expect(screen.getByLabelText(/utility bill/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/bank statement/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/lease agreement/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/government letter/i)).toBeInTheDocument()
    })

    it('displays document type descriptions', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/electricity, water, gas, internet/i)).toBeInTheDocument()
      expect(screen.getByText(/official bank statement/i)).toBeInTheDocument()
      expect(screen.getByText(/signed rental or lease agreement/i)).toBeInTheDocument()
      expect(screen.getByText(/government correspondence/i)).toBeInTheDocument()
    })

    it('shows recency requirement alert', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/document requirements/i)).toBeInTheDocument()
      expect(screen.getByText(/must be issued within the last 3 months/i)).toBeInTheDocument()
    })

    it('displays security notice', () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/your privacy matters/i)).toBeInTheDocument()
      expect(screen.getByText(/documents are encrypted/i)).toBeInTheDocument()
    })

    it('renders back button when onBack prop is provided', () => {
      render(<AddressProofStep onComplete={mockOnComplete} onBack={mockOnBack} />)
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Document Type Selection', () => {
    it('selects document type', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      const utilityBillRadio = screen.getByLabelText(/utility bill/i)
      await user.click(utilityBillRadio)
      
      expect(utilityBillRadio).toBeChecked()
    })

    it('shows upload area only after selecting document type', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      expect(screen.queryByText(/upload your utility bill/i)).not.toBeInTheDocument()
      
      const utilityBillRadio = screen.getByLabelText(/utility bill/i)
      await user.click(utilityBillRadio)
      
      expect(screen.getByText(/upload your utility bill/i)).toBeInTheDocument()
    })

    it('changes upload area when different document type is selected', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select utility bill
      const utilityBillRadio = screen.getByLabelText(/utility bill/i)
      await user.click(utilityBillRadio)
      expect(screen.getByText(/upload your utility bill/i)).toBeInTheDocument()
      
      // Change to bank statement
      const bankStatementRadio = screen.getByLabelText(/bank statement/i)
      await user.click(bankStatementRadio)
      expect(screen.getByText(/upload your bank statement/i)).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('handles file selection', async () => {
      const reader = mockFileReader()
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByTestId('file-name-address-proof')).toHaveTextContent('utility-bill.pdf')
      })
    })

    it('handles image file with preview', async () => {
      const reader = mockFileReader()
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.png')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      // Trigger FileReader onloadend
      if (reader.onloadend) {
        reader.onloadend({} as any)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('preview-address-proof')).toBeInTheDocument()
      })
    })

    it('handles file removal', async () => {
      const reader = mockFileReader()
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type and upload file
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByTestId('file-name-address-proof')).toBeInTheDocument()
      })
      
      // Remove file
      await user.click(screen.getByTestId('remove-address-proof'))
      
      expect(screen.queryByTestId('file-name-address-proof')).not.toBeInTheDocument()
    })

    it('clears file when changing document type', async () => {
      const reader = mockFileReader()
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select utility bill and upload file
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByTestId('file-name-address-proof')).toBeInTheDocument()
      })
      
      // Change to bank statement
      await user.click(screen.getByLabelText(/bank statement/i))
      
      // File should be cleared
      expect(screen.queryByTestId('file-name-address-proof')).not.toBeInTheDocument()
    })
  })

  describe('Date Validation', () => {
    it('validates document recency', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      // Create a file that's 4 months old
      const fourMonthsAgo = subMonths(new Date(), 4).getTime()
      const file = createMockFile('old-utility-bill.pdf', 'application/pdf', fourMonthsAgo)
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      // Try to continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/document must be issued within the last 3 months/i)).toBeInTheDocument()
      })
    })

    it('accepts recent documents', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      // Create a file that's 1 month old
      const oneMonthAgo = subMonths(new Date(), 1).getTime()
      const file = createMockFile('recent-utility-bill.pdf', 'application/pdf', oneMonthAgo)
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      // Continue should work
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })

    it('shows issue date when file is uploaded', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const twoMonthsAgo = subMonths(new Date(), 2)
      const file = createMockFile('utility-bill.pdf', 'application/pdf', twoMonthsAgo.getTime())
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText(/issue date:/i)).toBeInTheDocument()
        expect(screen.getByText(format(twoMonthsAgo, 'MMM dd, yyyy'))).toBeInTheDocument()
      })
    })

    it('shows remaining validity days', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const twoMonthsAgo = subMonths(new Date(), 2)
      const file = createMockFile('utility-bill.pdf', 'application/pdf', twoMonthsAgo.getTime())
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText(/days remaining/i)).toBeInTheDocument()
      })
    })
  })

  describe('Document Validation', () => {
    it('requires document type selection', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()
    })

    it('requires file upload', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type but don't upload file
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please upload your address proof document/i)).toBeInTheDocument()
      })
    })

    it('validates and shows verification status', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type and upload file
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText(/pending verification/i)).toBeInTheDocument()
      })
      
      // Click continue to validate
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/verified/i)).toBeInTheDocument()
      })
    })

    it('calls onComplete with validated document', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select document type and upload file
      await user.click(screen.getByLabelText(/bank statement/i))
      
      const file = createMockFile('bank-statement.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'bank_statement',
            file: file,
            uploaded: true,
            verificationStatus: 'verified',
            encrypted: { encrypted: 'mock-encrypted-data' }
          })
        )
      })
    })
  })

  describe('Tips and Guidelines', () => {
    it('shows document-specific tips when type is selected', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select utility bill
      await user.click(screen.getByLabelText(/utility bill/i))
      expect(screen.getByText(/full name and address must be visible/i)).toBeInTheDocument()
      
      // Change to lease agreement
      await user.click(screen.getByLabelText(/lease agreement/i))
      expect(screen.getByText(/all pages must be included/i)).toBeInTheDocument()
    })

    it('displays accepted file formats', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      await user.click(screen.getByLabelText(/utility bill/i))
      
      expect(screen.getByText(/accepted formats.*pdf.*jpg.*png/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays validation errors', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Try to continue without selecting document type
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()
      
      // Select type but no file
      await user.click(screen.getByLabelText(/utility bill/i))
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please upload your address proof document/i)).toBeInTheDocument()
      })
    })

    it('clears error when file is uploaded', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select type and try to continue without file
      await user.click(screen.getByLabelText(/utility bill/i))
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please upload your address proof document/i)).toBeInTheDocument()
      })
      
      // Upload file
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.queryByText(/please upload your address proof document/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Initial Document', () => {
    it('displays initial document when provided', () => {
      const initialDoc = {
        type: 'utility_bill' as const,
        file: createMockFile('existing-bill.pdf', 'application/pdf'),
        preview: null,
        uploaded: true,
        verificationStatus: 'verified' as const,
        issueDate: subMonths(new Date(), 1)
      }
      
      render(
        <AddressProofStep 
          onComplete={mockOnComplete} 
          initialDocument={initialDoc}
        />
      )
      
      expect(screen.getByLabelText(/utility bill/i)).toBeChecked()
      expect(screen.getByTestId('file-name-address-proof')).toHaveTextContent('existing-bill.pdf')
      expect(screen.getByText(/verified/i)).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('disables continue button during validation', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} />)
      
      // Select type and upload file
      await user.click(screen.getByLabelText(/utility bill/i))
      
      const file = createMockFile('utility-bill.pdf', 'application/pdf')
      const fileInput = screen.getByTestId('file-input-address-proof')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      // Button should be disabled during validation
      expect(continueButton).toBeDisabled()
      expect(continueButton).toHaveTextContent(/validating/i)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })

    it('handles back button click', async () => {
      render(<AddressProofStep onComplete={mockOnComplete} onBack={mockOnBack} />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)
      
      expect(mockOnBack).toHaveBeenCalled()
    })
  })
})