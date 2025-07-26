import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RiskAssessmentStep from '../RiskAssessmentStep'
import { useKYC } from '@/context/kyc-context'

// Mock dependencies
jest.mock('@/context/kyc-context')
jest.mock('@/lib/countries', () => ({
  countries: [
    { code: 'US', name: 'United States', restricted: false },
    { code: 'CA', name: 'Canada', restricted: false },
    { code: 'UK', name: 'United Kingdom', restricted: false },
    { code: 'KP', name: 'North Korea', restricted: true },
    { code: 'IR', name: 'Iran', restricted: true }
  ]
}))

describe('RiskAssessmentStep', () => {
  const mockOnNext = jest.fn()
  const mockOnBack = jest.fn()
  const mockUpdateData = jest.fn()
  const user = userEvent.setup()

  const defaultKYCData = {
    personalInfo: {},
    documents: {},
    addressProof: {},
    livenessCheck: {},
    riskAssessment: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useKYC as jest.Mock).mockReturnValue({
      kycData: defaultKYCData,
      updateKYCData: mockUpdateData,
      currentStep: 4
    })
  })

  describe('Rendering', () => {
    it('renders risk assessment form', () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      expect(screen.getByText(/risk assessment/i)).toBeInTheDocument()
      expect(screen.getByText(/compliance questionnaire/i)).toBeInTheDocument()
    })

    it('displays all form sections', () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      expect(screen.getByText(/source of funds/i)).toBeInTheDocument()
      expect(screen.getByText(/purpose of using clearhold/i)).toBeInTheDocument()
      expect(screen.getByText(/expected transaction volume/i)).toBeInTheDocument()
      expect(screen.getByText(/politically exposed person/i)).toBeInTheDocument()
      expect(screen.getByText(/countries of operation/i)).toBeInTheDocument()
    })

    it('shows navigation buttons', () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })
  })

  describe('Source of Funds', () => {
    it('allows selecting primary source of funds', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const employmentOption = screen.getByLabelText(/employment\/salary/i)
      await user.click(employmentOption)
      
      expect(employmentOption).toBeChecked()
    })

    it('allows selecting multiple secondary sources', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const investmentCheckbox = screen.getByRole('checkbox', { name: /investment returns/i })
      const savingsCheckbox = screen.getByRole('checkbox', { name: /personal savings/i })
      
      await user.click(investmentCheckbox)
      await user.click(savingsCheckbox)
      
      expect(investmentCheckbox).toBeChecked()
      expect(savingsCheckbox).toBeChecked()
    })

    it('shows other source input when other is selected', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const otherCheckbox = screen.getByRole('checkbox', { name: /other/i })
      await user.click(otherCheckbox)
      
      const otherInput = await screen.findByPlaceholderText(/please specify/i)
      expect(otherInput).toBeInTheDocument()
      
      await user.type(otherInput, 'Cryptocurrency trading')
      expect(otherInput).toHaveValue('Cryptocurrency trading')
    })
  })

  describe('Purpose Selection', () => {
    it('allows selecting single purpose', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const realEstateRadio = screen.getByRole('radio', { name: /real estate purchase/i })
      await user.click(realEstateRadio)
      
      expect(realEstateRadio).toBeChecked()
    })

    it('shows other purpose input when other is selected', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const otherRadio = screen.getByRole('radio', { name: /other/i })
      await user.click(otherRadio)
      
      const otherInput = await screen.findByPlaceholderText(/please describe/i)
      expect(otherInput).toBeInTheDocument()
    })
  })

  describe('Transaction Volume', () => {
    it('allows selecting transaction volume', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const volumeRadio = screen.getByRole('radio', { name: /\$10,000 - \$50,000/i })
      await user.click(volumeRadio)
      
      expect(volumeRadio).toBeChecked()
    })
  })

  describe('PEP Disclosure', () => {
    it('shows PEP question with radio options', () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      expect(screen.getByLabelText(/yes.*politically exposed/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/no.*politically exposed/i)).toBeInTheDocument()
    })

    it('shows additional fields when PEP is yes', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const yesRadio = screen.getByLabelText(/yes.*politically exposed/i)
      await user.click(yesRadio)
      
      expect(screen.getByLabelText(/position\/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/relationship to pep/i)).toBeInTheDocument()
    })

    it('hides additional fields when PEP is no', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // First select yes to show fields
      const yesRadio = screen.getByLabelText(/yes.*politically exposed/i)
      await user.click(yesRadio)
      
      expect(screen.getByLabelText(/position\/title/i)).toBeInTheDocument()
      
      // Then select no to hide fields
      const noRadio = screen.getByLabelText(/no.*politically exposed/i)
      await user.click(noRadio)
      
      expect(screen.queryByLabelText(/position\/title/i)).not.toBeInTheDocument()
    })
  })

  describe('Countries of Operation', () => {
    it('allows selecting multiple countries', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      
      const usOption = screen.getByRole('option', { name: /united states/i })
      const canadaOption = screen.getByRole('option', { name: /canada/i })
      
      await user.click(usOption)
      await user.click(canadaOption)
      
      expect(screen.getByText(/united states/i)).toBeInTheDocument()
      expect(screen.getByText(/canada/i)).toBeInTheDocument()
    })

    it('shows warning for restricted countries', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      
      const restrictedOption = screen.getByRole('option', { name: /north korea/i })
      await user.click(restrictedOption)
      
      await waitFor(() => {
        expect(screen.getByText(/selected countries include restricted jurisdictions/i)).toBeInTheDocument()
      })
    })

    it('allows removing selected countries', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      
      const usOption = screen.getByRole('option', { name: /united states/i })
      await user.click(usOption)
      
      expect(screen.getByText(/united states/i)).toBeInTheDocument()
      
      // Remove the country
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)
      
      expect(screen.queryByText(/united states/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('requires primary source of funds', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please select your primary source of funds/i)).toBeInTheDocument()
    })

    it('requires purpose selection', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Select source of funds
      const employmentOption = screen.getByLabelText(/employment\/salary/i)
      await user.click(employmentOption)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please select your purpose/i)).toBeInTheDocument()
    })

    it('requires transaction volume', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Select source and purpose
      const employmentOption = screen.getByLabelText(/employment\/salary/i)
      await user.click(employmentOption)
      
      const purposeRadio = screen.getByRole('radio', { name: /real estate purchase/i })
      await user.click(purposeRadio)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please select expected transaction volume/i)).toBeInTheDocument()
    })

    it('requires PEP disclosure', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Fill other required fields
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('radio', { name: /real estate purchase/i }))
      await user.click(screen.getByRole('radio', { name: /\$10,000 - \$50,000/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please answer the pep question/i)).toBeInTheDocument()
    })

    it('requires country selection', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Fill other required fields
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('radio', { name: /real estate purchase/i }))
      await user.click(screen.getByRole('radio', { name: /\$10,000 - \$50,000/i }))
      await user.click(screen.getByLabelText(/no.*politically exposed/i))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please select at least one country/i)).toBeInTheDocument()
    })

    it('validates PEP details when PEP is yes', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Fill required fields
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('radio', { name: /real estate purchase/i }))
      await user.click(screen.getByRole('radio', { name: /\$10,000 - \$50,000/i }))
      await user.click(screen.getByLabelText(/yes.*politically exposed/i))
      
      // Add country
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      await user.click(screen.getByRole('option', { name: /united states/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      expect(screen.getByText(/please provide pep details/i)).toBeInTheDocument()
    })
  })

  describe('Risk Score Calculation', () => {
    it('calculates low risk score', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Low risk selections
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('radio', { name: /real estate purchase/i }))
      await user.click(screen.getByRole('radio', { name: /less than \$10,000/i }))
      await user.click(screen.getByLabelText(/no.*politically exposed/i))
      
      // Non-restricted country
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      await user.click(screen.getByRole('option', { name: /united states/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockUpdateData).toHaveBeenCalledWith('riskAssessment', 
          expect.objectContaining({
            riskScore: expect.any(Number)
          })
        )
        const riskData = mockUpdateData.mock.calls[0][1]
        expect(riskData.riskScore).toBeLessThan(40)
      })
    })

    it('calculates high risk score', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // High risk selections
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('checkbox', { name: /other/i }))
      await user.type(screen.getByPlaceholderText(/please specify/i), 'Crypto trading')
      
      await user.click(screen.getByRole('radio', { name: /other/i }))
      await user.type(screen.getByPlaceholderText(/please describe/i), 'High value trades')
      
      await user.click(screen.getByRole('radio', { name: /more than \$1,000,000/i }))
      await user.click(screen.getByLabelText(/yes.*politically exposed/i))
      
      await user.type(screen.getByLabelText(/position\/title/i), 'Government Official')
      await user.type(screen.getByLabelText(/relationship to pep/i), 'Self')
      
      // Restricted country
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      await user.click(screen.getByRole('option', { name: /iran/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockUpdateData).toHaveBeenCalledWith('riskAssessment', 
          expect.objectContaining({
            riskScore: expect.any(Number)
          })
        )
        const riskData = mockUpdateData.mock.calls[0][1]
        expect(riskData.riskScore).toBeGreaterThan(70)
      })
    })
  })

  describe('Form Submission', () => {
    it('saves all form data on submission', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Fill all fields
      await user.click(screen.getByLabelText(/business income/i))
      await user.click(screen.getByRole('checkbox', { name: /investment returns/i }))
      
      await user.click(screen.getByRole('radio', { name: /business transaction/i }))
      await user.click(screen.getByRole('radio', { name: /\$50,000 - \$100,000/i }))
      await user.click(screen.getByLabelText(/no.*politically exposed/i))
      
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      await user.click(screen.getByRole('option', { name: /canada/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockUpdateData).toHaveBeenCalledWith('riskAssessment', {
          primarySourceOfFunds: 'business',
          secondarySourcesOfFunds: ['investment'],
          otherSourceDescription: '',
          purpose: 'business_transaction',
          otherPurposeDescription: '',
          expectedVolume: '50k-100k',
          isPEP: false,
          pepPosition: '',
          pepRelationship: '',
          countries: ['CA'],
          hasRestrictedCountries: false,
          riskScore: expect.any(Number),
          riskLevel: expect.stringMatching(/low|medium|high/),
          completedAt: expect.any(String)
        })
      })
    })

    it('calls onNext after successful submission', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      // Fill minimal required fields
      await user.click(screen.getByLabelText(/employment\/salary/i))
      await user.click(screen.getByRole('radio', { name: /real estate purchase/i }))
      await user.click(screen.getByRole('radio', { name: /less than \$10,000/i }))
      await user.click(screen.getByLabelText(/no.*politically exposed/i))
      
      const select = screen.getByRole('combobox', { name: /select countries/i })
      await user.click(select)
      await user.click(screen.getByRole('option', { name: /united states/i }))
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled()
      })
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)
      
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('Pre-filled Data', () => {
    it('loads existing risk assessment data', () => {
      const existingData = {
        primarySourceOfFunds: 'employment',
        secondarySourcesOfFunds: ['investment', 'savings'],
        purpose: 'real_estate_purchase',
        expectedVolume: '10k-50k',
        isPEP: false,
        countries: ['US', 'CA']
      }
      
      ;(useKYC as jest.Mock).mockReturnValue({
        kycData: {
          ...defaultKYCData,
          riskAssessment: existingData
        },
        updateKYCData: mockUpdateData,
        currentStep: 4
      })
      
      render(<RiskAssessmentStep onNext={mockOnNext} onBack={mockOnBack} />)
      
      expect(screen.getByLabelText(/employment\/salary/i)).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /investment returns/i })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /personal savings/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /real estate purchase/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /\$10,000 - \$50,000/i })).toBeChecked()
      expect(screen.getByLabelText(/no.*politically exposed/i)).toBeChecked()
      expect(screen.getByText(/united states/i)).toBeInTheDocument()
      expect(screen.getByText(/canada/i)).toBeInTheDocument()
    })
  })
})