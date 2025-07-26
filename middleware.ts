import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration per route pattern
const RATE_LIMITS = {
  '/kyc': { windowMs: 60 * 1000, max: 30 }, // 30 requests per minute
  '/kyc/personal': { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute
  '/kyc/documents': { windowMs: 60 * 1000, max: 5 }, // 5 requests per minute
  '/kyc/verification': { windowMs: 60 * 1000, max: 5 }, // 5 requests per minute
  '/api/kyc': { windowMs: 60 * 1000, max: 20 }, // 20 API requests per minute
}

// Get client identifier for rate limiting
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'anonymous'
  
  // Include user session if available
  const sessionCookie = request.cookies.get('clearhold_session')
  const identifier = sessionCookie ? `${ip}-${sessionCookie.value}` : ip
  
  return identifier
}

// Check rate limit
function checkRateLimit(identifier: string, path: string): { 
  allowed: boolean; 
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  reset?: Date;
} {
  const now = Date.now()
  const limit = Object.entries(RATE_LIMITS).find(([pattern]) => path.startsWith(pattern))?.[1]
  
  if (!limit) return { allowed: true }
  
  const key = `${identifier}-${path}`
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + limit.windowMs })
    return { 
      allowed: true,
      limit: limit.max,
      remaining: limit.max - 1,
      reset: new Date(now + limit.windowMs)
    }
  }
  
  if (record.count >= limit.max) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { 
      allowed: false, 
      retryAfter,
      limit: limit.max,
      remaining: 0,
      reset: new Date(record.resetTime)
    }
  }
  
  record.count++
  return { 
    allowed: true,
    limit: limit.max,
    remaining: limit.max - record.count,
    reset: new Date(record.resetTime)
  }
}

// Clean up old rate limit entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime + 60000) { // Clean up entries older than 1 minute past reset
        rateLimitMap.delete(key)
      }
    }
  }, 60000) // Run cleanup every minute
}

// Generate CSP nonce
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

// Validate request headers for security
function validateRequest(request: NextRequest): { valid: boolean; reason?: string } {
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ]
  
  for (const header of suspiciousHeaders) {
    if (request.headers.has(header)) {
      return { valid: false, reason: `Suspicious header detected: ${header}` }
    }
  }
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type')
    const validContentTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ]
    
    if (!contentType || !validContentTypes.some(type => contentType.includes(type))) {
      return { valid: false, reason: 'Invalid content type' }
    }
  }
  
  return { valid: true }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Only apply to KYC routes and KYC API endpoints
  if (!pathname.startsWith('/kyc') && !pathname.startsWith('/api/kyc')) {
    return NextResponse.next()
  }
  
  // Validate request
  const validation = validateRequest(request)
  if (!validation.valid) {
    return new NextResponse(JSON.stringify({ error: validation.reason }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Check rate limit
  const clientId = getClientIdentifier(request)
  const rateLimit = checkRateLimit(clientId, pathname)
  
  if (!rateLimit.allowed) {
    return new NextResponse(JSON.stringify({ 
      error: 'Too many requests',
      message: `Rate limit exceeded. Please retry after ${rateLimit.retryAfter} seconds.`,
      retryAfter: rateLimit.retryAfter
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimit.retryAfter!.toString(),
        'X-RateLimit-Limit': rateLimit.limit!.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.reset!.toISOString()
      }
    })
  }
  
  // Generate nonce for CSP
  const nonce = generateNonce()
  
  // Clone the response to add headers
  const response = NextResponse.next()
  
  // Set security headers
  const headers = response.headers
  
  // Content Security Policy with nonce for KYC pages
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.clearhold.app https://*.firebaseapp.com https://*.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'none'", // Stricter for KYC pages
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.clearhold.app",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests",
    "require-trusted-types-for 'script'"
  ].join('; ')
  
  headers.set('Content-Security-Policy', cspDirectives)
  
  // Strict Transport Security
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  
  // Frame Options - DENY for KYC pages
  headers.set('X-Frame-Options', 'DENY')
  
  // Content Type Options
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection (legacy browsers)
  headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy - Very restrictive for KYC
  headers.set('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'autoplay=()',
    'encrypted-media=()',
    'gyroscope=()',
    'picture-in-picture=()',
    'fullscreen=(self)',
    'clipboard-read=(self)',
    'clipboard-write=(self)'
  ].join(', '))
  
  // Additional security headers for KYC
  headers.set('X-DNS-Prefetch-Control', 'off')
  headers.set('X-Download-Options', 'noopen')
  headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // CORS headers for API routes
  if (pathname.startsWith('/api/kyc')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'https://clearhold.app',
      'https://www.clearhold.app',
      process.env.NEXT_PUBLIC_APP_URL,
      // Allow localhost in development
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''
    ].filter(Boolean)
    
    if (origin && allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Credentials', 'true')
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With')
      headers.set('Access-Control-Max-Age', '86400') // 24 hours
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers })
    }
  }
  
  // Add nonce to response for use in components
  headers.set('X-Nonce', nonce)
  
  // Add rate limit headers for successful requests
  if (rateLimit.limit && rateLimit.remaining !== undefined && rateLimit.reset) {
    headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    headers.set('X-RateLimit-Reset', rateLimit.reset.toISOString())
  }
  headers.set('X-RateLimit-Policy', 'sliding-window')
  
  // Security headers for file uploads
  if (pathname.includes('/documents') || pathname.includes('/upload')) {
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-File-Upload-Limit', '10MB')
    headers.set('Accept', 'image/jpeg,image/png,image/webp,application/pdf')
  }
  
  return response
}

export const config = {
  matcher: [
    // Match all KYC routes
    '/kyc/:path*',
    // Match KYC API routes
    '/api/kyc/:path*',
  ]
}