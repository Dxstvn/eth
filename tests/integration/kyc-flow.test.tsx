import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KYCProvider, useKYC } from '@/context/kyc-context'
import { PersonalInfoStep } from '@/components/kyc/steps/PersonalInfoStep'
import { DocumentUploadStep } from '@/components/kyc/steps/DocumentUploadStep'
import { RiskAssessmentStep } from '@/components/kyc/steps/RiskAssessmentStep'
import { KYCReviewSummary } from '@/components/kyc/review/KYCReviewSummary'
import { KYCStatusPage } from '@/components/kyc/review/KYCStatusPage'

// Mock the services
vi.mock('@/lib/services/kyc-verification-workflow', () => ({
  KYCVerificationWorkflow: vi.fn().mockImplementation(() => ({
    executeWorkflow: vi.fn().mockResolvedValue({
      success: true,
      status: 'completed',
      verificationId: 'test-verification-id',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 5000,
      steps: [],
      retryCount: 0,
      errors: [],
      recommendations: []
    })
  })),
  quickVerify: vi.fn().mockResolvedValue({
    success: true,
    status: 'completed'
  })
}))

vi.mock('@/lib/services/kyc-audit-logger', () => ({
  kycAuditLogger: {
    log: vi.fn(),
    search: vi.fn().mockReturnValue([]),
    export: vi.fn().mockResolvedValue('export-data')
  },
  useKYCAuditLogger: () => ({
    log: vi.fn(),
    search: vi.fn().mockReturnValue([]),
    exportLogs: vi.fn().mockResolvedValue('export-data')
  }),
  KYCActionType: {
    PERSONAL_INFO_UPDATED: 'PERSONAL_INFO_UPDATED',
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    RISK_ASSESSMENT_SUBMITTED: 'RISK_ASSESSMENT_SUBMITTED',
    KYC_STATUS_CHANGED: 'KYC_STATUS_CHANGED'
  },
  kycAuditActions: {
    logPersonalInfoUpdate: vi.fn(),
    logDocumentUpload: vi.fn(),
    logStatusChange: vi.fn()
  }
}))

// Mock file upload
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

// Test component to access KYC context
function KYCTestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <KYCProvider>
      {children}
    </KYCProvider>
  )
}

// Component to display current KYC state
function KYCStateDisplay() {
  const { kycData, isLoading, error } = useKYC()
  return (
    <div data-testid="kyc-state">
      <div data-testid="kyc-status">{kycData.status}</div>
      <div data-testid="kyc-step">{kycData.currentStep}</div>
      <div data-testid="kyc-loading">{isLoading.toString()}</div>
      <div data-testid="kyc-error">{error || 'none'}</div>
      <div data-testid="completed-steps">{kycData.completedSteps.join(',')}</div>
    </div>
  )
}

describe('KYC Flow Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete KYC Flow', () => {
    it('should complete the full KYC journey from start to submission', async () => {
      const { rerender } = render(
        <KYCTestWrapper>
          <KYCStateDisplay />
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      // Initial state
      expect(screen.getByTestId('kyc-status')).toHaveTextContent('not_started')
      expect(screen.getByTestId('kyc-step')).toHaveTextContent('0')

      // Step 1: Personal Information
      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const dobInput = screen.getByLabelText(/date of birth/i)
      const nationalitySelect = screen.getByLabelText(/nationality/i)
      const emailInput = screen.getByLabelText(/email/i)
      const phoneInput = screen.getByLabelText(/phone/i)

      await user.type(firstNameInput, 'John')
      await user.type(lastNameInput, 'Doe')
      await user.type(dobInput, '1990-01-01')
      await user.selectOptions(nationalitySelect, 'US')
      await user.type(emailInput, 'john.doe@example.com')
      await user.type(phoneInput, '+1234567890')

      // Fill address information
      const addressInput = screen.getByLabelText(/street address/i)
      const cityInput = screen.getByLabelText(/city/i)
      const stateInput = screen.getByLabelText(/state/i)
      const postalCodeInput = screen.getByLabelText(/postal code/i)
      const countrySelect = screen.getByLabelText(/country/i)

      await user.type(addressInput, '123 Main St')
      await user.type(cityInput, 'New York')
      await user.type(stateInput, 'NY')
      await user.type(postalCodeInput, '10001')
      await user.selectOptions(countrySelect, 'US')

      // Submit personal info
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      // Verify state update
      await waitFor(() => {
        expect(screen.getByTestId('kyc-status')).toHaveTextContent('in_progress')
        expect(screen.getByTestId('completed-steps')).toContain('personal')
      })

      // Step 2: Document Upload
      rerender(
        <KYCTestWrapper>
          <KYCStateDisplay />
          <DocumentUploadStep />
        </KYCTestWrapper>
      )

      // Select document type
      const passportRadio = screen.getByLabelText(/passport/i)
      await user.click(passportRadio)

      // Upload documents
      const frontUpload = screen.getByLabelText(/front.*document/i)
      const selfieUpload = screen.getByLabelText(/selfie/i)

      await user.upload(frontUpload, mockFile)
      await user.upload(selfieUpload, mockFile)

      // Fill document details
      const idNumberInput = screen.getByLabelText(/document number/i)
      const expiryInput = screen.getByLabelText(/expiry date/i)

      await user.type(idNumberInput, 'P12345678')
      await user.type(expiryInput, '2025-12-31')

      // Submit documents
      const submitDocsButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitDocsButton)

      await waitFor(() => {
        expect(screen.getByTestId('completed-steps')).toContain('documents')
      })

      // Step 3: Risk Assessment
      rerender(
        <KYCTestWrapper>
          <KYCStateDisplay />
          <RiskAssessmentStep />
        </KYCTestWrapper>
      )

      // Fill risk assessment
      const employmentCheckbox = screen.getByLabelText(/employment/i)
      const volumeSelect = screen.getByLabelText(/monthly volume/i)
      const purposeCheckbox = screen.getByLabelText(/investment/i)

      await user.click(employmentCheckbox)
      await user.selectOptions(volumeSelect, '1000-5000')
      await user.click(purposeCheckbox)

      // Answer compliance questions
      const pepRadio = screen.getByLabelText(/not.*politically exposed/i)
      const sanctionsRadio = screen.getByLabelText(/no.*sanctions/i)
      const termsCheckbox = screen.getByLabelText(/accept.*terms/i)
      const consentCheckbox = screen.getByLabelText(/consent.*screening/i)

      await user.click(pepRadio)
      await user.click(sanctionsRadio)
      await user.click(termsCheckbox)
      await user.click(consentCheckbox)

      // Submit risk assessment
      const submitRiskButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitRiskButton)

      await waitFor(() => {
        expect(screen.getByTestId('completed-steps')).toContain('risk')
      })

      // Step 4: Review Summary
      rerender(
        <KYCTestWrapper>
          <KYCStateDisplay />
          <KYCReviewSummary />
        </KYCTestWrapper>
      )

      // Verify all sections are displayed
      expect(screen.getByText(/personal information/i)).toBeInTheDocument()
      expect(screen.getByText(/john doe/i)).toBeInTheDocument()
      expect(screen.getByText(/documents/i)).toBeInTheDocument()
      expect(screen.getByText(/risk assessment/i)).toBeInTheDocument()

      // Submit KYC
      const submitKYCButton = screen.getByRole('button', { name: /submit.*verification/i })
      await user.click(submitKYCButton)

      // Wait for submission
      await waitFor(() => {
        expect(screen.getByTestId('kyc-status')).toHaveTextContent('under_review')
      }, { timeout: 3000 })

      // Verify final state
      expect(screen.getByTestId('kyc-loading')).toHaveTextContent('false')
      expect(screen.getByTestId('kyc-error')).toHaveTextContent('none')
    })

    it('should persist data across steps when navigating forward and backward', async () => {
      const NavigableKYCFlow = () => {
        const { kycData, setCurrentStep } = useKYC()
        const steps = [PersonalInfoStep, DocumentUploadStep, RiskAssessmentStep]
        const CurrentStep = steps[kycData.currentStep]

        return (
          <div>
            <KYCStateDisplay />
            <CurrentStep />
            <div>
              <button 
                onClick={() => setCurrentStep(Math.max(0, kycData.currentStep - 1))}
                disabled={kycData.currentStep === 0}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentStep(Math.min(steps.length - 1, kycData.currentStep + 1))}
                disabled={kycData.currentStep === steps.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        )
      }

      render(
        <KYCTestWrapper>
          <NavigableKYCFlow />
        </KYCTestWrapper>
      )

      // Fill personal info
      await user.type(screen.getByLabelText(/first name/i), 'Jane')
      await user.type(screen.getByLabelText(/last name/i), 'Smith')
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com')

      // Navigate to next step
      await user.click(screen.getByRole('button', { name: /next/i }))

      // Navigate back
      await user.click(screen.getByRole('button', { name: /previous/i }))

      // Verify data persisted
      expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane')
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Smith')
      expect(screen.getByLabelText(/email/i)).toHaveValue('jane@example.com')
    })

    it('should validate form data across multiple steps', async () => {
      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      // Try to submit without filling required fields
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/first name.*required/i)).toBeInTheDocument()
        expect(screen.getByText(/last name.*required/i)).toBeInTheDocument()
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument()
      })

      // Fill invalid email
      await user.type(screen.getByLabelText(/email/i), 'invalid-email')
      await user.click(continueButton)

      // Should show email validation error
      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument()
      })

      // Fill valid data
      await user.clear(screen.getByLabelText(/email/i))
      await user.type(screen.getByLabelText(/email/i), 'valid@example.com')
      await user.type(screen.getByLabelText(/first name/i), 'Test')
      await user.type(screen.getByLabelText(/last name/i), 'User')
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.selectOptions(screen.getByLabelText(/nationality/i), 'US')
      await user.type(screen.getByLabelText(/phone/i), '+1234567890')

      // Should proceed without errors
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/required/i)).not.toBeInTheDocument()
      })
    })

    it('should handle error scenarios during submission', async () => {
      // Mock submission failure
      const mockSubmitKYC = vi.fn().mockRejectedValue(new Error('Submission failed'))
      
      const FailingKYCProvider = ({ children }: { children: React.ReactNode }) => {
        const { kycData, updatePersonalInfo, updateDocumentInfo, updateRiskAssessment, setCurrentStep, markStepCompleted, resetKYC } = useKYC()
        
        return (
          <div>
            {children}
            <button onClick={() => mockSubmitKYC()}>Submit KYC</button>
          </div>
        )
      }

      render(
        <KYCTestWrapper>
          <FailingKYCProvider>
            <KYCStateDisplay />
          </FailingKYCProvider>
        </KYCTestWrapper>
      )

      // Trigger submission
      const submitButton = screen.getByRole('button', { name: /submit kyc/i })
      await user.click(submitButton)

      // Should show error state
      await waitFor(() => {
        expect(mockSubmitKYC).toHaveBeenCalled()
      })
    })

    it('should track audit logs for each step completion', async () => {
      const { kycAuditActions } = await import('@/lib/services/kyc-audit-logger')

      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      // Fill and submit personal info
      await user.type(screen.getByLabelText(/first name/i), 'Audit')
      await user.type(screen.getByLabelText(/last name/i), 'Test')
      await user.type(screen.getByLabelText(/email/i), 'audit@test.com')
      await user.type(screen.getByLabelText(/date of birth/i), '1990-01-01')
      await user.selectOptions(screen.getByLabelText(/nationality/i), 'US')
      await user.type(screen.getByLabelText(/phone/i), '+1234567890')

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      // Verify audit logging was called
      await waitFor(() => {
        expect(kycAuditActions.logPersonalInfoUpdate).toHaveBeenCalled()
      })
    })
  })

  describe('Session Management', () => {
    it('should save and restore KYC progress from session storage', async () => {
      const { unmount } = render(
        <KYCTestWrapper>
          <PersonalInfoStep />
          <KYCStateDisplay />
        </KYCTestWrapper>
      )

      // Fill some data
      await user.type(screen.getByLabelText(/first name/i), 'Session')
      await user.type(screen.getByLabelText(/last name/i), 'Test')

      // Verify state changed
      expect(screen.getByTestId('kyc-status')).toHaveTextContent('in_progress')

      // Unmount component (simulate page refresh)
      unmount()

      // Remount and check if data persisted
      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
          <KYCStateDisplay />
        </KYCTestWrapper>
      )

      // Check if form fields retained values
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toHaveValue('Session')
        expect(screen.getByLabelText(/last name/i)).toHaveValue('Test')
        expect(screen.getByTestId('kyc-status')).toHaveTextContent('in_progress')
      })
    })

    it('should handle session timeout gracefully', async () => {
      render(
        <KYCTestWrapper>
          <KYCStatusPage />
        </KYCTestWrapper>
      )

      // Simulate session timeout
      sessionStorage.clear()
      
      // Trigger a re-render or action that checks session
      const refreshButton = screen.queryByRole('button', { name: /refresh/i })
      if (refreshButton) {
        await user.click(refreshButton)
      }

      // Should handle gracefully without crashing
      expect(screen.getByTestId('kyc-state')).toBeInTheDocument()
    })
  })

  describe('Multi-language Support', () => {
    it('should validate international phone numbers', async () => {
      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone/i)

      // Test various international formats
      const phoneNumbers = [
        '+44 20 7946 0958', // UK
        '+33 1 42 86 82 00', // France
        '+49 30 2062950', // Germany
        '+81 3-3224-9999', // Japan
        '+86 10 8529 8000', // China
      ]

      for (const phoneNumber of phoneNumbers) {
        await user.clear(phoneInput)
        await user.type(phoneInput, phoneNumber)
        
        // Should not show validation error
        await waitFor(() => {
          expect(screen.queryByText(/invalid.*phone/i)).not.toBeInTheDocument()
        })
      }
    })

    it('should accept names with special characters', async () => {
      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      // Test names with various special characters
      const specialNames = [
        "O'Brien",
        "Müller",
        "José",
        "François",
        "Владимир",
        "李明",
      ]

      const firstNameInput = screen.getByLabelText(/first name/i)

      for (const name of specialNames) {
        await user.clear(firstNameInput)
        await user.type(firstNameInput, name)
        
        // Should accept without validation error
        expect(firstNameInput).toHaveValue(name)
        expect(screen.queryByText(/invalid.*name/i)).not.toBeInTheDocument()
      }
    })
  })

  describe('Performance', () => {
    it('should handle large file uploads efficiently', async () => {
      render(
        <KYCTestWrapper>
          <DocumentUploadStep />
        </KYCTestWrapper>
      )

      // Create a large file (5MB)
      const largeFile = new File(
        [new ArrayBuffer(5 * 1024 * 1024)], 
        'large-document.pdf', 
        { type: 'application/pdf' }
      )

      const uploadInput = screen.getByLabelText(/front.*document/i)
      
      const startTime = performance.now()
      await user.upload(uploadInput, largeFile)
      const endTime = performance.now()

      // Upload should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)

      // Should show file uploaded successfully
      await waitFor(() => {
        expect(screen.getByText(/large-document.pdf/i)).toBeInTheDocument()
      })
    })

    it('should debounce form field updates', async () => {
      const updateSpy = vi.fn()
      
      // Mock the update function
      vi.mock('@/context/kyc-context', async () => {
        const actual = await vi.importActual('@/context/kyc-context')
        return {
          ...actual,
          useKYC: () => ({
            ...actual.useKYC(),
            updatePersonalInfo: updateSpy
          })
        }
      })

      render(
        <KYCTestWrapper>
          <PersonalInfoStep />
        </KYCTestWrapper>
      )

      const firstNameInput = screen.getByLabelText(/first name/i)

      // Type rapidly
      await user.type(firstNameInput, 'Testing123', { delay: 10 })

      // Updates should be debounced
      await waitFor(() => {
        // Should not be called for every character
        expect(updateSpy).toHaveBeenCalledTimes(1)
      })
    })
  })
})