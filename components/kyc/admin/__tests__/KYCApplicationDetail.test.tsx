import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KYCApplicationDetail } from '../KYCApplicationDetail'
import { apiClient } from '@/services/api'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/services/api')
jest.mock('sonner')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    back: jest.fn()
  })
}))

// Mock KYC application data
const mockApplication = {
  id: 'app-123',
  userId: 'user-456',
  status: 'pending' as const,
  submittedAt: '2024-01-20T10:00:00Z',
  lastUpdated: '2024-01-20T12:00:00Z',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    nationality: 'USA',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'United States'
    },
    ssn: '***-**-6789',
    occupation: 'Software Engineer',
    employer: 'Tech Corp',
    annualIncome: '$50,000 - $100,000',
    sourceOfFunds: 'Employment'
  },
  documents: {
    identityDocument: {
      type: 'passport',
      fileUrl: '/api/files/passport-123.pdf',
      fileName: 'passport.pdf',
      uploadedAt: '2024-01-20T10:30:00Z',
      verified: true,
      extractedData: {
        documentNumber: 'P123456789',
        expiryDate: '2030-12-31',
        firstName: 'John',
        lastName: 'Doe'
      }
    },
    addressProof: {
      type: 'utility_bill',
      fileUrl: '/api/files/utility-456.pdf',
      fileName: 'utility_bill.pdf',
      uploadedAt: '2024-01-20T10:35:00Z',
      verified: true
    }
  },
  livenessCheck: {
    completed: true,
    score: 0.95,
    timestamp: '2024-01-20T10:40:00Z',
    imageUrl: '/api/files/liveness-789.jpg'
  },
  riskAssessment: {
    score: 25,
    level: 'low',
    factors: {
      countryRisk: 'low',
      pepStatus: false,
      transactionVolume: 'medium',
      sourceOfFunds: 'low'
    }
  },
  verificationHistory: [
    {
      timestamp: '2024-01-20T11:00:00Z',
      action: 'submitted',
      performedBy: 'user',
      notes: 'Initial submission'
    },
    {
      timestamp: '2024-01-20T12:00:00Z',
      action: 'document_verified',
      performedBy: 'system',
      notes: 'All documents verified successfully'
    }
  ],
  notes: []
}

describe('KYCApplicationDetail', () => {
  const mockOnUpdate = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } })
    ;(apiClient.get as jest.Mock).mockResolvedValue({ data: { url: 'https://example.com/file' } })
  })

  describe('Rendering', () => {
    it('renders application details', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText('KYC Application Details')).toBeInTheDocument()
      expect(screen.getByText('Application ID: app-123')).toBeInTheDocument()
    })

    it('displays status badge', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const badge = screen.getByText('Pending')
      expect(badge).toHaveClass('bg-yellow-100')
    })

    it('shows different badge colors for different statuses', () => {
      const statuses = [
        { status: 'approved', color: 'bg-green-100' },
        { status: 'rejected', color: 'bg-red-100' },
        { status: 'in_review', color: 'bg-blue-100' },
        { status: 'more_info_required', color: 'bg-orange-100' }
      ]
      
      statuses.forEach(({ status, color }) => {
        const { rerender } = render(
          <KYCApplicationDetail 
            application={{ ...mockApplication, status: status as any }} 
            onUpdate={mockOnUpdate} 
          />
        )
        
        const badge = screen.getByText(status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        expect(badge).toHaveClass(color)
        
        rerender(<div />)
      })
    })

    it('displays submission and update times', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText(/submitted on/i)).toBeInTheDocument()
      expect(screen.getByText(/last updated/i)).toBeInTheDocument()
    })
  })

  describe('Tabs Navigation', () => {
    it('renders all tabs', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByRole('tab', { name: /personal info/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /verification/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /risk assessment/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument()
    })

    it('switches between tabs', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      // Initially shows personal info
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      
      // Switch to documents tab
      await user.click(screen.getByRole('tab', { name: /documents/i }))
      expect(screen.getByText('Identity Document')).toBeInTheDocument()
      
      // Switch to risk assessment
      await user.click(screen.getByRole('tab', { name: /risk assessment/i }))
      expect(screen.getByText('Risk Score: 25')).toBeInTheDocument()
    })
  })

  describe('Personal Information Tab', () => {
    it('displays all personal information', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
      expect(screen.getByText('January 1, 1990')).toBeInTheDocument()
      expect(screen.getByText('USA')).toBeInTheDocument()
    })

    it('displays masked SSN', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText('***-**-6789')).toBeInTheDocument()
    })

    it('displays employment information', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Tech Corp')).toBeInTheDocument()
      expect(screen.getByText('$50,000 - $100,000')).toBeInTheDocument()
      expect(screen.getByText('Employment')).toBeInTheDocument()
    })
  })

  describe('Documents Tab', () => {
    it('displays document information', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /documents/i }))
      
      expect(screen.getByText('passport.pdf')).toBeInTheDocument()
      expect(screen.getByText('utility_bill.pdf')).toBeInTheDocument()
      expect(screen.getAllByText('Verified').length).toBe(2)
    })

    it('shows extracted data from documents', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /documents/i }))
      
      expect(screen.getByText('P123456789')).toBeInTheDocument()
      expect(screen.getByText('Expires: Dec 31, 2030')).toBeInTheDocument()
    })

    it('allows document preview', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /documents/i }))
      
      const previewButtons = screen.getAllByRole('button', { name: /view/i })
      await user.click(previewButtons[0])
      
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/kyc/documents/passport-123.pdf/download')
      })
    })

    it('allows document download', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /documents/i }))
      
      const downloadButtons = screen.getAllByRole('button', { name: /download/i })
      await user.click(downloadButtons[0])
      
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/kyc/documents/passport-123.pdf/download')
      })
    })
  })

  describe('Verification Tab', () => {
    it('displays liveness check results', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /verification/i }))
      
      expect(screen.getByText('Liveness Check')).toBeInTheDocument()
      expect(screen.getByText('Score: 95%')).toBeInTheDocument()
      expect(screen.getByText('Passed')).toBeInTheDocument()
    })

    it('shows liveness check image', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /verification/i }))
      
      const image = screen.getByAltText('Liveness check')
      expect(image).toHaveAttribute('src', '/api/files/liveness-789.jpg')
    })
  })

  describe('Risk Assessment Tab', () => {
    it('displays risk score and level', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /risk assessment/i }))
      
      expect(screen.getByText('Risk Score: 25')).toBeInTheDocument()
      expect(screen.getByText('Low Risk')).toBeInTheDocument()
    })

    it('shows risk factors breakdown', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /risk assessment/i }))
      
      expect(screen.getByText('Country Risk')).toBeInTheDocument()
      expect(screen.getByText('PEP Status')).toBeInTheDocument()
      expect(screen.getByText('Transaction Volume')).toBeInTheDocument()
      expect(screen.getByText('Source of Funds')).toBeInTheDocument()
    })

    it('displays correct risk level badges', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /risk assessment/i }))
      
      const lowRiskBadges = screen.getAllByText(/low/i)
      expect(lowRiskBadges.length).toBeGreaterThan(0)
      
      const mediumRiskBadge = screen.getByText(/medium/i)
      expect(mediumRiskBadge).toBeInTheDocument()
    })
  })

  describe('History Tab', () => {
    it('displays verification history', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /history/i }))
      
      expect(screen.getByText('Application submitted')).toBeInTheDocument()
      expect(screen.getByText('Document verified')).toBeInTheDocument()
    })

    it('shows timestamps for history entries', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /history/i }))
      
      expect(screen.getByText(/jan 20, 2024 at 11:00 am/i)).toBeInTheDocument()
      expect(screen.getByText(/jan 20, 2024 at 12:00 pm/i)).toBeInTheDocument()
    })

    it('displays performer information', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      await user.click(screen.getByRole('tab', { name: /history/i }))
      
      expect(screen.getByText('By: user')).toBeInTheDocument()
      expect(screen.getByText('By: system')).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('shows approve and reject buttons for pending applications', () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /request more info/i })).toBeInTheDocument()
    })

    it('handles approval with notes', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)
      
      // Dialog should open
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Approve Application')).toBeInTheDocument()
      
      // Add notes
      const notesTextarea = within(dialog).getByLabelText(/notes/i)
      await user.type(notesTextarea, 'All documents verified successfully')
      
      // Confirm approval
      const confirmButton = within(dialog).getByRole('button', { name: /approve/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/kyc/applications/app-123/approve', {
          notes: 'All documents verified successfully'
        })
        expect(toast.success).toHaveBeenCalledWith('Application approved successfully')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('handles rejection with reason', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)
      
      // Dialog should open
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Reject Application')).toBeInTheDocument()
      
      // Add reason
      const reasonTextarea = within(dialog).getByLabelText(/reason/i)
      await user.type(reasonTextarea, 'Documents are not clear')
      
      // Confirm rejection
      const confirmButton = within(dialog).getByRole('button', { name: /reject/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/kyc/applications/app-123/reject', {
          reason: 'Documents are not clear'
        })
        expect(toast.success).toHaveBeenCalledWith('Application rejected')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('handles request for more information', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const requestInfoButton = screen.getByRole('button', { name: /request more info/i })
      await user.click(requestInfoButton)
      
      // Dialog should open
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Request Additional Information')).toBeInTheDocument()
      
      // Add request details
      const detailsTextarea = within(dialog).getByLabelText(/details/i)
      await user.type(detailsTextarea, 'Please provide a clearer photo of your ID')
      
      // Send request
      const sendButton = within(dialog).getByRole('button', { name: /send request/i })
      await user.click(sendButton)
      
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/kyc/applications/app-123/request-info', {
          message: 'Please provide a clearer photo of your ID'
        })
        expect(toast.success).toHaveBeenCalledWith('Information request sent')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })

    it('disables actions for non-pending applications', () => {
      render(
        <KYCApplicationDetail 
          application={{ ...mockApplication, status: 'approved' }} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
    })
  })

  describe('Notes Section', () => {
    it('displays existing notes', () => {
      const applicationWithNotes = {
        ...mockApplication,
        notes: [
          {
            id: 'note-1',
            text: 'Document verification completed',
            createdBy: 'admin@example.com',
            createdAt: '2024-01-20T11:30:00Z'
          }
        ]
      }
      
      render(
        <KYCApplicationDetail 
          application={applicationWithNotes} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      expect(screen.getByText('Document verification completed')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })

    it('allows adding new notes', async () => {
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const addNoteButton = screen.getByRole('button', { name: /add note/i })
      await user.click(addNoteButton)
      
      const noteInput = screen.getByPlaceholderText(/add a note/i)
      await user.type(noteInput, 'Verified employment details')
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/kyc/applications/app-123/notes', {
          text: 'Verified employment details'
        })
        expect(toast.success).toHaveBeenCalledWith('Note added successfully')
        expect(mockOnUpdate).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)
      
      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: /approve/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to approve application')
      })
    })

    it('handles missing data gracefully', () => {
      const incompleteApplication = {
        ...mockApplication,
        documents: {
          identityDocument: null,
          addressProof: null
        },
        livenessCheck: null
      }
      
      render(
        <KYCApplicationDetail 
          application={incompleteApplication as any} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      // Should render without crashing
      expect(screen.getByText('KYC Application Details')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading state for actions', async () => {
      // Mock slow API response
      ;(apiClient.post as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(
        <KYCApplicationDetail 
          application={mockApplication} 
          onUpdate={mockOnUpdate} 
        />
      )
      
      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)
      
      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: /approve/i })
      await user.click(confirmButton)
      
      expect(confirmButton).toBeDisabled()
      expect(confirmButton).toHaveTextContent(/approving/i)
    })
  })
})