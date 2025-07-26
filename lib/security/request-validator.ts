import { NextRequest } from 'next/server'
import { z } from 'zod'

// Request validation schemas
export const KYCSchemas = {
  personalInfo: z.object({
    firstName: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-']+$/),
    lastName: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-']+$/),
    middleName: z.string().max(100).regex(/^[a-zA-Z\s\-']*$/).optional(),
    dateOfBirth: z.string().refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 18 && age <= 120
    }, { message: 'Age must be between 18 and 120' }),
    email: z.string().email().max(255),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).max(15),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      country: z.string().min(2).max(100),
      postalCode: z.string().min(3).max(20),
    }),
    nationality: z.string().min(2).max(100),
    occupation: z.string().min(2).max(200).optional(),
  }),
  
  documentUpload: z.object({
    documentType: z.enum(['passport', 'driverLicense', 'nationalId', 'proofOfAddress']),
    documentNumber: z.string().regex(/^[A-Z0-9\-]+$/).max(50),
    expiryDate: z.string().optional(),
    issuingCountry: z.string().min(2).max(100),
  }),
  
  verification: z.object({
    verificationMethod: z.enum(['biometric', 'video', 'manual']),
    consentGiven: z.boolean().refine(val => val === true, {
      message: 'Consent must be given to proceed'
    }),
    termsAccepted: z.boolean().refine(val => val === true, {
      message: 'Terms must be accepted to proceed'
    }),
  }),
}

// Request body size limits
const MAX_BODY_SIZE = {
  json: 1024 * 1024, // 1MB for JSON
  formData: 10 * 1024 * 1024, // 10MB for file uploads
}

// IP-based request tracking for anomaly detection
const requestTracker = new Map<string, { count: number; patterns: Set<string>; lastSeen: number }>()

// Clean up old tracking data
setInterval(() => {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  
  for (const [ip, data] of requestTracker.entries()) {
    if (data.lastSeen < oneHourAgo) {
      requestTracker.delete(ip)
    }
  }
}, 60 * 60 * 1000) // Run every hour

// Detect suspicious request patterns
export function detectAnomalies(request: NextRequest): { suspicious: boolean; reason?: string } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const now = Date.now()
  const userAgent = request.headers.get('user-agent') || ''
  const requestPattern = `${request.method}-${request.nextUrl.pathname}`
  
  // Get or create tracking data
  let trackingData = requestTracker.get(ip)
  if (!trackingData) {
    trackingData = { count: 0, patterns: new Set(), lastSeen: now }
    requestTracker.set(ip, trackingData)
  }
  
  // Update tracking
  trackingData.count++
  trackingData.patterns.add(requestPattern)
  trackingData.lastSeen = now
  
  // Check for suspicious patterns
  
  // 1. Too many different endpoints accessed quickly (scanning behavior)
  if (trackingData.patterns.size > 10 && trackingData.count > 50) {
    return { suspicious: true, reason: 'Scanning behavior detected' }
  }
  
  // 2. Missing or suspicious user agent
  if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
    return { suspicious: true, reason: 'Suspicious user agent' }
  }
  
  // 3. Rapid repeated requests to same endpoint
  const recentRequests = Array.from(trackingData.patterns).filter(p => p === requestPattern)
  if (recentRequests.length > 20) {
    return { suspicious: true, reason: 'Repeated requests to same endpoint' }
  }
  
  return { suspicious: false }
}

// Validate request body against schema
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    // Check content type
    const contentType = request.headers.get('content-type')
    
    if (!contentType) {
      return { valid: false, error: 'Missing content-type header' }
    }
    
    let body: unknown
    
    if (contentType.includes('application/json')) {
      // Check content length
      const contentLength = parseInt(request.headers.get('content-length') || '0')
      if (contentLength > MAX_BODY_SIZE.json) {
        return { valid: false, error: 'Request body too large' }
      }
      
      try {
        body = await request.json()
      } catch {
        return { valid: false, error: 'Invalid JSON in request body' }
      }
    } else if (contentType.includes('multipart/form-data')) {
      // Check content length for file uploads
      const contentLength = parseInt(request.headers.get('content-length') || '0')
      if (contentLength > MAX_BODY_SIZE.formData) {
        return { valid: false, error: 'Request body too large' }
      }
      
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      return { valid: false, error: 'Unsupported content type' }
    }
    
    // Validate against schema
    const result = schema.safeParse(body)
    
    if (!result.success) {
      return { 
        valid: false, 
        error: result.error.errors[0]?.message || 'Validation failed' 
      }
    }
    
    return { valid: true, data: result.data }
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Validate request headers
export function validateRequestHeaders(request: NextRequest): { valid: boolean; error?: string } {
  // Required headers for KYC requests
  const requiredHeaders = ['user-agent', 'accept', 'accept-language']
  
  for (const header of requiredHeaders) {
    if (!request.headers.has(header)) {
      return { valid: false, error: `Missing required header: ${header}` }
    }
  }
  
  // Check for header injection attempts
  const headers = Array.from(request.headers.entries())
  for (const [name, value] of headers) {
    // Check for newline characters (header injection)
    if (value.includes('\n') || value.includes('\r')) {
      return { valid: false, error: 'Header injection attempt detected' }
    }
    
    // Check header length
    if (value.length > 8192) {
      return { valid: false, error: `Header ${name} is too long` }
    }
  }
  
  return { valid: true }
}

// Main request validation function
export async function validateKYCRequest<T>(
  request: NextRequest,
  schema?: z.ZodSchema<T>
): Promise<{ 
  valid: boolean; 
  data?: T; 
  error?: string;
  statusCode?: number;
}> {
  // Check for anomalies
  const anomalyCheck = detectAnomalies(request)
  if (anomalyCheck.suspicious) {
    return { 
      valid: false, 
      error: anomalyCheck.reason,
      statusCode: 403
    }
  }
  
  // Validate headers
  const headerValidation = validateRequestHeaders(request)
  if (!headerValidation.valid) {
    return { 
      valid: false, 
      error: headerValidation.error,
      statusCode: 400
    }
  }
  
  // Validate body if schema provided
  if (schema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodyValidation = await validateRequestBody(request, schema)
    if (!bodyValidation.valid) {
      return { 
        valid: false, 
        error: bodyValidation.error,
        statusCode: 400
      }
    }
    
    return { 
      valid: true, 
      data: bodyValidation.data 
    }
  }
  
  return { valid: true }
}

// Export a middleware wrapper for easy use in API routes
export function withRequestValidation<T>(
  schema?: z.ZodSchema<T>
) {
  return async (request: NextRequest) => {
    const validation = await validateKYCRequest(request, schema)
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: validation.statusCode || 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Attach validated data to request for use in handler
    (request as any).validatedData = validation.data
    
    return null // Continue to handler
  }
}