import { NextRequest, NextResponse } from 'next/server'
import { middleware as kycMiddleware } from './middleware-kyc'
import { authMiddleware } from './middleware-auth'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Apply auth middleware for auth routes
  if (pathname.startsWith('/api/auth') || 
      pathname === '/login' || 
      pathname === '/signup' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname.startsWith('/auth/email-action')) {
    return authMiddleware(request)
  }
  
  // Apply KYC middleware for KYC routes
  if (pathname.startsWith('/kyc') || pathname.startsWith('/api/kyc')) {
    return kycMiddleware(request)
  }
  
  // Default - allow request to proceed
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Auth routes
    '/api/auth/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/email-action',
    // KYC routes
    '/kyc/:path*',
    '/api/kyc/:path*',
  ]
}