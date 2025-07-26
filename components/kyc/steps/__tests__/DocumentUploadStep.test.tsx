import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUploadStep } from '../DocumentUploadStep'
import { useAuth } from '@/context/auth-context-v2'
import { performOCR, validateOCRResult } from '@/lib/services/mock-ocr-service'
import { act } from 'react-dom/test-utils'

// Mock dependencies
jest.mock('@/context/auth-context-v2')
jest.mock('@/lib/services/mock-ocr-service')
jest.mock('@/components/kyc/secure-file-upload', () => ({
  SecureFileUpload: ({ label, onFileSelect, onRemove, value, preview, ...props }: any) => (
    <div data-testid={`secure-upload-${props.id}`}>
      <label>{label}</label>
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

describe('DocumentUploadStep', () => {
  const mockOnComplete = jest.fn()
  const mockOnBack = jest.fn()
  const mockPerformOCR = performOCR as jest.MockedFunction<typeof performOCR>
  const mockValidateOCRResult = validateOCRResult as jest.MockedFunction<typeof validateOCRResult>
  const user = userEvent.setup()

  // Helper to create a mock file
  const createMockFile = (name: string, type: string = 'image/png') => {
    const file = new File(['test'], name, { type })
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB
    return file
  }

  // Helper to create a mock FileReader
  const mockFileReader = () => {
    const reader = {
      readAsDataURL: jest.fn(),
      onloadend: null as any,
      result: 'data:image/png;base64,mock-image-data'
    }
    jest.spyOn(window, 'FileReader').mockImplementation(() => reader as any)
    return reader
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user-123' }
    })

    mockPerformOCR.mockResolvedValue({
      success: true,
      confidence: 95,
      extractedData: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        documentNumber: 'P123456789',
        expiryDate: '2030-12-31',
        nationality: 'USA',
        documentType: 'passport'
      },
      requiresManualReview: false
    })

    mockValidateOCRResult.mockReturnValue({
      isValid: true,
      issues: []
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders document type tabs', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      expect(screen.getByRole('tab', { name: /passport/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /driver's license/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /national id card/i })).toBeInTheDocument()
    })

    it('shows progress bar', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/upload progress/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('displays security notice', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/bank-level security/i)).toBeInTheDocument()
      expect(screen.getByText(/aes-256 encryption/i)).toBeInTheDocument()
    })

    it('shows tips for selected document type', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText(/tips for passport/i)).toBeInTheDocument()
      expect(screen.getByText(/ensure photo page is clearly visible/i)).toBeInTheDocument()
    })

    it('renders back button when onBack prop is provided', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} onBack={mockOnBack} />)
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Document Type Selection', () => {
    it('switches between document types', async () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      // Initially shows passport
      expect(screen.getByText(/passport \(front\)/i)).toBeInTheDocument()
      
      // Switch to driver's license
      await user.click(screen.getByRole('tab', { name: /driver's license/i }))
      expect(screen.getByText(/driver's license \(front\)/i)).toBeInTheDocument()
      expect(screen.getByText(/driver's license \(back\)/i)).toBeInTheDocument()
      
      // Switch to ID card
      await user.click(screen.getByRole('tab', { name: /national id card/i }))
      expect(screen.getByText(/national id card \(front\)/i)).toBeInTheDocument()
      expect(screen.getByText(/national id card \(back\)/i)).toBeInTheDocument()
    })

    it('shows correct number of upload fields for each document type', async () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      // Passport - only front
      expect(screen.getAllByRole('textbox')).toHaveLength(1)
      
      // Driver's license - front and back
      await user.click(screen.getByRole('tab', { name: /driver's license/i }))
      expect(screen.getAllByRole('textbox')).toHaveLength(2)
    })
  })

  describe('File Upload', () => {
    it('handles file selection', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        // Trigger FileReader onloadend
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('file-name-passport_front')).toHaveTextContent('passport.png')
        expect(screen.getByTestId('preview-passport_front')).toBeInTheDocument()
      })
    })

    it('handles file removal', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('file-name-passport_front')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('remove-passport_front'))
      
      expect(screen.queryByTestId('file-name-passport_front')).not.toBeInTheDocument()
    })

    it('updates progress when files are uploaded', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      expect(screen.getByText('0%')).toBeInTheDocument()
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      // For passport, only front is required, so it should be 100% with one file
      await waitFor(() => {
        expect(screen.queryByText('0%')).not.toBeInTheDocument()
      })
    })
  })

  describe('OCR Processing', () => {
    it('performs OCR on front document upload', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(mockPerformOCR).toHaveBeenCalledWith('passport', file)
      })
    })

    it('displays OCR processing indicator', async () => {
      const reader = mockFileReader()
      mockPerformOCR.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            confidence: 95,
            extractedData: {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              documentNumber: 'P123456789',
              expiryDate: '2030-12-31',
              nationality: 'USA',
              documentType: 'passport'
            },
            requiresManualReview: false
          }), 100)
        })
      })
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      expect(screen.getByText(/extracting document information/i)).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText(/extracting document information/i)).not.toBeInTheDocument()
      })
    })

    it('displays extracted data after successful OCR', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('Extracted Information')).toBeInTheDocument()
        expect(screen.getByText('John')).toBeInTheDocument()
        expect(screen.getByText('Doe')).toBeInTheDocument()
        expect(screen.getByText('P123456789')).toBeInTheDocument()
        expect(screen.getByText('95%')).toBeInTheDocument() // Confidence score
      })
    })

    it('shows error when OCR fails', async () => {
      const reader = mockFileReader()
      mockPerformOCR.mockResolvedValueOnce({
        success: false,
        confidence: 0,
        requiresManualReview: false
      })
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/failed to extract document information/i)).toBeInTheDocument()
      })
    })

    it('shows validation errors when OCR data is invalid', async () => {
      const reader = mockFileReader()
      mockValidateOCRResult.mockReturnValueOnce({
        isValid: false,
        issues: ['Document expired', 'Name mismatch']
      })
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/document expired, name mismatch/i)).toBeInTheDocument()
      })
    })

    it('shows manual review warning for low quality images', async () => {
      const reader = mockFileReader()
      mockPerformOCR.mockResolvedValueOnce({
        success: true,
        confidence: 65,
        extractedData: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          documentNumber: 'P123456789',
          expiryDate: '2030-12-31',
          nationality: 'USA',
          documentType: 'passport'
        },
        requiresManualReview: true
      })
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/image quality is low/i)).toBeInTheDocument()
        expect(screen.getByText(/please review and correct/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Editing', () => {
    it('allows editing extracted data', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument()
      })
      
      // Click edit button for first name
      const editButtons = screen.getAllByRole('button', { name: '' })
      const firstNameEditButton = editButtons.find(btn => 
        btn.closest('div')?.textContent?.includes('First Name')
      )
      
      await user.click(firstNameEditButton!)
      
      // Edit field should appear
      const editInput = screen.getByDisplayValue('John')
      await user.clear(editInput)
      await user.type(editInput, 'Jane')
      
      // Click check button to save
      const checkButtons = screen.getAllByRole('button')
      const checkButton = checkButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('h-3')
      )
      await user.click(checkButton!)
      
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
  })

  describe('Document Validation', () => {
    it('validates that at least one document is uploaded', async () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()
      
      // Upload a file
      const reader = mockFileReader()
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled()
      })
    })

    it('requires both sides for driver license and ID card', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      // Switch to driver's license
      await user.click(screen.getByRole('tab', { name: /driver's license/i }))
      
      // Upload only front
      const frontFile = createMockFile('license-front.png')
      const frontInput = screen.getByTestId('file-input-drivers_license_front')
      
      await act(async () => {
        fireEvent.change(frontInput, { target: { files: [frontFile] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      // Click continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please upload at least one valid identification document/i)).toBeInTheDocument()
      })
    })

    it('shows verification status badges', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('Pending Verification')).toBeInTheDocument()
      })
      
      // Click continue to validate
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument()
      })
    })

    it('calls onComplete with validated documents', async () => {
      const reader = mockFileReader()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument()
      })
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            passport_front: expect.objectContaining({
              type: 'passport',
              file: file,
              uploaded: true,
              verificationStatus: 'verified',
              ocrResult: expect.objectContaining({
                success: true,
                confidence: 95
              })
            })
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('handles OCR processing errors gracefully', async () => {
      const reader = mockFileReader()
      mockPerformOCR.mockRejectedValueOnce(new Error('OCR service unavailable'))
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file = createMockFile('passport.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred while processing the document/i)).toBeInTheDocument()
      })
    })

    it('clears error when new file is selected', async () => {
      const reader = mockFileReader()
      mockPerformOCR.mockRejectedValueOnce(new Error('OCR failed'))
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      const file1 = createMockFile('passport1.png')
      const fileInput = screen.getByTestId('file-input-passport_front')
      
      // First upload fails
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file1] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument()
      })
      
      // Remove file
      await user.click(screen.getByTestId('remove-passport_front'))
      
      // Second upload succeeds
      mockPerformOCR.mockResolvedValueOnce({
        success: true,
        confidence: 95,
        extractedData: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          documentNumber: 'P123456789',
          expiryDate: '2030-12-31',
          nationality: 'USA',
          documentType: 'passport'
        },
        requiresManualReview: false
      })
      
      const file2 = createMockFile('passport2.png')
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file2] } })
        if (reader.onloadend) {
          reader.onloadend({} as any)
        }
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/an error occurred/i)).not.toBeInTheDocument()
        expect(screen.getByText('John')).toBeInTheDocument()
      })
    })
  })

  describe('Initial Documents', () => {
    it('displays initial documents when provided', () => {
      const initialDocs = {
        passport_front: {
          type: 'passport' as const,
          subType: 'front',
          file: createMockFile('existing-passport.png'),
          preview: 'data:image/png;base64,existing',
          uploaded: true,
          verificationStatus: 'verified' as const
        }
      }
      
      render(
        <DocumentUploadStep 
          onComplete={mockOnComplete} 
          initialDocuments={initialDocs}
        />
      )
      
      expect(screen.getByTestId('file-name-passport_front')).toHaveTextContent('existing-passport.png')
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })
  })
})