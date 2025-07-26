import { headers } from 'next/headers'
import crypto from 'crypto'

// Security configuration for KYC routes
export const KYC_SECURITY_CONFIG = {
  // Maximum file upload size (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Allowed file types for document upload
  ALLOWED_FILE_TYPES: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
  },
  
  // Session configuration
  SESSION: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    updateAge: 5 * 60 * 1000, // Update session every 5 minutes
  },
  
  // Field validation rules
  VALIDATION: {
    name: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-']+$/,
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255,
    },
    phone: {
      pattern: /^\+?[1-9]\d{1,14}$/,
      maxLength: 15,
    },
    address: {
      minLength: 10,
      maxLength: 500,
    },
    dateOfBirth: {
      minAge: 18,
      maxAge: 120,
    },
    documentNumber: {
      pattern: /^[A-Z0-9\-]+$/,
      maxLength: 50,
    },
  },
  
  // Encryption settings
  ENCRYPTION: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    saltLength: 64,
    iterations: 100000,
  },
}

// Get nonce from headers for CSP
export function getCSPNonce(): string {
  const headersList = headers()
  return headersList.get('X-Nonce') || ''
}

// Validate file type and size
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > KYC_SECURITY_CONFIG.MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds maximum limit of ${KYC_SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB` 
    }
  }
  
  // Check file type
  const allowedTypes = Object.keys(KYC_SECURITY_CONFIG.ALLOWED_FILE_TYPES)
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    }
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase()
  const allowedExtensions = Object.values(KYC_SECURITY_CONFIG.ALLOWED_FILE_TYPES).flat()
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
  
  if (!hasValidExtension) {
    return { 
      valid: false, 
      error: `File extension is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}` 
    }
  }
  
  return { valid: true }
}

// Sanitize user input
export function sanitizeInput(input: string, type: keyof typeof KYC_SECURITY_CONFIG.VALIDATION): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Apply type-specific sanitization
  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase()
      break
    case 'phone':
      // Remove all non-numeric characters except +
      sanitized = sanitized.replace(/[^\d+]/g, '')
      break
    case 'documentNumber':
      // Convert to uppercase and remove special characters
      sanitized = sanitized.toUpperCase().replace(/[^A-Z0-9\-]/g, '')
      break
    case 'name':
      // Remove any characters that aren't letters, spaces, hyphens, or apostrophes
      sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '')
      break
  }
  
  return sanitized
}

// Validate input against rules
export function validateInput(input: string, type: keyof typeof KYC_SECURITY_CONFIG.VALIDATION): { valid: boolean; error?: string } {
  const rules = KYC_SECURITY_CONFIG.VALIDATION[type]
  
  // Check minimum length
  if ('minLength' in rules && input.length < rules.minLength) {
    return { valid: false, error: `Minimum length is ${rules.minLength} characters` }
  }
  
  // Check maximum length
  if ('maxLength' in rules && input.length > rules.maxLength) {
    return { valid: false, error: `Maximum length is ${rules.maxLength} characters` }
  }
  
  // Check pattern
  if ('pattern' in rules && !rules.pattern.test(input)) {
    return { valid: false, error: `Invalid format` }
  }
  
  // Special validation for date of birth
  if (type === 'dateOfBirth' && 'minAge' in rules && 'maxAge' in rules) {
    const birthDate = new Date(input)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    if (age < rules.minAge || age > rules.maxAge) {
      return { valid: false, error: `Age must be between ${rules.minAge} and ${rules.maxAge}` }
    }
  }
  
  return { valid: true }
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Validate CSRF token
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  )
}

// Encrypt sensitive data
export function encryptData(data: string, key: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(KYC_SECURITY_CONFIG.ENCRYPTION.ivLength)
  const cipher = crypto.createCipheriv(
    KYC_SECURITY_CONFIG.ENCRYPTION.algorithm,
    Buffer.from(key, 'hex'),
    iv
  )
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

// Decrypt sensitive data
export function decryptData(encryptedData: string, key: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    KYC_SECURITY_CONFIG.ENCRYPTION.algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Generate secure session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Hash sensitive data (one-way)
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(KYC_SECURITY_CONFIG.ENCRYPTION.saltLength).toString('hex')
  return crypto.pbkdf2Sync(
    data,
    actualSalt,
    KYC_SECURITY_CONFIG.ENCRYPTION.iterations,
    KYC_SECURITY_CONFIG.ENCRYPTION.keyLength,
    'sha256'
  ).toString('hex')
}

// Security headers helper for API routes
export function getSecurityHeaders(nonce?: string): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': nonce 
      ? `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.clearhold.app; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`
      : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.clearhold.app; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=()',
  }
}

// Check if request is from trusted origin
export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  const trustedOrigins = [
    'https://clearhold.app',
    'https://www.clearhold.app',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean)
  
  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    trustedOrigins.push('http://localhost:3000')
  }
  
  return trustedOrigins.includes(origin)
}