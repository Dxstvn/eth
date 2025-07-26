// Mock Verification Service for KYC Document and Identity Verification
// This service simulates document authenticity checks, face matching, and compliance verification

import { ExtractedDocumentData } from './mock-ocr-service'

export interface VerificationResult {
  success: boolean
  timestamp: string
  verificationId: string
  documentVerification: DocumentVerificationResult
  faceMatch?: FaceMatchResult
  addressProof?: AddressProofResult
  livenessCheck?: LivenessResult
  riskAssessment: RiskAssessment
  complianceCheck: ComplianceResult
  overallStatus: VerificationStatus
  requiresManualReview: boolean
  reviewNotes?: string[]
}

export type VerificationStatus = 'approved' | 'rejected' | 'pending_review' | 'requires_additional_docs'

export interface DocumentVerificationResult {
  isAuthentic: boolean
  confidence: number
  securityFeatures: SecurityFeatureCheck[]
  tampering: TamperingCheck
  documentAge: DocumentAgeCheck
  issues: string[]
}

export interface SecurityFeatureCheck {
  feature: string
  detected: boolean
  confidence: number
}

export interface TamperingCheck {
  detected: boolean
  confidence: number
  suspiciousAreas?: string[]
}

export interface DocumentAgeCheck {
  isValid: boolean
  issueDate?: string
  expiryDate?: string
  remainingValidity?: number // days
}

export interface FaceMatchResult {
  match: boolean
  confidence: number
  livenessScore: number
  facialFeatures: {
    faceDetected: boolean
    quality: number
    landmarks: number
  }
  issues: string[]
}

export interface AddressProofResult {
  verified: boolean
  confidence: number
  documentType: string
  addressMatch: boolean
  issueDate?: string
  issues: string[]
}

export interface LivenessResult {
  isLive: boolean
  confidence: number
  challenges: LivenessChallenge[]
  spoofingRisk: 'low' | 'medium' | 'high'
}

export interface LivenessChallenge {
  type: 'blink' | 'smile' | 'turn_head' | 'open_mouth'
  passed: boolean
  confidence: number
}

export interface RiskAssessment {
  score: number // 0-100 (0 = lowest risk)
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  recommendation: string
}

export interface RiskFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
}

export interface ComplianceResult {
  amlCheck: AMLCheckResult
  sanctionsCheck: SanctionsCheckResult
  pepCheck: PEPCheckResult
  overallCompliance: boolean
}

export interface AMLCheckResult {
  passed: boolean
  matchFound: boolean
  confidence: number
  matchedLists?: string[]
}

export interface SanctionsCheckResult {
  passed: boolean
  matchFound: boolean
  lists: string[]
  matchDetails?: any[]
}

export interface PEPCheckResult {
  isPEP: boolean
  confidence: number
  positions?: string[]
  lastUpdated?: string
}

// Mock verification functions
export async function verifyDocument(
  documentType: string,
  documentData: ExtractedDocumentData,
  imageData?: string | File,
  options?: {
    simulateFailure?: boolean
    failureRate?: number
  }
): Promise<DocumentVerificationResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
  
  const shouldFail = options?.simulateFailure || Math.random() < (options?.failureRate || 0.05)
  
  if (shouldFail) {
    return {
      isAuthentic: false,
      confidence: 45 + Math.random() * 20,
      securityFeatures: [
        { feature: 'Hologram', detected: false, confidence: 30 },
        { feature: 'UV Features', detected: false, confidence: 25 },
        { feature: 'Microprint', detected: true, confidence: 85 }
      ],
      tampering: {
        detected: true,
        confidence: 75,
        suspiciousAreas: ['Photo area', 'Text fields']
      },
      documentAge: {
        isValid: true,
        issueDate: documentData.issueDate,
        expiryDate: documentData.expiryDate,
        remainingValidity: 365
      },
      issues: ['Possible tampering detected', 'Security features not verified']
    }
  }
  
  const confidence = 85 + Math.random() * 15
  
  return {
    isAuthentic: true,
    confidence,
    securityFeatures: [
      { feature: 'Hologram', detected: true, confidence: 90 + Math.random() * 10 },
      { feature: 'UV Features', detected: true, confidence: 85 + Math.random() * 15 },
      { feature: 'Microprint', detected: true, confidence: 88 + Math.random() * 12 },
      { feature: 'Watermark', detected: true, confidence: 92 + Math.random() * 8 },
      { feature: 'Security Thread', detected: true, confidence: 87 + Math.random() * 13 }
    ],
    tampering: {
      detected: false,
      confidence: 90 + Math.random() * 10
    },
    documentAge: {
      isValid: true,
      issueDate: documentData.issueDate,
      expiryDate: documentData.expiryDate,
      remainingValidity: documentData.expiryDate 
        ? Math.floor((new Date(documentData.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0
    },
    issues: []
  }
}

export async function verifyFaceMatch(
  documentImage: string | File,
  selfieImage: string | File,
  options?: {
    simulateFailure?: boolean
  }
): Promise<FaceMatchResult> {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
  
  const shouldFail = options?.simulateFailure || Math.random() < 0.08
  
  if (shouldFail) {
    return {
      match: false,
      confidence: 40 + Math.random() * 20,
      livenessScore: 45 + Math.random() * 15,
      facialFeatures: {
        faceDetected: true,
        quality: 50 + Math.random() * 20,
        landmarks: 68
      },
      issues: ['Face match confidence too low', 'Possible different person']
    }
  }
  
  return {
    match: true,
    confidence: 85 + Math.random() * 15,
    livenessScore: 90 + Math.random() * 10,
    facialFeatures: {
      faceDetected: true,
      quality: 85 + Math.random() * 15,
      landmarks: 68
    },
    issues: []
  }
}

export async function verifyLiveness(
  videoData?: any,
  challenges?: LivenessChallenge[],
  options?: {
    simulateFailure?: boolean
  }
): Promise<LivenessResult> {
  await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))
  
  const shouldFail = options?.simulateFailure || Math.random() < 0.05
  
  const defaultChallenges: LivenessChallenge[] = [
    { type: 'blink', passed: !shouldFail, confidence: shouldFail ? 40 : 95 },
    { type: 'smile', passed: !shouldFail, confidence: shouldFail ? 45 : 92 },
    { type: 'turn_head', passed: !shouldFail, confidence: shouldFail ? 35 : 94 },
    { type: 'open_mouth', passed: !shouldFail, confidence: shouldFail ? 50 : 91 }
  ]
  
  return {
    isLive: !shouldFail,
    confidence: shouldFail ? 45 + Math.random() * 20 : 88 + Math.random() * 12,
    challenges: challenges || defaultChallenges,
    spoofingRisk: shouldFail ? 'high' : 'low'
  }
}

export async function verifyAddress(
  addressDocument: any,
  expectedAddress: any,
  options?: {
    simulateFailure?: boolean
  }
): Promise<AddressProofResult> {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500))
  
  const shouldFail = options?.simulateFailure || Math.random() < 0.07
  
  const documentTypes = ['Utility Bill', 'Bank Statement', 'Lease Agreement', 'Tax Document']
  const documentType = documentTypes[Math.floor(Math.random() * documentTypes.length)]
  
  if (shouldFail) {
    return {
      verified: false,
      confidence: 50 + Math.random() * 20,
      documentType,
      addressMatch: false,
      issueDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      issues: ['Address does not match', 'Document too old (> 90 days)']
    }
  }
  
  return {
    verified: true,
    confidence: 85 + Math.random() * 15,
    documentType,
    addressMatch: true,
    issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issues: []
  }
}

export async function performRiskAssessment(
  userData: any,
  verificationResults: any
): Promise<RiskAssessment> {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const factors: RiskFactor[] = []
  let totalScore = 0
  
  // Document authenticity factor
  if (verificationResults.documentVerification?.isAuthentic) {
    factors.push({
      factor: 'Document Authenticity',
      impact: 'positive',
      weight: 0.3,
      description: 'Document passed authenticity checks'
    })
  } else {
    factors.push({
      factor: 'Document Authenticity',
      impact: 'negative',
      weight: 0.3,
      description: 'Document failed authenticity checks'
    })
    totalScore += 30
  }
  
  // Face match factor
  if (verificationResults.faceMatch?.match) {
    factors.push({
      factor: 'Biometric Verification',
      impact: 'positive',
      weight: 0.25,
      description: 'Face match successful'
    })
  } else {
    factors.push({
      factor: 'Biometric Verification',
      impact: 'negative',
      weight: 0.25,
      description: 'Face match failed or not performed'
    })
    totalScore += 25
  }
  
  // Liveness factor
  if (verificationResults.livenessCheck?.isLive) {
    factors.push({
      factor: 'Liveness Detection',
      impact: 'positive',
      weight: 0.2,
      description: 'User passed liveness check'
    })
  } else {
    factors.push({
      factor: 'Liveness Detection',
      impact: 'negative',
      weight: 0.2,
      description: 'Liveness check failed or suspicious'
    })
    totalScore += 20
  }
  
  // Address verification factor
  if (verificationResults.addressProof?.verified) {
    factors.push({
      factor: 'Address Verification',
      impact: 'positive',
      weight: 0.15,
      description: 'Address successfully verified'
    })
  } else {
    factors.push({
      factor: 'Address Verification',
      impact: 'neutral',
      weight: 0.15,
      description: 'Address verification pending'
    })
    totalScore += 10
  }
  
  // Age factor
  const age = userData.age || 25
  if (age < 18 || age > 80) {
    factors.push({
      factor: 'Age Risk',
      impact: 'negative',
      weight: 0.1,
      description: 'Age outside typical range'
    })
    totalScore += 10
  } else {
    factors.push({
      factor: 'Age Risk',
      impact: 'positive',
      weight: 0.1,
      description: 'Age within normal range'
    })
  }
  
  const level = totalScore < 20 ? 'low' : 
                totalScore < 50 ? 'medium' : 
                totalScore < 75 ? 'high' : 'critical'
  
  const recommendations = {
    low: 'Approve - Low risk profile',
    medium: 'Approve with enhanced monitoring',
    high: 'Manual review recommended',
    critical: 'Reject or require additional verification'
  }
  
  return {
    score: totalScore,
    level,
    factors,
    recommendation: recommendations[level]
  }
}

export async function performComplianceChecks(
  userData: any,
  options?: {
    simulatePEP?: boolean
    simulateAMLHit?: boolean
    simulateSanctionsHit?: boolean
  }
): Promise<ComplianceResult> {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
  
  const amlCheck: AMLCheckResult = {
    passed: !options?.simulateAMLHit && Math.random() > 0.02,
    matchFound: options?.simulateAMLHit || Math.random() < 0.02,
    confidence: 95 + Math.random() * 5,
    matchedLists: options?.simulateAMLHit ? ['FATF Grey List', 'FinCEN Alert'] : undefined
  }
  
  const sanctionsCheck: SanctionsCheckResult = {
    passed: !options?.simulateSanctionsHit && Math.random() > 0.01,
    matchFound: options?.simulateSanctionsHit || Math.random() < 0.01,
    lists: ['OFAC SDN', 'UN Consolidated', 'EU Sanctions', 'UK HM Treasury'],
    matchDetails: options?.simulateSanctionsHit ? [{ list: 'OFAC SDN', score: 85 }] : undefined
  }
  
  const pepCheck: PEPCheckResult = {
    isPEP: options?.simulatePEP || Math.random() < 0.05,
    confidence: 90 + Math.random() * 10,
    positions: options?.simulatePEP ? ['Former Government Official', 'Board Member'] : undefined,
    lastUpdated: new Date().toISOString()
  }
  
  return {
    amlCheck,
    sanctionsCheck,
    pepCheck,
    overallCompliance: amlCheck.passed && sanctionsCheck.passed
  }
}

export async function performFullVerification(
  documentData: ExtractedDocumentData,
  documentImage: string | File,
  selfieImage: string | File,
  addressDocument?: any,
  options?: {
    simulateFailure?: boolean
    failureRate?: number
  }
): Promise<VerificationResult> {
  const verificationId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Perform all verifications
  const [documentVerification, faceMatch, livenessCheck, addressProof, complianceCheck] = await Promise.all([
    verifyDocument(documentData.documentType, documentData, documentImage, options),
    verifyFaceMatch(documentImage, selfieImage, options),
    verifyLiveness(undefined, undefined, options),
    addressDocument ? verifyAddress(addressDocument, documentData.address, options) : Promise.resolve(undefined),
    performComplianceChecks({ 
      name: documentData.fullName,
      dob: documentData.dateOfBirth,
      nationality: documentData.nationality
    })
  ])
  
  const riskAssessment = await performRiskAssessment(
    { age: documentData.dateOfBirth ? new Date().getFullYear() - new Date(documentData.dateOfBirth).getFullYear() : 30 },
    { documentVerification, faceMatch, livenessCheck, addressProof }
  )
  
  // Determine overall status
  let overallStatus: VerificationStatus = 'approved'
  let requiresManualReview = false
  const reviewNotes: string[] = []
  
  if (!documentVerification.isAuthentic || !faceMatch.match || !livenessCheck.isLive) {
    overallStatus = 'rejected'
    reviewNotes.push('Failed primary verification checks')
  } else if (!complianceCheck.overallCompliance) {
    overallStatus = 'pending_review'
    requiresManualReview = true
    reviewNotes.push('Compliance check requires manual review')
  } else if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
    overallStatus = 'pending_review'
    requiresManualReview = true
    reviewNotes.push(`Risk level: ${riskAssessment.level}`)
  } else if (documentVerification.confidence < 80 || faceMatch.confidence < 80) {
    requiresManualReview = true
    reviewNotes.push('Low confidence scores detected')
  }
  
  return {
    success: overallStatus !== 'rejected',
    timestamp: new Date().toISOString(),
    verificationId,
    documentVerification,
    faceMatch,
    addressProof,
    livenessCheck,
    riskAssessment,
    complianceCheck,
    overallStatus,
    requiresManualReview,
    reviewNotes: reviewNotes.length > 0 ? reviewNotes : undefined
  }
}

// Helper function to generate verification report
export function generateVerificationReport(result: VerificationResult): string {
  const sections = [
    `# KYC Verification Report`,
    `## Summary`,
    `- **Verification ID**: ${result.verificationId}`,
    `- **Date**: ${new Date(result.timestamp).toLocaleDateString()}`,
    `- **Status**: ${result.overallStatus.toUpperCase()}`,
    `- **Manual Review Required**: ${result.requiresManualReview ? 'Yes' : 'No'}`,
    ``,
    `## Document Verification`,
    `- **Authentic**: ${result.documentVerification.isAuthentic ? 'Yes' : 'No'}`,
    `- **Confidence**: ${result.documentVerification.confidence.toFixed(1)}%`,
    `- **Security Features**: ${result.documentVerification.securityFeatures.filter(f => f.detected).length}/${result.documentVerification.securityFeatures.length} detected`,
    `- **Tampering**: ${result.documentVerification.tampering.detected ? 'Detected' : 'Not detected'}`,
    ``
  ]
  
  if (result.faceMatch) {
    sections.push(
      `## Biometric Verification`,
      `- **Face Match**: ${result.faceMatch.match ? 'Success' : 'Failed'}`,
      `- **Confidence**: ${result.faceMatch.confidence.toFixed(1)}%`,
      `- **Liveness Score**: ${result.faceMatch.livenessScore.toFixed(1)}%`,
      ``
    )
  }
  
  if (result.livenessCheck) {
    sections.push(
      `## Liveness Detection`,
      `- **Live Person**: ${result.livenessCheck.isLive ? 'Yes' : 'No'}`,
      `- **Confidence**: ${result.livenessCheck.confidence.toFixed(1)}%`,
      `- **Spoofing Risk**: ${result.livenessCheck.spoofingRisk}`,
      ``
    )
  }
  
  sections.push(
    `## Risk Assessment`,
    `- **Risk Score**: ${result.riskAssessment.score}/100`,
    `- **Risk Level**: ${result.riskAssessment.level.toUpperCase()}`,
    `- **Recommendation**: ${result.riskAssessment.recommendation}`,
    ``,
    `## Compliance Checks`,
    `- **AML Check**: ${result.complianceCheck.amlCheck.passed ? 'Passed' : 'Failed'}`,
    `- **Sanctions Check**: ${result.complianceCheck.sanctionsCheck.passed ? 'Passed' : 'Failed'}`,
    `- **PEP Status**: ${result.complianceCheck.pepCheck.isPEP ? 'Yes' : 'No'}`,
    ``
  )
  
  if (result.reviewNotes && result.reviewNotes.length > 0) {
    sections.push(
      `## Review Notes`,
      ...result.reviewNotes.map(note => `- ${note}`),
      ``
    )
  }
  
  return sections.join('\n')
}