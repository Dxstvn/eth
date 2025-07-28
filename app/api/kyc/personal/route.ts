import { NextRequest, NextResponse } from 'next/server'
import { withRequestValidation, KYCSchemas } from '@/lib/security/request-validator'
import { getSecurityHeaders, validateCSRFToken, encryptData } from '@/lib/security/kyc-security'
import { apiClient } from '@/services/api'

// Example KYC personal information API route with full security implementation
export async function POST(request: NextRequest) {
  try {
    // Validate request using middleware
    const validationResult = await withRequestValidation(KYCSchemas.personalInfo)(request)
    if (validationResult) {
      return validationResult // Return error response if validation failed
    }
    
    // Get validated data
    const validatedData = (request as any).validatedData
    
    // Extract CSRF token and validate
    const csrfToken = request.headers.get('X-CSRF-Token')
    const sessionToken = request.cookies.get('clearhold_session')?.value
    
    if (!csrfToken || !sessionToken || !validateCSRFToken(csrfToken, sessionToken)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { 
          status: 403,
          headers: getSecurityHeaders()
        }
      )
    }
    
    // Get user authentication
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: getSecurityHeaders()
        }
      )
    }
    
    // Encrypt sensitive data before sending to backend
    const encryptionKey = process.env.KYC_ENCRYPTION_KEY!
    const sensitiveFields = ['dateOfBirth', 'phone', 'address']
    const encryptedData: any = { ...validatedData }
    
    for (const field of sensitiveFields) {
      if (encryptedData[field]) {
        const encrypted = await encryptData(
          JSON.stringify(encryptedData[field]),
          encryptionKey
        )
        encryptedData[field] = {
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: encrypted.tag
        }
      }
    }
    
    // Forward to backend API with encrypted data
    const response = await apiClient.post('/kyc/personal', {
      data: encryptedData,
      timestamp: Date.now(),
      checksum: await generateChecksum(encryptedData)
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Request-ID': request.headers.get('X-Request-ID') || generateRequestId(),
      }
    })
    
    // Log security event
    logSecurityEvent({
      type: 'kyc_data_submitted',
      userId: response.data.userId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
      success: true
    })
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Personal information submitted successfully',
        reference: response.data.reference
      },
      { 
        status: 200,
        headers: getSecurityHeaders()
      }
    )
    
  } catch (error) {
    console.error('[SECURITY] KYC personal info error:', error)
    
    // Log security event for failure
    logSecurityEvent({
      type: 'kyc_data_submission_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
      success: false
    })
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { 
        status: 500,
        headers: getSecurityHeaders()
      }
    )
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Max-Age': '86400',
    }
  })
}

// Helper functions
async function generateChecksum(data: any): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(JSON.stringify(data))
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('')
}

function generateRequestId(): string {
  return `kyc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function logSecurityEvent(event: any): void {
  // In production, this would send to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
    fetch(process.env.SECURITY_MONITORING_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => {
      console.error('[SECURITY] Failed to log security event:', err)
    })
  } else {
    console.log('[SECURITY EVENT]', event)
  }
}