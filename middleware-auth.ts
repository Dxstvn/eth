import { NextRequest, NextResponse } from 'next/server'
import { securityMonitor, SecurityEventType, SecurityEventSeverity } from '@/lib/security/security-monitor'

// Auth rate limiting configuration
const authRateLimitMap = new Map<string, { 
  count: number; 
  resetTime: number;
  failedAttempts?: number;
  blockedUntil?: number;
}>()

// Auth endpoint rate limits - more restrictive for security
const AUTH_RATE_LIMITS = {
  // Login/signup endpoints - prevent brute force
  '/api/auth/login': { 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    blockDuration: 30 * 60 * 1000, // 30 minute block after max failures
    failureThreshold: 3 // Block after 3 failed attempts
  },
  '/api/auth/signup': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 signups per hour per IP
    blockDuration: 24 * 60 * 60 * 1000 // 24 hour block
  },
  '/api/auth/signInGoogle': { 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    blockDuration: 60 * 60 * 1000 // 1 hour block
  },
  '/api/auth/forgot-password': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    blockDuration: 6 * 60 * 60 * 1000 // 6 hour block
  },
  '/api/auth/reset-password': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    blockDuration: 24 * 60 * 60 * 1000 // 24 hour block
  },
  '/api/auth/verify-email': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    blockDuration: 60 * 60 * 1000 // 1 hour block
  },
  '/api/auth/refresh': { 
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 refreshes per 5 minutes
    blockDuration: 60 * 60 * 1000 // 1 hour block
  },
  '/api/auth/changePassword': { 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    blockDuration: 24 * 60 * 60 * 1000 // 24 hour block
  },
  // Generic auth endpoints
  '/api/auth': { 
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    blockDuration: 15 * 60 * 1000 // 15 minute block
  },
  // Login page - prevent automated attacks
  '/login': { 
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 page loads per minute
    blockDuration: 15 * 60 * 1000 // 15 minute block
  },
  '/forgot-password': { 
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 page loads per minute
    blockDuration: 15 * 60 * 1000 // 15 minute block
  },
  '/auth/email-action': { 
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 page loads per minute
    blockDuration: 15 * 60 * 1000 // 15 minute block
  }
}

// Get client identifier for auth rate limiting
function getAuthClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown'
  
  // For auth endpoints, use IP + user agent for better fingerprinting
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const fingerprint = `${ip}-${hashUserAgent(userAgent)}`
  
  return fingerprint
}

// Simple hash function for user agent
function hashUserAgent(userAgent: string): string {
  let hash = 0
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Check auth rate limit with blocking support
function checkAuthRateLimit(
  identifier: string, 
  path: string,
  isFailedAttempt: boolean = false
): { 
  allowed: boolean; 
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  reset?: Date;
  blocked?: boolean;
  reason?: string;
} {
  const now = Date.now()
  const config = Object.entries(AUTH_RATE_LIMITS).find(([pattern]) => path.startsWith(pattern))?.[1]
  
  if (!config) return { allowed: true }
  
  const key = `auth-${identifier}-${path}`
  const record = authRateLimitMap.get(key) || { 
    count: 0, 
    resetTime: now + config.windowMs,
    failedAttempts: 0
  }
  
  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000)
    return { 
      allowed: false, 
      blocked: true,
      retryAfter,
      reason: 'Account temporarily blocked due to suspicious activity'
    }
  }
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 0
    record.resetTime = now + config.windowMs
    record.failedAttempts = 0
    record.blockedUntil = undefined
  }
  
  // Track failed attempts for login endpoints
  if (isFailedAttempt && config.failureThreshold) {
    record.failedAttempts = (record.failedAttempts || 0) + 1
    
    // Block if exceeded failure threshold
    if (record.failedAttempts >= config.failureThreshold) {
      record.blockedUntil = now + config.blockDuration
      authRateLimitMap.set(key, record)
      
      const retryAfter = Math.ceil(config.blockDuration / 1000)
      return { 
        allowed: false, 
        blocked: true,
        retryAfter,
        reason: `Too many failed attempts. Account blocked for ${retryAfter / 60} minutes.`
      }
    }
  }
  
  // Check rate limit
  record.count++
  
  if (record.count > config.max) {
    // Block if exceeded rate limit
    record.blockedUntil = now + config.blockDuration
    authRateLimitMap.set(key, record)
    
    const retryAfter = Math.ceil(config.blockDuration / 1000)
    return { 
      allowed: false, 
      retryAfter,
      limit: config.max,
      remaining: 0,
      reset: new Date(record.resetTime),
      reason: `Rate limit exceeded. Try again in ${retryAfter / 60} minutes.`
    }
  }
  
  authRateLimitMap.set(key, record)
  
  return { 
    allowed: true,
    limit: config.max,
    remaining: config.max - record.count,
    reset: new Date(record.resetTime)
  }
}

// Clean up old rate limit entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of authRateLimitMap.entries()) {
      // Clean up entries that are expired and not blocked
      if (now > record.resetTime + 3600000 && (!record.blockedUntil || now > record.blockedUntil)) {
        authRateLimitMap.delete(key)
      }
    }
  }, 300000) // Run cleanup every 5 minutes
}

// Security headers specific to auth pages
function setAuthSecurityHeaders(response: NextResponse): void {
  const headers = response.headers
  
  // Prevent login forms from being embedded
  headers.set('X-Frame-Options', 'DENY')
  
  // Disable caching for auth pages
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')
  
  // Additional security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'same-origin')
}

export function authMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if this is an auth-related path
  const isAuthPath = pathname.startsWith('/api/auth') || 
                     pathname === '/login' || 
                     pathname === '/signup' ||
                     pathname === '/forgot-password' ||
                     pathname === '/reset-password' ||
                     pathname.startsWith('/auth/email-action')
  
  if (!isAuthPath) {
    return NextResponse.next()
  }
  
  // Get client identifier
  const clientId = getAuthClientIdentifier(request)
  
  // Check rate limit
  const rateLimit = checkAuthRateLimit(clientId, pathname)
  
  if (!rateLimit.allowed) {
    // Log to security monitor
    securityMonitor.logEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: rateLimit.blocked ? SecurityEventSeverity.HIGH : SecurityEventSeverity.MEDIUM,
      ipAddress: clientId.split('-')[0],
      endpoint: pathname,
      details: {
        blocked: rateLimit.blocked,
        reason: rateLimit.reason,
        retryAfter: rateLimit.retryAfter,
        fingerprint: clientId
      }
    })
    
    // If account is blocked, log additional event
    if (rateLimit.blocked) {
      securityMonitor.logEvent({
        type: SecurityEventType.ACCOUNT_BLOCKED,
        severity: SecurityEventSeverity.HIGH,
        ipAddress: clientId.split('-')[0],
        endpoint: pathname,
        details: {
          duration: rateLimit.retryAfter,
          reason: 'Rate limit exceeded'
        }
      })
    }
    
    return new NextResponse(JSON.stringify({ 
      error: 'Too many requests',
      message: rateLimit.reason || 'Please try again later',
      retryAfter: rateLimit.retryAfter,
      blocked: rateLimit.blocked
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimit.retryAfter!.toString(),
        'X-RateLimit-Limit': rateLimit.limit?.toString() || '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.reset?.toISOString() || new Date().toISOString()
      }
    })
  }
  
  // Continue with request
  const response = NextResponse.next()
  
  // Set security headers for auth pages
  setAuthSecurityHeaders(response)
  
  // Add rate limit headers
  if (rateLimit.limit && rateLimit.remaining !== undefined && rateLimit.reset) {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.reset.toISOString())
  }
  
  return response
}

// Export function to track failed login attempts
export function trackFailedAuthAttempt(identifier: string, endpoint: string): void {
  checkAuthRateLimit(identifier, endpoint, true)
}

// Export function to reset rate limit for a user (e.g., after successful login)
export function resetAuthRateLimit(identifier: string, endpoint: string): void {
  const key = `auth-${identifier}-${endpoint}`
  authRateLimitMap.delete(key)
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ]
}