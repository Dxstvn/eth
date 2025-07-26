"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { 
  KYCActionType, 
  kycAuditActions,
  kycAuditLogger 
} from '@/lib/services/kyc-audit-logger'
import { kycSecurityMonitor } from '@/lib/security/kyc-monitoring'

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
  kycId: string
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
  isUserBlocked: boolean
  viewPersonalInfo: (fields?: string[]) => void
  uploadDocument: (documentType: string, fileName: string, fileSize: number) => void
  deleteDocument: (documentType: string, fileName: string) => void
}

const defaultKYCData: KYCData = {
  kycId: uuidv4(),
  status: 'not_started',
  completedSteps: [],
  currentStep: 0
}

const KYCContext = createContext<KYCContextType | undefined>(undefined)

export function KYCProviderWithAudit({ children }: { children: ReactNode }) {
  const [kycData, setKYCData] = useState<KYCData>(defaultKYCData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUserBlocked, setIsUserBlocked] = useState(false)
  
  // Check if user is blocked on mount
  useEffect(() => {
    const checkUserBlocked = () => {
      try {
        const authData = localStorage.getItem('clearhold_auth_token')
        if (authData) {
          const parsed = JSON.parse(authData)
          const userId = parsed.userId
          if (userId && kycSecurityMonitor.isUserBlocked(userId)) {
            setIsUserBlocked(true)
            setError('Your account has been temporarily blocked due to security concerns.')
          }
        }
      } catch (err) {
        console.error('Failed to check user block status:', err)
      }
    }
    
    checkUserBlocked()
  }, [])
  
  // View personal info with audit logging
  const viewPersonalInfo = useCallback((fields?: string[]) => {
    if (isUserBlocked) return
    
    kycAuditActions.logPersonalInfoView(kycData.kycId, fields)
  }, [kycData.kycId, isUserBlocked])
  
  // Update personal info with audit logging
  const updatePersonalInfo = useCallback((info: Partial<PersonalInfo>) => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      return
    }
    
    const previousInfo = kycData.personalInfo || {}
    
    // Log each field change
    Object.entries(info).forEach(([field, value]) => {
      if (previousInfo[field as keyof PersonalInfo] !== value) {
        kycAuditActions.logPersonalInfoUpdate(
          kycData.kycId,
          field,
          previousInfo[field as keyof PersonalInfo],
          value
        )
      }
    })
    
    setKYCData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        ...info
      } as PersonalInfo,
      status: 'in_progress'
    }))
    
    // Log overall personal info submission if all required fields are filled
    const updatedInfo = { ...previousInfo, ...info } as PersonalInfo
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'email']
    const allFieldsFilled = requiredFields.every(field => updatedInfo[field as keyof PersonalInfo])
    
    if (allFieldsFilled) {
      kycAuditLogger.log(KYCActionType.PERSONAL_INFO_SUBMITTED, {
        completedFields: Object.keys(updatedInfo).length
      }, { kycId: kycData.kycId })
    }
  }, [kycData.personalInfo, kycData.kycId, isUserBlocked])
  
  // Update document info with audit logging
  const updateDocumentInfo = useCallback((info: Partial<DocumentInfo>) => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      return
    }
    
    const previousInfo = kycData.documentInfo || {}
    
    // Log document updates
    Object.entries(info).forEach(([field, value]) => {
      if (field.includes('Url') && value && previousInfo[field as keyof DocumentInfo] !== value) {
        kycAuditLogger.log(KYCActionType.DOCUMENT_VERIFIED, {
          documentField: field,
          documentType: field.replace('Url', '')
        }, { kycId: kycData.kycId })
      }
    })
    
    setKYCData(prev => ({
      ...prev,
      documentInfo: {
        ...prev.documentInfo,
        ...info
      } as DocumentInfo,
      status: 'in_progress'
    }))
  }, [kycData.documentInfo, kycData.kycId, isUserBlocked])
  
  // Upload document with audit logging
  const uploadDocument = useCallback((documentType: string, fileName: string, fileSize: number) => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      return
    }
    
    kycAuditActions.logDocumentUpload(kycData.kycId, documentType, fileName, fileSize)
  }, [kycData.kycId, isUserBlocked])
  
  // Delete document with audit logging
  const deleteDocument = useCallback((documentType: string, fileName: string) => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      return
    }
    
    kycAuditActions.logDocumentDeletion(kycData.kycId, documentType, fileName)
  }, [kycData.kycId, isUserBlocked])
  
  // Update risk assessment with audit logging
  const updateRiskAssessment = useCallback((assessment: Partial<RiskAssessment>) => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      return
    }
    
    const previousAssessment = kycData.riskAssessment || {}
    
    // Log risk assessment start
    if (!previousAssessment.sourceOfFunds && assessment.sourceOfFunds) {
      kycAuditLogger.log(KYCActionType.RISK_ASSESSMENT_STARTED, {}, { kycId: kycData.kycId })
    }
    
    // Log PEP/Sanctions changes
    if (assessment.isPEP !== undefined && assessment.isPEP !== previousAssessment.isPEP) {
      kycAuditLogger.log(KYCActionType.RISK_ASSESSMENT_UPDATED, {
        field: 'isPEP',
        value: assessment.isPEP
      }, { 
        kycId: kycData.kycId,
        dataClassification: 'restricted'
      })
    }
    
    if (assessment.hasSanctions !== undefined && assessment.hasSanctions !== previousAssessment.hasSanctions) {
      kycAuditLogger.log(KYCActionType.RISK_ASSESSMENT_UPDATED, {
        field: 'hasSanctions',
        value: assessment.hasSanctions
      }, { 
        kycId: kycData.kycId,
        dataClassification: 'restricted'
      })
    }
    
    setKYCData(prev => ({
      ...prev,
      riskAssessment: {
        ...prev.riskAssessment,
        ...assessment
      } as RiskAssessment,
      status: 'in_progress'
    }))
    
    // Log risk assessment submission
    const updatedAssessment = { ...previousAssessment, ...assessment } as RiskAssessment
    if (updatedAssessment.acceptedTerms && updatedAssessment.consentToScreening) {
      kycAuditLogger.log(KYCActionType.RISK_ASSESSMENT_SUBMITTED, {
        isPEP: updatedAssessment.isPEP,
        hasSanctions: updatedAssessment.hasSanctions,
        hasUSPersonStatus: updatedAssessment.hasUSPersonStatus
      }, { 
        kycId: kycData.kycId,
        dataClassification: 'restricted'
      })
    }
  }, [kycData.riskAssessment, kycData.kycId, isUserBlocked])
  
  // Set current step with tracking
  const setCurrentStep = useCallback((step: number) => {
    setKYCData(prev => ({
      ...prev,
      currentStep: step
    }))
  }, [])
  
  // Mark step completed with tracking
  const markStepCompleted = useCallback((stepName: string) => {
    setKYCData(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepName) 
        ? prev.completedSteps 
        : [...prev.completedSteps, stepName]
    }))
  }, [])
  
  // Submit KYC with comprehensive audit logging
  const submitKYC = useCallback(async () => {
    if (isUserBlocked) {
      setError('Action blocked due to security restrictions')
      throw new Error('User blocked')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const previousStatus = kycData.status
      
      // TODO: Integrate with backend API
      // For now, simulate submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newStatus = 'under_review'
      const submittedAt = new Date().toISOString()
      
      // Log status change
      kycAuditActions.logStatusChange(
        kycData.kycId,
        previousStatus,
        newStatus,
        'KYC submitted for review'
      )
      
      // Calculate risk score based on risk assessment
      let riskScore: 'low' | 'medium' | 'high' = 'low'
      if (kycData.riskAssessment) {
        if (kycData.riskAssessment.isPEP || kycData.riskAssessment.hasSanctions) {
          riskScore = 'high'
        } else if (kycData.riskAssessment.hasUSPersonStatus) {
          riskScore = 'medium'
        }
      }
      
      setKYCData(prev => ({
        ...prev,
        status: newStatus,
        submittedAt,
        riskScore
      }))
      
      // Log comprehensive submission event
      kycAuditLogger.log(KYCActionType.KYC_STATUS_CHANGED, {
        statusFrom: previousStatus,
        statusTo: newStatus,
        submittedAt,
        riskScore,
        completedSteps: kycData.completedSteps.join(', ')
      }, { 
        kycId: kycData.kycId,
        dataClassification: 'confidential'
      })
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit KYC'
      setError(errorMessage)
      
      // Log failed submission
      kycAuditLogger.log(KYCActionType.KYC_FAILED_AUTH_ATTEMPT, {
        reason: errorMessage,
        step: 'KYC submission'
      }, { kycId: kycData.kycId })
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [kycData, isUserBlocked])
  
  // Reset KYC with audit logging
  const resetKYC = useCallback(() => {
    const newKycId = uuidv4()
    
    // Log KYC reset
    kycAuditLogger.log(KYCActionType.KYC_STATUS_CHANGED, {
      statusFrom: kycData.status,
      statusTo: 'not_started',
      reason: 'KYC process reset',
      previousKycId: kycData.kycId,
      newKycId
    }, { kycId: kycData.kycId })
    
    setKYCData({
      ...defaultKYCData,
      kycId: newKycId
    })
    setError(null)
    setIsUserBlocked(false)
  }, [kycData.status, kycData.kycId])
  
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
    error,
    isUserBlocked,
    viewPersonalInfo,
    uploadDocument,
    deleteDocument
  }
  
  return <KYCContext.Provider value={value}>{children}</KYCContext.Provider>
}

export function useKYCWithAudit() {
  const context = useContext(KYCContext)
  if (context === undefined) {
    throw new Error('useKYCWithAudit must be used within a KYCProviderWithAudit')
  }
  return context
}