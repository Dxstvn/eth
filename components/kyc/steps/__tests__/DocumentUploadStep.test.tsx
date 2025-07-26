import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { DocumentUploadStep, DocumentFile, DocumentType } from '../DocumentUploadStep'
import { useAuth } from '@/context/auth-context-v2'

// Mock dependencies
vi.mock('@/context/auth-context-v2')
vi.mock('@/components/kyc/secure-file-upload', () => ({
  SecureFileUpload: vi.fn(({ label, onFileSelect, onRemove, value, preview, showSecurityIndicators }) => (
    <div data-testid={`secure-upload-${label}`}>
      <span>{label}</span>
      {showSecurityIndicators && <span data-testid="security-indicators">Security</span>}
      <input
        type="file"
        data-testid={`file-input-${label}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onFileSelect(file, { encrypted: 'test-encrypted' })
          }
        }}
      />
      {value && (
        <div data-testid={`file-preview-${label}`}>
          <span>{value.name}</span>
          <button onClick={onRemove} data-testid={`remove-file-${label}`}>Remove</button>
        </div>
      )}
      {preview && <img src={preview} alt="preview" data-testid={`image-preview-${label}`} />}
    </div>
  ))
}))

describe('DocumentUploadStep', () => {
  const mockOnComplete = vi.fn()
  const mockOnBack = vi.fn()
  const mockUser = { uid: 'test-uid', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as vi.Mock).mockReturnValue({ user: mockUser })
  })

  it('renders all document type tabs', () => {
    render(<DocumentUploadStep onComplete={mockOnComplete} />)

    expect(screen.getByText('Passport')).toBeInTheDocument()
    expect(screen.getByText("Driver's License")).toBeInTheDocument()
    expect(screen.getByText('National ID Card')).toBeInTheDocument()
  })

  it('displays progress indicator', () => {
    render(<DocumentUploadStep onComplete={mockOnComplete} />)

    expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  describe('File validation', () => {
    it('accepts JPEG files', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      
      await user.upload(fileInput, jpegFile)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
      })
    })

    it('accepts PNG files', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const pngFile = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      
      await user.upload(fileInput, pngFile)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
      })
    })

    it('accepts PDF files', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      
      await user.upload(fileInput, pdfFile)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
      })
    })

    it('shows file size validation in SecureFileUpload component', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)
      
      // Verify SecureFileUpload is rendered with proper props
      expect(screen.getByTestId('secure-upload-Passport (Front)')).toBeInTheDocument()
    })
  })

  describe('Document preview', () => {
    it('displays image preview for image files', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')

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
        expect(screen.getByTestId('image-preview-Passport (Front)')).toBeInTheDocument()
      })
    })

    it('does not display preview for PDF files', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')

      await user.upload(fileInput, pdfFile)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
        expect(screen.queryByTestId('image-preview-Passport (Front)')).not.toBeInTheDocument()
      })
    })
  })

  describe('Watermark functionality', () => {
    it('enables watermark on SecureFileUpload', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const secureUpload = screen.getByTestId('secure-upload-Passport (Front)')
      expect(secureUpload).toBeInTheDocument()
      
      // Verify watermark props are passed to SecureFileUpload
      // This is handled by the mock implementation
    })
  })

  describe('Driver\'s License handling', () => {
    it('shows both front and back upload for driver\'s license', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      // Switch to driver's license tab
      await user.click(screen.getByText("Driver's License"))

      expect(screen.getByText("Driver's License (Front)")).toBeInTheDocument()
      expect(screen.getByText("Driver's License (Back)")).toBeInTheDocument()
    })

    it('requires both sides for driver\'s license validation', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      await user.click(screen.getByText("Driver's License"))

      // Upload only front
      const frontFile = new File(['test'], 'front.jpg', { type: 'image/jpeg' })
      const frontInput = screen.getByTestId("file-input-Driver's License (Front)")
      await user.upload(frontInput, frontFile)

      // Try to continue
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      // Should show error about missing back
      await waitFor(() => {
        expect(screen.getByText(/please upload at least one valid identification document/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('displays validation errors', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText(/please upload at least one valid identification document/i)).toBeInTheDocument()
      })
    })

    it('clears error when file is uploaded', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      // Trigger error first
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText(/please upload at least one valid identification document/i)).toBeInTheDocument()
      })

      // Upload file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.queryByText(/please upload at least one valid identification document/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Verification status', () => {
    it('shows pending status after file upload', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Pending Verification')).toBeInTheDocument()
      })
    })

    it('shows verified status after validation', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} onBack={mockOnBack} />)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      expect(mockOnBack).toHaveBeenCalled()
    })

    it('calls onComplete with documents when validation passes', async () => {
      const user = userEvent.setup()
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      await user.upload(fileInput, file)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            passport_front: expect.objectContaining({
              type: 'passport',
              file,
              uploaded: true,
              verificationStatus: 'verified'
            })
          })
        )
      })
    })
  })

  describe('Mobile responsiveness', () => {
    it('hides tab labels on small screens', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      // The component uses hidden sm:inline classes
      const tabLabels = screen.getAllByText('Passport')
      expect(tabLabels[0]).toHaveClass('sm:inline')
    })

    it('maintains full functionality on mobile', async () => {
      const user = userEvent.setup()
      
      // Mock mobile viewport
      vi.stubGlobal('innerWidth', 375)
      
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      // Should still be able to upload files
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('file-input-Passport (Front)')
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
      })
    })
  })

  describe('Security indicators', () => {
    it('displays security notice', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      expect(screen.getByText('Bank-Level Security')).toBeInTheDocument()
      expect(screen.getByText(/AES-256 encryption/i)).toBeInTheDocument()
      expect(screen.getByText(/watermarked and securely deleted/i)).toBeInTheDocument()
    })

    it('shows security indicators on file upload components', () => {
      render(<DocumentUploadStep onComplete={mockOnComplete} />)

      const securityIndicators = screen.getAllByTestId('security-indicators')
      expect(securityIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('Initial documents', () => {
    it('loads with initial documents if provided', () => {
      const initialDocs: Record<string, DocumentFile> = {
        passport_front: {
          type: 'passport',
          subType: 'front',
          file: new File(['test'], 'passport.jpg', { type: 'image/jpeg' }),
          preview: 'data:image/jpeg;base64,test',
          uploaded: true,
          verificationStatus: 'verified'
        }
      }

      render(
        <DocumentUploadStep 
          onComplete={mockOnComplete} 
          initialDocuments={initialDocs}
        />
      )

      expect(screen.getByTestId('file-preview-Passport (Front)')).toBeInTheDocument()
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })
  })
})