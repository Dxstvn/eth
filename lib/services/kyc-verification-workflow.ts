// KYC Verification Workflow Service
// Orchestrates the complete KYC verification process

import { performOCR, validateOCRResult, ExtractedDocumentData, OCRResult } from './mock-ocr-service'
import {
  performFullVerification,
  verifyDocument,
  verifyFaceMatch,
  verifyLiveness,
  verifyAddress,
  performComplianceChecks,
  performRiskAssessment,
  generateVerificationReport,
  VerificationResult,
  VerificationStatus,
  DocumentVerificationResult,
  FaceMatchResult,
  LivenessResult,
  AddressProofResult
} from './mock-verification-service'

export interface KYCWorkflowOptions {
  enableOCR?: boolean
  enableDocumentVerification?: boolean
  enableFaceMatch?: boolean
  enableLiveness?: boolean
  enableAddressProof?: boolean
  enableComplianceChecks?: boolean
  maxRetries?: number
  autoRetryOnLowQuality?: boolean
}

export interface KYCWorkflowResult {
  success: boolean
  status: WorkflowStatus
  verificationId: string
  startTime: string
  endTime: string
  duration: number // milliseconds
  steps: WorkflowStep[]
  ocrResults?: Record<string, OCRResult>
  verificationResult?: VerificationResult
  report?: string
  retryCount: number
  errors: WorkflowError[]
  recommendations: string[]
}

export type WorkflowStatus = 
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'requires_retry'
  | 'requires_manual_review'
  | 'abandoned'

export interface WorkflowStep {
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  startTime?: string
  endTime?: string
  duration?: number
  result?: any
  error?: string
}

export interface WorkflowError {
  step: string
  code: string
  message: string
  timestamp: string
  recoverable: boolean
}

export class KYCVerificationWorkflow {
  private options: Required<KYCWorkflowOptions>
  private steps: WorkflowStep[] = []
  private errors: WorkflowError[] = []
  private retryCount = 0
  
  constructor(options: KYCWorkflowOptions = {}) {
    this.options = {
      enableOCR: true,
      enableDocumentVerification: true,
      enableFaceMatch: true,
      enableLiveness: true,
      enableAddressProof: true,
      enableComplianceChecks: true,
      maxRetries: 3,
      autoRetryOnLowQuality: true,
      ...options
    }
    
    this.initializeSteps()
  }
  
  private initializeSteps() {
    const stepConfigs = [
      { name: 'OCR Extraction', enabled: this.options.enableOCR },
      { name: 'Document Verification', enabled: this.options.enableDocumentVerification },
      { name: 'Face Matching', enabled: this.options.enableFaceMatch },
      { name: 'Liveness Detection', enabled: this.options.enableLiveness },
      { name: 'Address Verification', enabled: this.options.enableAddressProof },
      { name: 'Compliance Checks', enabled: this.options.enableComplianceChecks },
      { name: 'Risk Assessment', enabled: true },
      { name: 'Final Review', enabled: true }
    ]
    
    this.steps = stepConfigs.map(config => ({
      name: config.name,
      status: config.enabled ? 'pending' : 'skipped'
    }))
  }
  
  private updateStep(
    stepName: string,
    updates: Partial<WorkflowStep>
  ) {
    const step = this.steps.find(s => s.name === stepName)
    if (step) {
      Object.assign(step, updates)
      if (updates.startTime && updates.endTime) {
        step.duration = new Date(updates.endTime).getTime() - new Date(updates.startTime).getTime()
      }
    }
  }
  
  private addError(
    step: string,
    code: string,
    message: string,
    recoverable = true
  ) {
    this.errors.push({
      step,
      code,
      message,
      timestamp: new Date().toISOString(),
      recoverable
    })
  }
  
  async executeWorkflow(
    documents: {
      type: 'passport' | 'drivers_license' | 'id_card'
      frontImage: string | File
      backImage?: string | File
    }[],
    selfieImage: string | File,
    addressDocument?: {
      image: string | File
      type: string
    }
  ): Promise<KYCWorkflowResult> {
    const workflowId = `KYC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date().toISOString()
    
    let ocrResults: Record<string, OCRResult> = {}
    let extractedData: ExtractedDocumentData | null = null
    let verificationResult: VerificationResult | null = null
    let workflowStatus: WorkflowStatus = 'in_progress'
    
    try {
      // Step 1: OCR Extraction
      if (this.options.enableOCR) {
        const ocrStepStart = new Date().toISOString()
        this.updateStep('OCR Extraction', { status: 'in_progress', startTime: ocrStepStart })
        
        for (const doc of documents) {
          const ocrResult = await performOCR(doc.type, doc.frontImage)
          ocrResults[`${doc.type}_front`] = ocrResult
          
          if (doc.backImage) {
            const backOcrResult = await performOCR(doc.type, doc.backImage)
            ocrResults[`${doc.type}_back`] = backOcrResult
          }
          
          // Use the first successful OCR result
          if (ocrResult.success && ocrResult.extractedData && !extractedData) {
            extractedData = ocrResult.extractedData
          }
          
          // Check if OCR quality is too low
          if (ocrResult.requiresManualReview && this.options.autoRetryOnLowQuality && this.retryCount < this.options.maxRetries) {
            this.addError('OCR Extraction', 'LOW_QUALITY', 'OCR quality too low, retry recommended')
            workflowStatus = 'requires_retry'
          }
        }
        
        this.updateStep('OCR Extraction', {
          status: extractedData ? 'completed' : 'failed',
          endTime: new Date().toISOString(),
          result: { extractedCount: Object.keys(ocrResults).length, success: !!extractedData }
        })
        
        if (!extractedData) {
          throw new Error('OCR extraction failed for all documents')
        }
      }
      
      // Step 2-6: Full Verification
      if (extractedData) {
        const verificationStepStart = new Date().toISOString()
        this.updateStep('Document Verification', { status: 'in_progress', startTime: verificationStepStart })
        
        // Use the primary document for verification
        const primaryDoc = documents[0]
        
        verificationResult = await performFullVerification(
          extractedData,
          primaryDoc.frontImage,
          selfieImage,
          addressDocument?.image,
          { failureRate: 0.1 } // 10% failure rate for simulation
        )
        
        // Update individual step statuses based on verification result
        this.updateStep('Document Verification', {
          status: verificationResult.documentVerification.isAuthentic ? 'completed' : 'failed',
          endTime: new Date().toISOString(),
          result: verificationResult.documentVerification
        })
        
        if (verificationResult.faceMatch) {
          this.updateStep('Face Matching', {
            status: verificationResult.faceMatch.match ? 'completed' : 'failed',
            startTime: verificationStepStart,
            endTime: new Date().toISOString(),
            result: verificationResult.faceMatch
          })
        }
        
        if (verificationResult.livenessCheck) {
          this.updateStep('Liveness Detection', {
            status: verificationResult.livenessCheck.isLive ? 'completed' : 'failed',
            startTime: verificationStepStart,
            endTime: new Date().toISOString(),
            result: verificationResult.livenessCheck
          })
        }
        
        if (verificationResult.addressProof) {
          this.updateStep('Address Verification', {
            status: verificationResult.addressProof.verified ? 'completed' : 'failed',
            startTime: verificationStepStart,
            endTime: new Date().toISOString(),
            result: verificationResult.addressProof
          })
        }
        
        this.updateStep('Compliance Checks', {
          status: verificationResult.complianceCheck.overallCompliance ? 'completed' : 'failed',
          startTime: verificationStepStart,
          endTime: new Date().toISOString(),
          result: verificationResult.complianceCheck
        })
        
        this.updateStep('Risk Assessment', {
          status: 'completed',
          startTime: verificationStepStart,
          endTime: new Date().toISOString(),
          result: verificationResult.riskAssessment
        })
      }
      
      // Step 7: Final Review
      const finalReviewStart = new Date().toISOString()
      this.updateStep('Final Review', { status: 'in_progress', startTime: finalReviewStart })
      
      // Determine final workflow status
      if (verificationResult) {
        switch (verificationResult.overallStatus) {
          case 'approved':
            workflowStatus = 'completed'
            break
          case 'rejected':
            workflowStatus = 'failed'
            break
          case 'pending_review':
            workflowStatus = 'requires_manual_review'
            break
          case 'requires_additional_docs':
            workflowStatus = 'requires_retry'
            break
        }
      }
      
      this.updateStep('Final Review', {
        status: 'completed',
        endTime: new Date().toISOString(),
        result: { finalStatus: workflowStatus }
      })
      
    } catch (error) {
      workflowStatus = 'failed'
      this.addError(
        'Workflow',
        'WORKFLOW_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        false
      )
    }
    
    const endTime = new Date().toISOString()
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      ocrResults,
      verificationResult,
      workflowStatus
    )
    
    // Generate report if verification was performed
    const report = verificationResult ? generateVerificationReport(verificationResult) : undefined
    
    return {
      success: workflowStatus === 'completed',
      status: workflowStatus,
      verificationId: workflowId,
      startTime,
      endTime,
      duration,
      steps: this.steps,
      ocrResults: Object.keys(ocrResults).length > 0 ? ocrResults : undefined,
      verificationResult: verificationResult || undefined,
      report,
      retryCount: this.retryCount,
      errors: this.errors,
      recommendations
    }
  }
  
  async retryWorkflow(
    previousResult: KYCWorkflowResult,
    documents: {
      type: 'passport' | 'drivers_license' | 'id_card'
      frontImage: string | File
      backImage?: string | File
    }[],
    selfieImage: string | File,
    addressDocument?: {
      image: string | File
      type: string
    }
  ): Promise<KYCWorkflowResult> {
    // Reset state for retry
    this.retryCount = previousResult.retryCount + 1
    this.errors = []
    this.initializeSteps()
    
    // Mark previously failed steps for retry
    previousResult.steps.forEach(step => {
      if (step.status === 'failed') {
        const currentStep = this.steps.find(s => s.name === step.name)
        if (currentStep) {
          currentStep.status = 'pending'
        }
      }
    })
    
    if (this.retryCount > this.options.maxRetries) {
      return {
        ...previousResult,
        status: 'abandoned',
        errors: [
          ...previousResult.errors,
          {
            step: 'Workflow',
            code: 'MAX_RETRIES_EXCEEDED',
            message: `Maximum retry attempts (${this.options.maxRetries}) exceeded`,
            timestamp: new Date().toISOString(),
            recoverable: false
          }
        ],
        recommendations: ['Manual review required - automated verification failed']
      }
    }
    
    return this.executeWorkflow(documents, selfieImage, addressDocument)
  }
  
  private generateRecommendations(
    ocrResults: Record<string, OCRResult>,
    verificationResult: VerificationResult | null,
    status: WorkflowStatus
  ): string[] {
    const recommendations: string[] = []
    
    // OCR-based recommendations
    Object.entries(ocrResults).forEach(([key, result]) => {
      if (result.requiresManualReview) {
        recommendations.push(`Re-upload ${key.replace('_', ' ')} with better quality`)
      }
      if (result.confidence < 70) {
        recommendations.push(`Ensure ${key.replace('_', ' ')} is clearly visible and well-lit`)
      }
    })
    
    // Verification-based recommendations
    if (verificationResult) {
      if (!verificationResult.documentVerification.isAuthentic) {
        recommendations.push('Upload a genuine government-issued document')
      }
      
      if (verificationResult.faceMatch && !verificationResult.faceMatch.match) {
        recommendations.push('Ensure selfie clearly shows your face matching the document photo')
      }
      
      if (verificationResult.livenessCheck && !verificationResult.livenessCheck.isLive) {
        recommendations.push('Complete liveness check with better lighting and stable camera')
      }
      
      if (verificationResult.riskAssessment.level === 'high' || verificationResult.riskAssessment.level === 'critical') {
        recommendations.push('Additional documentation may be required for verification')
      }
      
      if (!verificationResult.complianceCheck.overallCompliance) {
        recommendations.push('Manual review required for compliance verification')
      }
    }
    
    // Status-based recommendations
    switch (status) {
      case 'requires_retry':
        recommendations.push('Please retry with higher quality images')
        break
      case 'requires_manual_review':
        recommendations.push('Your application will be reviewed by our compliance team')
        break
      case 'failed':
        recommendations.push('Contact support for assistance with verification')
        break
    }
    
    return [...new Set(recommendations)] // Remove duplicates
  }
  
  // Helper method to get current progress percentage
  getProgress(): number {
    const totalSteps = this.steps.filter(s => s.status !== 'skipped').length
    const completedSteps = this.steps.filter(s => s.status === 'completed').length
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  }
  
  // Helper method to get estimated time remaining
  getEstimatedTimeRemaining(): number {
    const pendingSteps = this.steps.filter(s => s.status === 'pending').length
    const avgStepDuration = 3000 // 3 seconds average per step
    return pendingSteps * avgStepDuration
  }
}

// Convenience function for simple verification
export async function quickVerify(
  documentType: 'passport' | 'drivers_license' | 'id_card',
  documentFront: string | File,
  documentBack: string | File | undefined,
  selfie: string | File,
  options?: KYCWorkflowOptions
): Promise<KYCWorkflowResult> {
  const workflow = new KYCVerificationWorkflow(options)
  
  return workflow.executeWorkflow(
    [{
      type: documentType,
      frontImage: documentFront,
      backImage: documentBack
    }],
    selfie
  )
}

// Export workflow states for UI integration
export const WORKFLOW_STEPS = [
  'OCR Extraction',
  'Document Verification',
  'Face Matching',
  'Liveness Detection',
  'Address Verification',
  'Compliance Checks',
  'Risk Assessment',
  'Final Review'
] as const

export type WorkflowStepName = typeof WORKFLOW_STEPS[number]