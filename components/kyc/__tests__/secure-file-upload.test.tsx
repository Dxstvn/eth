import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SecureFileUpload } from '../secure-file-upload'
import { KYCFieldType } from '@/lib/security/kyc-encryption'

// Mock the encryption service
vi.mock('@/lib/security/kyc-encryption', () => ({
  KYCFieldType: {
    PASSPORT: 'passport',
    DRIVERS_LICENSE: 'drivers_license',
    ADDRESS: 'address'
  },
  KYCEncryptionService: vi.fn().mockImplementation(() => ({
    encryptFile: vi.fn().mockResolvedValue({
      encryptedData: 'encrypted-content',
      metadata: { iv: 'test-iv', salt: 'test-salt' }
    })
  }))
}))

describe('SecureFileUpload', () => {
  const mockOnFileSelect = vi.fn()
  const mockOnRemove = vi.fn()

  const defaultProps = {
    id: 'test-upload',
    label: 'Test Upload',
    fieldType: KYCFieldType.PASSPORT,
    onFileSelect: mockOnFileSelect,
    onRemove: mockOnRemove
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File type validation', () => {
    it('accepts JPEG files', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })

    it('accepts PNG files', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })

    it('accepts PDF files', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })

    it('rejects unsupported file types', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('Please upload JPEG, PNG, or PDF files only')).toBeInTheDocument()
        expect(mockOnFileSelect).not.toHaveBeenCalled()
      })
    })
  })

  describe('File size validation', () => {
    it('accepts files under 10MB', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const content = new Array(5 * 1024 * 1024).fill('a').join('') // 5MB
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
    })

    it('rejects files over 10MB', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const content = new Array(11 * 1024 * 1024).fill('a').join('') // 11MB
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock file size since File constructor doesn't set it properly in tests
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
      
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
        expect(mockOnFileSelect).not.toHaveBeenCalled()
      })
    })
  })

  describe('Document preview rendering', () => {
    it('shows image preview for image files', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const preview = 'data:image/jpeg;base64,test'

      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file}
          preview={preview}
        />
      )

      expect(screen.getByAltText('Document preview')).toHaveAttribute('src', preview)
    })

    it('shows file icon for PDF files', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file}
          preview={null}
        />
      )

      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
      expect(screen.queryByAltText('Document preview')).not.toBeInTheDocument()
    })

    it('toggles preview visibility', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const preview = 'data:image/jpeg;base64,test'

      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file}
          preview={preview}
        />
      )

      const toggleButton = screen.getByRole('button', { name: /hide preview/i })
      await user.click(toggleButton)

      expect(screen.queryByAltText('Document preview')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show preview/i })).toBeInTheDocument()
    })
  })

  describe('Watermark functionality', () => {
    it('applies watermark when enabled', async () => {
      const user = userEvent.setup()
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableWatermark={true}
          watermarkText="TEST WATERMARK"
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')

      // Mock canvas context
      const mockContext = {
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 100 }),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        globalAlpha: 0.3,
        fillStyle: '',
        font: ''
      }

      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext)
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        callback(new Blob(['watermarked'], { type: 'image/jpeg' }))
      })

      await user.upload(input, file)

      await waitFor(() => {
        expect(mockContext.fillText).toHaveBeenCalledWith('TEST WATERMARK', expect.any(Number), expect.any(Number))
      })
    })

    it('does not apply watermark when disabled', async () => {
      const user = userEvent.setup()
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableWatermark={false}
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')

      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })
  })

  describe('Error handling and retry', () => {
    it('displays upload errors', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      // Trigger an error by uploading invalid file
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('clears error when valid file is uploaded', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      // First upload invalid file
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, invalidFile)

      await waitFor(() => {
        expect(screen.getByText('Please upload JPEG, PNG, or PDF files only')).toBeInTheDocument()
      })

      // Then upload valid file
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await user.upload(input, validFile)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(mockOnFileSelect).toHaveBeenCalled()
      })
    })

    it('allows retry after error', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      // Mock encryption to fail
      const mockEncryptService = vi.fn().mockImplementation(() => ({
        encryptFile: vi.fn().mockRejectedValue(new Error('Encryption failed'))
      }))
      
      vi.doMock('@/lib/security/kyc-encryption', () => ({
        KYCEncryptionService: mockEncryptService
      }))

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      // Should be able to retry
      await user.upload(input, file)

      expect(input).not.toBeDisabled()
    })
  })

  describe('Drag and drop', () => {
    it('handles drag enter', async () => {
      render(<SecureFileUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('drop-zone')
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'image/jpeg' }]
        }
      })

      expect(dropZone).toHaveClass('border-teal-500')
    })

    it('handles drag leave', async () => {
      render(<SecureFileUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('drop-zone')
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'image/jpeg' }]
        }
      })

      fireEvent.dragLeave(dropZone)

      expect(dropZone).not.toHaveClass('border-teal-500')
    })

    it('handles file drop', async () => {
      render(<SecureFileUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('drop-zone')
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
          items: [{ kind: 'file', type: 'image/jpeg' }]
        }
      })

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })
  })

  describe('Security indicators', () => {
    it('shows security indicators when enabled', () => {
      render(
        <SecureFileUpload 
          {...defaultProps} 
          showSecurityIndicators={true}
        />
      )

      expect(screen.getByText('256-bit Encryption')).toBeInTheDocument()
      expect(screen.getByText('Secure Upload')).toBeInTheDocument()
    })

    it('hides security indicators when disabled', () => {
      render(
        <SecureFileUpload 
          {...defaultProps} 
          showSecurityIndicators={false}
        />
      )

      expect(screen.queryByText('256-bit Encryption')).not.toBeInTheDocument()
      expect(screen.queryByText('Secure Upload')).not.toBeInTheDocument()
    })
  })

  describe('Encryption', () => {
    it('encrypts file when encryption is enabled', async () => {
      const user = userEvent.setup()
      const mockEncrypt = vi.fn().mockResolvedValue({
        encryptedData: 'encrypted',
        metadata: { iv: 'iv', salt: 'salt' }
      })

      vi.doMock('@/lib/security/kyc-encryption', () => ({
        KYCEncryptionService: vi.fn().mockImplementation(() => ({
          encryptFile: mockEncrypt
        })),
        KYCFieldType: {
          PASSPORT: 'passport'
        }
      }))

      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableEncryption={true}
          encryptionPassword="test-password"
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            encryptedData: 'encrypted'
          })
        )
      })
    })

    it('does not encrypt when encryption is disabled', async () => {
      const user = userEvent.setup()
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableEncryption={false}
        />
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, undefined)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <SecureFileUpload 
          {...defaultProps} 
          required={true}
          description="Upload your document"
        />
      )

      const input = screen.getByLabelText('Test Upload')
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(screen.getByText('Upload your document')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const uploadButton = screen.getByRole('button', { name: /select file/i })
      
      await user.tab()
      expect(uploadButton).toHaveFocus()

      await user.keyboard(' ')
      // This would trigger file selection in a real browser
    })
  })

  describe('File removal', () => {
    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file}
        />
      )

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(mockOnRemove).toHaveBeenCalled()
    })
  })

  describe('Upload progress', () => {
    it('shows upload progress', async () => {
      const user = userEvent.setup()
      render(<SecureFileUpload {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Test Upload')
      
      await user.upload(input, file)

      // Progress should be shown during upload
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })
})