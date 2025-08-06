import React from 'react'
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecureFileUpload } from '../secure-file-upload'
import { KYCFieldType, KYCEncryptionService } from '@/lib/security/kyc-encryption'

// Mock KYC encryption service
vi.mock('@/lib/security/kyc-encryption', () => ({
  KYCFieldType: {
    DOCUMENT: 'document',
    PASSPORT: 'passport',
    DRIVERS_LICENSE: 'drivers_license'
  },
  KYCEncryptionService: vi.fn().mockImplementation(() => ({
    encryptFile: vi.fn().mockResolvedValue({
      encryptedData: 'mock-encrypted-data',
      metadata: {
        fieldType: 'document',
        fileName: 'test.pdf',
        fileSize: 1024
      }
    })
  }))
}))

// Mock canvas for watermarking
const mockCanvasContext = {
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  globalAlpha: 0.3,
  fillStyle: '',
  font: '',
  canvas: {
    toBlob: vi.fn((callback) => {
      callback(new Blob(['watermarked'], { type: 'image/png' }))
    }),
    width: 800,
    height: 600
  }
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCanvasContext)

// Mock FileReader
const mockFileReader = () => {
  const reader = {
    readAsDataURL: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    onload: null as any,
    onloadend: null as any,
    onerror: null as any,
    result: null as any
  }
  vi.spyOn(window, 'FileReader').mockImplementation(() => reader as any)
  return reader
}

// Mock Image for watermarking
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 800
  height = 600

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
}

(global as any).Image = MockImage

describe('SecureFileUpload', () => {
  const mockOnFileSelect = vi.fn()
  const mockOnRemove = vi.fn()
  const user = userEvent.setup()

  const defaultProps = {
    id: 'test-upload',
    label: 'Upload Document',
    fieldType: KYCFieldType.DOCUMENT,
    onFileSelect: mockOnFileSelect
  }

  // Helper to create mock file
  const createMockFile = (name: string, type: string = 'application/pdf', size: number = 1024) => {
    const file = new File(['test'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders upload area with label', () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      expect(screen.getByText('Upload Document')).toBeInTheDocument()
      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument()
    })

    it('displays description when provided', () => {
      render(<SecureFileUpload {...defaultProps} description="Upload your passport" />)
      
      expect(screen.getByText('Upload your passport')).toBeInTheDocument()
    })

    it('shows required indicator', () => {
      render(<SecureFileUpload {...defaultProps} required />)
      
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('shows accepted file types', () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      expect(screen.getByText(/jpg, png, pdf/i)).toBeInTheDocument()
    })

    it('shows max file size', () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      expect(screen.getByText(/max 10mb/i)).toBeInTheDocument()
    })

    it('displays security indicators when enabled', () => {
      render(<SecureFileUpload {...defaultProps} showSecurityIndicators />)
      
      expect(screen.getByText(/256-bit encryption/i)).toBeInTheDocument()
      expect(screen.getByText(/secure upload/i)).toBeInTheDocument()
    })

    it('shows existing file when value is provided', () => {
      const file = createMockFile('existing.pdf')
      render(<SecureFileUpload {...defaultProps} value={file} />)
      
      expect(screen.getByText('existing.pdf')).toBeInTheDocument()
      expect(screen.getByText('1 KB')).toBeInTheDocument()
    })

    it('shows preview for images', () => {
      const preview = 'data:image/png;base64,test'
      render(<SecureFileUpload {...defaultProps} preview={preview} />)
      
      expect(screen.getByAltText('Preview')).toHaveAttribute('src', preview)
    })
  })

  describe('File Selection', () => {
    it('handles file selection via click', async () => {
      const reader = mockFileReader()
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      // Trigger file reader
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, undefined)
      })
    })

    it('handles file selection via drag and drop', async () => {
      const reader = mockFileReader()
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('test.pdf')
      const dropZone = screen.getByTestId('drop-zone')
      
      // Simulate drag events
      fireEvent.dragEnter(dropZone)
      expect(dropZone).toHaveClass('border-primary')
      
      fireEvent.dragOver(dropZone, { preventDefault: vi.fn() })
      
      fireEvent.drop(dropZone, {
        preventDefault: vi.fn(),
        dataTransfer: { files: [file] }
      })
      
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, undefined)
      })
    })

    it('validates file type', async () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('test.txt', 'text/plain')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument()
        expect(mockOnFileSelect).not.toHaveBeenCalled()
      })
    })

    it('validates file size', async () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('large.pdf', 'application/pdf', 11 * 1024 * 1024)
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText(/file size exceeds 10mb/i)).toBeInTheDocument()
        expect(mockOnFileSelect).not.toHaveBeenCalled()
      })
    })

    it('handles custom accept attribute', async () => {
      render(<SecureFileUpload {...defaultProps} accept=".doc,.docx" />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('accept', '.doc,.docx')
    })
  })

  describe('File Encryption', () => {
    it('encrypts file when encryption is enabled', async () => {
      const reader = mockFileReader()
      reader.result = new ArrayBuffer(1024)
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableEncryption 
          encryptionPassword="test-password"
        />
      )
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      // Trigger array buffer read
      reader.onload?.()
      
      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, {
          encryptedData: 'mock-encrypted-data',
          metadata: expect.objectContaining({
            fieldType: 'document',
            fileName: 'test.pdf'
          })
        })
      })
    })

    it('shows encryption progress', async () => {
      const reader = mockFileReader()
      
      // Delay encryption to show progress
      const mockEncrypt = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          encryptedData: 'encrypted',
          metadata: {}
        }), 100))
      )
      
      KYCEncryptionService.prototype.encryptFile = mockEncrypt
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableEncryption 
          encryptionPassword="test-password"
        />
      )
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onload?.()
      
      await waitFor(() => {
        expect(screen.getByText(/encrypting/i)).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/encrypting/i)).not.toBeInTheDocument()
      })
    })

    it('handles encryption failure', async () => {
      const reader = mockFileReader()
      reader.result = new ArrayBuffer(1024)
      
      KYCEncryptionService.prototype.encryptFile = vi.fn()
        .mockRejectedValue(new Error('Encryption failed'))
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableEncryption 
          encryptionPassword="test-password"
        />
      )
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onload?.()
      
      await waitFor(() => {
        expect(screen.getByText(/encryption failed/i)).toBeInTheDocument()
        expect(mockOnFileSelect).not.toHaveBeenCalled()
      })
    })
  })

  describe('Watermarking', () => {
    it('applies watermark to images when enabled', async () => {
      const reader = mockFileReader()
      reader.result = 'data:image/png;base64,test'
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableWatermark 
          watermarkText="CONFIDENTIAL"
        />
      )
      
      const file = createMockFile('test.png', 'image/png')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(mockCanvasContext.drawImage).toHaveBeenCalled()
        expect(mockCanvasContext.fillText).toHaveBeenCalledWith(
          expect.stringContaining('CONFIDENTIAL'),
          expect.any(Number),
          expect.any(Number)
        )
      })
    })

    it('shows watermark preview', async () => {
      const reader = mockFileReader()
      reader.result = 'data:image/png;base64,test'
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableWatermark 
          watermarkText="CLEARHOLD"
        />
      )
      
      const file = createMockFile('test.jpg', 'image/jpeg')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(screen.getByText(/watermark applied/i)).toBeInTheDocument()
      })
    })

    it('does not watermark non-image files', async () => {
      const reader = mockFileReader()
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          enableWatermark 
          watermarkText="CONFIDENTIAL"
        />
      )
      
      const file = createMockFile('test.pdf', 'application/pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(mockCanvasContext.drawImage).not.toHaveBeenCalled()
        expect(mockOnFileSelect).toHaveBeenCalledWith(file, undefined)
      })
    })
  })

  describe('File Removal', () => {
    it('removes file when remove button is clicked', async () => {
      const file = createMockFile('test.pdf')
      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file} 
          onRemove={mockOnRemove}
        />
      )
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)
      
      expect(mockOnRemove).toHaveBeenCalled()
      expect(mockOnFileSelect).toHaveBeenCalledWith(null)
    })

    it('clears error when file is removed', async () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      // Trigger error
      const invalidFile = createMockFile('test.txt', 'text/plain')
      const input = screen.getByTestId('file-input')
      fireEvent.change(input, { target: { files: [invalidFile] } })
      
      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument()
      })
      
      // Upload valid file
      const validFile = createMockFile('test.pdf')
      fireEvent.change(input, { target: { files: [validFile] } })
      
      await waitFor(() => {
        expect(screen.queryByText(/file type not allowed/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Preview Toggle', () => {
    it('toggles preview visibility for uploaded files', async () => {
      const file = createMockFile('test.pdf')
      const preview = 'data:application/pdf;base64,test'
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          value={file} 
          preview={preview}
        />
      )
      
      // Initially shows preview
      expect(screen.getByText('Hide Preview')).toBeInTheDocument()
      
      const toggleButton = screen.getByRole('button', { name: /hide preview/i })
      await user.click(toggleButton)
      
      expect(screen.getByText('Show Preview')).toBeInTheDocument()
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument()
      
      await user.click(toggleButton)
      
      expect(screen.getByText('Hide Preview')).toBeInTheDocument()
      expect(screen.getByAltText('Preview')).toBeInTheDocument()
    })
  })

  describe('Camera Capture', () => {
    it('shows camera option for image fields on mobile', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      })
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          fieldType={KYCFieldType.PASSPORT}
        />
      )
      
      expect(screen.getByText(/use camera/i)).toBeInTheDocument()
      expect(screen.getByTestId('file-input')).toHaveAttribute('capture', 'environment')
    })

    it('does not show camera option on desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      render(
        <SecureFileUpload 
          {...defaultProps} 
          fieldType={KYCFieldType.PASSPORT}
        />
      )
      
      expect(screen.queryByText(/use camera/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('aria-label', 'Upload Document')
      
      const dropZone = screen.getByTestId('drop-zone')
      expect(dropZone).toHaveAttribute('role', 'button')
      expect(dropZone).toHaveAttribute('aria-label', 'Upload Document')
    })

    it('is keyboard accessible', async () => {
      render(<SecureFileUpload {...defaultProps} />)
      
      const dropZone = screen.getByTestId('drop-zone')
      
      // Tab to drop zone
      dropZone.focus()
      expect(dropZone).toHaveFocus()
      
      // Enter/Space triggers file input
      fireEvent.keyDown(dropZone, { key: 'Enter' })
      // File input click is triggered
    })

    it('announces upload status to screen readers', async () => {
      const reader = mockFileReader()
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      reader.onloadend?.()
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('File uploaded successfully')
      })
    })
  })

  describe('Disabled State', () => {
    it('disables all interactions when disabled', () => {
      render(<SecureFileUpload {...defaultProps} disabled />)
      
      const input = screen.getByTestId('file-input')
      expect(input).toBeDisabled()
      
      const dropZone = screen.getByTestId('drop-zone')
      expect(dropZone).toHaveClass('opacity-50')
    })

    it('does not handle drag events when disabled', () => {
      render(<SecureFileUpload {...defaultProps} disabled />)
      
      const dropZone = screen.getByTestId('drop-zone')
      const file = createMockFile('test.pdf')
      
      fireEvent.drop(dropZone, {
        preventDefault: vi.fn(),
        dataTransfer: { files: [file] }
      })
      
      expect(mockOnFileSelect).not.toHaveBeenCalled()
    })
  })

  describe('Progress Indication', () => {
    it('shows upload progress', async () => {
      const reader = mockFileReader()
      
      // Mock slow read
      reader.readAsDataURL = vi.fn().mockImplementation(function() {
        setTimeout(() => {
          if (this.onprogress) {
            this.onprogress({ loaded: 50, total: 100 } as any)
          }
          setTimeout(() => {
            if (this.onloadend) this.onloadend()
          }, 50)
        }, 50)
      })
      
      render(<SecureFileUpload {...defaultProps} />)
      
      const file = createMockFile('test.pdf')
      const input = screen.getByTestId('file-input')
      
      fireEvent.change(input, { target: { files: [file] } })
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      })
    })
  })
})