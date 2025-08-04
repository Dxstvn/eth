"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useAuth } from '@/context/auth-context-v2'
import { kycAPI } from '@/lib/services/kyc-api-service'
import type { KYCStatusResponse } from '@/services/api-config'

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
  sessionId?: string
  kycLevel?: 'none' | 'basic' | 'enhanced' | 'full'
  expiryDate?: string
  facialVerificationStatus?: 'pending' | 'passed' | 'failed'
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
  startKYCSession: (requiredLevel?: 'basic' | 'enhanced' | 'full') => Promise<void>
  uploadDocument: (documentType: string, file: File) => Promise<void>
  performLivenessCheck: (imageData: string) => Promise<void>
  completeKYCSession: () => Promise<void>
  refreshKYCStatus: () => Promise<void>
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
  const { user, authToken } = useAuth()
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

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

  // Fetch KYC status on mount and when user changes
  useEffect(() => {
    if (user && authToken) {
      refreshKYCStatus()
    }
  }, [user, authToken])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const refreshKYCStatus = useCallback(async () => {
    if (!authToken) return
    
    try {
      const statusResponse = await kycAPI.getStatus()
      if (statusResponse.success && statusResponse.status) {
        setKYCData(prev => ({
          ...prev,
          status: statusResponse.status.status === 'approved' ? 'approved' : 
                  statusResponse.status.status === 'rejected' ? 'rejected' :
                  statusResponse.status.status === 'pending' ? 'under_review' : 'in_progress',
          kycLevel: statusResponse.status.level,
          expiryDate: statusResponse.status.expiryDate,
          completedSteps: statusResponse.status.completedSteps || [],
          riskScore: statusResponse.status.riskProfile?.overallRisk || 'low'
        }))
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error)
    }
  }, [authToken])

  const startKYCSession = useCallback(async (requiredLevel: 'basic' | 'enhanced' | 'full' = 'basic') => {
    setIsLoading(true)
    setError(null)
    
    try {
      const sessionResponse = await kycAPI.startSession(requiredLevel)
      if (sessionResponse.success && sessionResponse.session) {
        setKYCData(prev => ({
          ...prev,
          sessionId: sessionResponse.session.sessionId,
          status: 'in_progress'
        }))
        
        // Start polling for status updates
        const interval = setInterval(() => {
          refreshKYCStatus()
        }, 30000) // Poll every 30 seconds
        setPollingInterval(interval)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start KYC session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [refreshKYCStatus])

  const uploadDocument = useCallback(async (documentType: string, file: File) => {
    if (!kycData.sessionId) {
      throw new Error('No active KYC session')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const uploadResponse = await kycAPI.uploadDocument(kycData.sessionId, documentType, file)
      if (uploadResponse.success && uploadResponse.result) {
        // Update document info with extracted data
        if (uploadResponse.result.extractedData) {
          const extractedData = uploadResponse.result.extractedData
          setKYCData(prev => ({
            ...prev,
            personalInfo: {
              ...prev.personalInfo,
              firstName: extractedData.firstName || prev.personalInfo?.firstName || '',
              lastName: extractedData.lastName || prev.personalInfo?.lastName || '',
              dateOfBirth: extractedData.dateOfBirth || prev.personalInfo?.dateOfBirth || ''
            } as PersonalInfo,
            documentInfo: {
              ...prev.documentInfo,
              idType: documentType as any,
              idNumber: extractedData.documentNumber || prev.documentInfo?.idNumber || '',
              idExpiryDate: extractedData.expiryDate || prev.documentInfo?.idExpiryDate || ''
            } as DocumentInfo
          }))
        }
        markStepCompleted('document_upload')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [kycData.sessionId])

  const performLivenessCheck = useCallback(async (imageData: string) => {
    if (!kycData.sessionId) {
      throw new Error('No active KYC session')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const livenessResponse = await kycAPI.performLivenessCheck(kycData.sessionId, imageData)
      if (livenessResponse.success && livenessResponse.result) {
        setKYCData(prev => ({
          ...prev,
          facialVerificationStatus: livenessResponse.result.isLive ? 'passed' : 'failed',
          documentInfo: {
            ...prev.documentInfo,
            selfieUrl: livenessResponse.result.selfieUrl
          } as DocumentInfo
        }))
        
        if (livenessResponse.result.isLive) {
          markStepCompleted('liveness_check')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Liveness check failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [kycData.sessionId])

  const completeKYCSession = useCallback(async () => {
    if (!kycData.sessionId) {
      throw new Error('No active KYC session')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const completeResponse = await kycAPI.completeSession(kycData.sessionId)
      if (completeResponse) {
        setKYCData(prev => ({
          ...prev,
          status: 'under_review',
          submittedAt: new Date().toISOString()
        }))
        
        // Stop polling as KYC is complete
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete KYC session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [kycData.sessionId, pollingInterval])

  const submitKYC = useCallback(async () => {
    // This is now just an alias for completeKYCSession for backward compatibility
    await completeKYCSession()
  }, [completeKYCSession])

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
    error,
    startKYCSession,
    uploadDocument,
    performLivenessCheck,
    completeKYCSession,
    refreshKYCStatus
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