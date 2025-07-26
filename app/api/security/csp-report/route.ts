import { NextRequest, NextResponse } from 'next/server'
import { getSecurityHeaders } from '@/lib/security/kyc-security'

// CSP violation reporting endpoint
export async function POST(request: NextRequest) {
  try {
    const report = await request.json()
    
    // Log CSP violation
    console.warn('[SECURITY] CSP Violation:', {
      ...report,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    })
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_MONITORING_ENDPOINT) {
      await fetch(process.env.SECURITY_MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'csp_violation',
          ...report,
          metadata: {
            ip: request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
          }
        })
      }).catch(err => {
        console.error('[SECURITY] Failed to report CSP violation:', err)
      })
    }
    
    return new NextResponse(null, { 
      status: 204,
      headers: getSecurityHeaders()
    })
  } catch (error) {
    console.error('[SECURITY] CSP report error:', error)
    return new NextResponse(null, { 
      status: 204, // Always return 204 to avoid blocking
      headers: getSecurityHeaders()
    })
  }
}

// Rate limit configuration for this endpoint
export const runtime = 'edge' // Use edge runtime for better performance
export const maxDuration = 5 // 5 second timeout