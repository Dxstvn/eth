"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface PersonalInfo {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  nationality: string
  countryOfResidence: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  phoneNumber: string
  email: string
  occupation: string
  employer?: string
}

export interface DocumentInfo {
  idType: 'passport' | 'drivers_license' | 'national_id'
  idNumber: string
  idExpiryDate: string
  idFrontUrl?: string
  idBackUrl?: string
  addressProofType: 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'other'
  addressProofUrl?: string
  selfieUrl?: string
}

export interface RiskAssessment {
  sourceOfFunds: string[]
  sourceOfFundsOther?: string
  expectedMonthlyVolume: string
  purposeOfUse: string[]
  purposeOfUseOther?: string
  isPEP: boolean
  pepDetails?: string
  hasSanctions: boolean
  sanctionsDetails?: string
  taxResidencyCountry: string
  hasTaxObligationsElsewhere: boolean
  taxObligationsCountries?: string[]
  hasUSPersonStatus: boolean
  acceptedTerms: boolean
  consentToScreening: boolean
  digitalSignature?: string
}

export interface KYCData {
  personalInfo?: PersonalInfo
  documentInfo?: DocumentInfo
  riskAssessment?: RiskAssessment
  status: 'not_started' | 'in_progress' | 'under_review' | 'approved' | 'rejected' | 'additional_info_required'
  completedSteps: string[]
  currentStep: number
  submittedAt?: string
  reviewedAt?: string
  rejectionReason?: string
  additionalInfoRequested?: string[]
  riskScore?: 'low' | 'medium' | 'high'
  verificationId?: string
}

interface KYCContextType {
  kycData: KYCData
  updatePersonalInfo: (info: Partial<PersonalInfo>) => void
  updateDocumentInfo: (info: Partial<DocumentInfo>) => void
  updateRiskAssessment: (assessment: Partial<RiskAssessment>) => void
  setCurrentStep: (step: number) => void
  markStepCompleted: (stepName: string) => void
  submitKYC: () => Promise<void>
  resetKYC: () => void
  isLoading: boolean
  error: string | null
}

const defaultKYCData: KYCData = {
  status: 'not_started',
  completedSteps: [],
  currentStep: 0
}

const KYCContext = createContext<KYCContextType | undefined>(undefined)

export function KYCProvider({ children }: { children: ReactNode }) {
  const [kycData, setKYCData] = useState<KYCData>(defaultKYCData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePersonalInfo = useCallback((info: Partial<PersonalInfo>) => {
    setKYCData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        ...info
      } as PersonalInfo,
      status: 'in_progress'
    }))
  }, [])

  const updateDocumentInfo = useCallback((info: Partial<DocumentInfo>) => {
    setKYCData(prev => ({
      ...prev,
      documentInfo: {
        ...prev.documentInfo,
        ...info
      } as DocumentInfo,
      status: 'in_progress'
    }))
  }, [])

  const updateRiskAssessment = useCallback((assessment: Partial<RiskAssessment>) => {
    setKYCData(prev => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        ...assessment
      } as RiskAssessment,
      status: 'in_progress'
    }))
  }, [])

  const setCurrentStep = useCallback((step: number) => {
    setKYCData(prev => ({
      ...prev,
      currentStep: step
    }))
  }, [])

  const markStepCompleted = useCallback((stepName: string) => {
    setKYCData(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepName) 
        ? prev.completedSteps 
        : [...prev.completedSteps, stepName]
    }))
  }, [])

  const submitKYC = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: Integrate with backend API
      // For now, simulate submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setKYCData(prev => ({
        ...prev,
        status: 'under_review',
        submittedAt: new Date().toISOString()
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit KYC')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetKYC = useCallback(() => {
    setKYCData(defaultKYCData)
    setError(null)
  }, [])

  const value: KYCContextType = {
    kycData,
    updatePersonalInfo,
    updateDocumentInfo,
    updateRiskAssessment,
    setCurrentStep,
    markStepCompleted,
    submitKYC,
    resetKYC,
    isLoading,
    error
  }

  return <KYCContext.Provider value={value}>{children}</KYCContext.Provider>
}

export function useKYC() {
  const context = useContext(KYCContext)
  if (context === undefined) {
    throw new Error('useKYC must be used within a KYCProvider')
  }
  return context
}