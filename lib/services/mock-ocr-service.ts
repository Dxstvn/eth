// Mock OCR Service for KYC Document Processing
// This service simulates OCR extraction from identity documents

export interface OCRResult {
  success: boolean
  confidence: number // 0-100
  processingTime: number // milliseconds
  extractedData: ExtractedDocumentData | null
  errors?: OCRError[]
  rawText?: string
  requiresManualReview?: boolean
}

export interface ExtractedDocumentData {
  // Personal Information
  firstName?: string
  lastName?: string
  fullName?: string
  dateOfBirth?: string
  gender?: 'M' | 'F' | 'X'
  nationality?: string
  
  // Document Information
  documentNumber: string
  documentType: 'passport' | 'drivers_license' | 'id_card'
  issuingCountry?: string
  issuingAuthority?: string
  issueDate?: string
  expiryDate?: string
  
  // Address Information (for driver's license and ID cards)
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    fullAddress?: string
  }
  
  // Additional Fields
  mrzData?: string // Machine Readable Zone for passports
  licenseClass?: string // For driver's licenses
  restrictions?: string[] // For driver's licenses
  organDonor?: boolean // For driver's licenses
  
  // Field Confidence Scores
  fieldConfidence?: Record<string, number>
}

export interface OCRError {
  code: string
  message: string
  field?: string
  severity: 'low' | 'medium' | 'high'
}

// Mock data generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'James', 'Mary']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
const streets = ['Main St', 'Oak Ave', 'Elm St', 'Park Rd', 'First Ave', 'Second St', 'Maple Dr', 'Washington Blvd']
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego']
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA']

function generateRandomDate(minYear: number, maxYear: number): string {
  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 28) + 1
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function generateDocumentNumber(type: string): string {
  const prefix = type === 'passport' ? 'P' : type === 'drivers_license' ? 'DL' : 'ID'
  const numbers = Math.floor(Math.random() * 900000000) + 100000000
  return `${prefix}${numbers}`
}

function generateAddress() {
  const streetNumber = Math.floor(Math.random() * 9999) + 1
  const street = streets[Math.floor(Math.random() * streets.length)]
  const city = cities[Math.floor(Math.random() * cities.length)]
  const stateIndex = cities.indexOf(city)
  const state = states[stateIndex] || states[0]
  const postalCode = Math.floor(Math.random() * 90000) + 10000
  
  return {
    street: `${streetNumber} ${street}`,
    city,
    state,
    postalCode: postalCode.toString(),
    country: 'USA',
    fullAddress: `${streetNumber} ${street}, ${city}, ${state} ${postalCode}`
  }
}

function generateMRZ(data: ExtractedDocumentData): string {
  // Simplified MRZ generation for passports
  const country = data.issuingCountry || 'USA'
  const surname = (data.lastName || 'SMITH').toUpperCase().padEnd(20, '<')
  const givenNames = (data.firstName || 'JOHN').toUpperCase().padEnd(20, '<')
  const docNumber = data.documentNumber.padEnd(9, '<')
  const dob = data.dateOfBirth?.replace(/-/g, '').slice(2) || '900101'
  const exp = data.expiryDate?.replace(/-/g, '').slice(2) || '301231'
  
  return `P<${country}${surname}${givenNames}<<\n${docNumber}<0${country}${dob}<0${exp}<0<<<<<<<<<<<<<<00`
}

// Simulate OCR processing with realistic delays and occasional errors
export async function performOCR(
  documentType: 'passport' | 'drivers_license' | 'id_card',
  imageData: string | File,
  options?: {
    simulateError?: boolean
    simulateLowQuality?: boolean
    processingDelay?: number
  }
): Promise<OCRResult> {
  // Simulate processing delay (1-3 seconds by default)
  const delay = options?.processingDelay || Math.floor(Math.random() * 2000) + 1000
  const startTime = Date.now()
  
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // 10% chance of failure or if explicitly requested
  if (Math.random() < 0.1 || options?.simulateError) {
    return {
      success: false,
      confidence: 0,
      processingTime: Date.now() - startTime,
      extractedData: null,
      errors: [{
        code: 'OCR_FAILED',
        message: 'Failed to extract text from document',
        severity: 'high'
      }]
    }
  }
  
  // Generate mock extracted data
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const isLowQuality = options?.simulateLowQuality || Math.random() < 0.15
  
  const extractedData: ExtractedDocumentData = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    dateOfBirth: generateRandomDate(1950, 2005),
    gender: ['M', 'F', 'X'][Math.floor(Math.random() * 3)] as 'M' | 'F' | 'X',
    nationality: 'United States',
    documentNumber: generateDocumentNumber(documentType),
    documentType,
    issuingCountry: 'USA',
    issuingAuthority: documentType === 'passport' ? 'US Department of State' : 'DMV',
    issueDate: generateRandomDate(2018, 2023),
    expiryDate: generateRandomDate(2024, 2034),
    fieldConfidence: {}
  }
  
  // Add address for driver's license and ID cards
  if (documentType !== 'passport') {
    extractedData.address = generateAddress()
  }
  
  // Add specific fields based on document type
  if (documentType === 'passport') {
    extractedData.mrzData = generateMRZ(extractedData)
  } else if (documentType === 'drivers_license') {
    extractedData.licenseClass = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
    extractedData.restrictions = Math.random() < 0.3 ? ['Corrective Lenses'] : []
    extractedData.organDonor = Math.random() < 0.4
  }
  
  // Calculate confidence scores
  const baseConfidence = isLowQuality ? 65 : 85
  const confidence = baseConfidence + Math.floor(Math.random() * 15)
  
  // Add field-level confidence scores
  const fields = Object.keys(extractedData).filter(key => 
    extractedData[key as keyof ExtractedDocumentData] !== undefined &&
    key !== 'fieldConfidence' && 
    key !== 'address'
  )
  
  fields.forEach(field => {
    const fieldConfidence = isLowQuality 
      ? 50 + Math.floor(Math.random() * 30)
      : 80 + Math.floor(Math.random() * 20)
    extractedData.fieldConfidence![field] = fieldConfidence
  })
  
  // Simulate low quality results
  const errors: OCRError[] = []
  if (isLowQuality) {
    errors.push({
      code: 'LOW_QUALITY_IMAGE',
      message: 'Image quality is below optimal threshold',
      severity: 'medium'
    })
    
    // Randomly mark some fields as low confidence
    const lowConfidenceFields = fields.filter(() => Math.random() < 0.3)
    lowConfidenceFields.forEach(field => {
      errors.push({
        code: 'LOW_CONFIDENCE_FIELD',
        message: `Low confidence in ${field} extraction`,
        field,
        severity: 'low'
      })
    })
  }
  
  return {
    success: true,
    confidence,
    processingTime: Date.now() - startTime,
    extractedData,
    errors: errors.length > 0 ? errors : undefined,
    requiresManualReview: isLowQuality || confidence < 75,
    rawText: JSON.stringify(extractedData, null, 2) // Simulated raw text
  }
}

// Helper function to validate OCR results
export function validateOCRResult(result: OCRResult): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  if (!result.success || !result.extractedData) {
    return { isValid: false, issues: ['OCR extraction failed'] }
  }
  
  const data = result.extractedData
  
  // Check required fields
  if (!data.documentNumber) {
    issues.push('Document number is missing')
  }
  
  if (!data.firstName && !data.fullName) {
    issues.push('Name information is missing')
  }
  
  if (!data.dateOfBirth) {
    issues.push('Date of birth is missing')
  }
  
  if (!data.expiryDate) {
    issues.push('Expiry date is missing')
  }
  
  // Check if document is expired
  if (data.expiryDate) {
    const expiry = new Date(data.expiryDate)
    if (expiry < new Date()) {
      issues.push('Document has expired')
    }
  }
  
  // Check confidence threshold
  if (result.confidence < 70) {
    issues.push('Overall confidence is too low')
  }
  
  // Check field confidence
  if (data.fieldConfidence) {
    const lowConfidenceFields = Object.entries(data.fieldConfidence)
      .filter(([_, confidence]) => confidence < 60)
      .map(([field]) => field)
    
    if (lowConfidenceFields.length > 0) {
      issues.push(`Low confidence in fields: ${lowConfidenceFields.join(', ')}`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

// Export mock data for consistent testing
export const mockOCRData = {
  passport: {
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    dateOfBirth: '1985-06-15',
    gender: 'M' as const,
    nationality: 'United States',
    documentNumber: 'P123456789',
    documentType: 'passport' as const,
    issuingCountry: 'USA',
    issuingAuthority: 'US Department of State',
    issueDate: '2020-03-10',
    expiryDate: '2030-03-09',
    mrzData: 'P<USADOE<<<<<<<<<<<JOHN<<<<<<<<<<<<<<<<<<<<\nP123456789<0USA8506150<0300309<0<<<<<<<<<<<<<<00'
  },
  driversLicense: {
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    dateOfBirth: '1990-12-25',
    gender: 'F' as const,
    documentNumber: 'DL987654321',
    documentType: 'drivers_license' as const,
    issuingCountry: 'USA',
    issuingAuthority: 'DMV',
    issueDate: '2022-01-15',
    expiryDate: '2026-01-15',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      fullAddress: '123 Main St, New York, NY 10001'
    },
    licenseClass: 'D',
    restrictions: ['Corrective Lenses'],
    organDonor: true
  }
}