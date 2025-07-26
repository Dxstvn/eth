import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { generateSessionId, hashData } from './kyc-security'
import crypto from 'crypto'

interface KYCSession {
  id: string
  userId: string
  startedAt: number
  lastActivity: number
  step: 'personal' | 'documents' | 'verification' | 'completed'
  ipAddress: string
  userAgent: string
  csrfToken: string
  data: Record<string, any>
}

// Session storage (in production, use Redis or similar)
const sessionStore = new Map<string, KYCSession>()

// Session configuration
const SESSION_CONFIG = {
  name: 'clearhold_kyc_session',
  maxAge: 30 * 60 * 1000, // 30 minutes
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/kyc',
}

// Clean up expired sessions
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActivity > SESSION_CONFIG.maxAge) {
      sessionStore.delete(id)
    }
  }
}, 5 * 60 * 1000) // Run every 5 minutes

// Create a new KYC session
export async function createKYCSession(
  userId: string,
  request: NextRequest
): Promise<KYCSession> {
  const sessionId = generateSessionId()
  const csrfToken = crypto.randomBytes(32).toString('hex')
  
  const session: KYCSession = {
    id: sessionId,
    userId,
    startedAt: Date.now(),
    lastActivity: Date.now(),
    step: 'personal',
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    userAgent: request.headers.get('user-agent') || '',
    csrfToken,
    data: {},
  }
  
  // Store session
  sessionStore.set(sessionId, session)
  
  // Set secure cookie
  const cookieStore = cookies()
  const sessionCookie = {
    ...SESSION_CONFIG,
    value: encryptSessionId(sessionId),
  }
  
  cookieStore.set(SESSION_CONFIG.name, sessionCookie.value, sessionCookie)
  
  return session
}

// Get existing KYC session
export async function getKYCSession(
  request: NextRequest
): Promise<KYCSession | null> {
  const cookieStore = cookies()
  const encryptedSessionId = cookieStore.get(SESSION_CONFIG.name)?.value
  
  if (!encryptedSessionId) {
    return null
  }
  
  try {
    const sessionId = decryptSessionId(encryptedSessionId)
    const session = sessionStore.get(sessionId)
    
    if (!session) {
      return null
    }
    
    // Validate session
    const now = Date.now()
    if (now - session.lastActivity > SESSION_CONFIG.maxAge) {
      sessionStore.delete(sessionId)
      return null
    }
    
    // Validate IP address (warn on mismatch but don't invalidate)
    const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    if (currentIp !== session.ipAddress) {
      console.warn('[SECURITY] IP address mismatch for session:', {
        sessionId: session.id,
        originalIp: session.ipAddress,
        currentIp,
      })
    }
    
    // Update last activity
    session.lastActivity = now
    
    return session
  } catch (error) {
    console.error('[SECURITY] Session validation error:', error)
    return null
  }
}

// Update KYC session
export async function updateKYCSession(
  sessionId: string,
  updates: Partial<KYCSession>
): Promise<boolean> {
  const session = sessionStore.get(sessionId)
  
  if (!session) {
    return false
  }
  
  // Merge updates
  Object.assign(session, updates, {
    lastActivity: Date.now(),
  })
  
  return true
}

// Destroy KYC session
export async function destroyKYCSession(sessionId: string): Promise<void> {
  sessionStore.delete(sessionId)
  
  const cookieStore = cookies()
  cookieStore.delete(SESSION_CONFIG.name)
}

// Validate session step progression
export function validateSessionStep(
  currentStep: KYCSession['step'],
  requestedStep: KYCSession['step']
): boolean {
  const stepOrder: KYCSession['step'][] = ['personal', 'documents', 'verification', 'completed']
  const currentIndex = stepOrder.indexOf(currentStep)
  const requestedIndex = stepOrder.indexOf(requestedStep)
  
  // Can only progress forward or stay on current step
  return requestedIndex <= currentIndex + 1
}

// Session encryption/decryption
const SESSION_SECRET = process.env.SESSION_SECRET || 'development-secret-change-in-production'

function encryptSessionId(sessionId: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', SESSION_SECRET)
  let encrypted = cipher.update(sessionId, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

function decryptSessionId(encryptedSessionId: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', SESSION_SECRET)
  let decrypted = decipher.update(encryptedSessionId, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Session fingerprinting for additional security
export function generateSessionFingerprint(request: NextRequest): string {
  const components = [
    request.headers.get('user-agent') || '',
    request.headers.get('accept-language') || '',
    request.headers.get('accept-encoding') || '',
    // Add more entropy sources as needed
  ]
  
  return hashData(components.join('|'))
}

// Rate limiting per session
const sessionRateLimits = new Map<string, { count: number; resetTime: number }>()

export function checkSessionRateLimit(
  sessionId: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const record = sessionRateLimits.get(sessionId)
  
  if (!record || now > record.resetTime) {
    sessionRateLimits.set(sessionId, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}