# [SECURITY] KYC Security Guidelines for Developers

**Version**: 1.0.0  
**Last Updated**: January 26, 2025  
**Classification**: INTERNAL

---

## Table of Contents

1. [Overview](#overview)
2. [Secure Development Practices](#secure-development-practices)
3. [Input Validation Guidelines](#input-validation-guidelines)
4. [Encryption Standards](#encryption-standards)
5. [Authentication & Session Management](#authentication--session-management)
6. [File Upload Security](#file-upload-security)
7. [API Security](#api-security)
8. [Client-Side Security](#client-side-security)
9. [Logging & Monitoring](#logging--monitoring)
10. [Incident Response](#incident-response)
11. [Security Testing](#security-testing)
12. [Compliance Requirements](#compliance-requirements)

---

## Overview

This document provides security guidelines for developers working on the ClearHold KYC implementation. All developers MUST follow these guidelines to ensure the security of sensitive financial and personal data.

### Security Principles
1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Minimum necessary access
3. **Fail Securely**: Secure defaults and fail-safe modes
4. **Security by Design**: Built-in from the start, not added later
5. **Assume Breach**: Design for when (not if) security is compromised

---

## Secure Development Practices

### Code Review Requirements
- [ ] All security-related code MUST have peer review
- [ ] Security team review for authentication/authorization changes
- [ ] Threat modeling for new features handling PII
- [ ] Dependency security scan before merging
- [ ] Static analysis security testing (SAST) passed

### Git Security
```bash
# Use signed commits for security-sensitive changes
git config --global user.signingkey <your-key-id>
git config --global commit.gpgsign true

# Pre-commit hooks for security
npm install --save-dev husky
npx husky add .husky/pre-commit "npm run security-check"
```

### Environment Security
```typescript
// ✅ CORRECT: Use environment variables for secrets
const apiKey = process.env.ENCRYPTION_KEY
if (!apiKey) throw new Error('Encryption key not configured')

// ❌ WRONG: Never hardcode secrets
const apiKey = 'sk-1234567890abcdef' // NEVER DO THIS
```

### Secret Management
```typescript
// Use proper secret rotation
const rotateEncryptionKey = async () => {
  const newKey = await generateSecureKey()
  const oldKey = process.env.CURRENT_ENCRYPTION_KEY
  
  // Implement graceful key rotation
  await migrateDataToNewKey(oldKey, newKey)
  await updateKeyInSecretManager(newKey)
}
```

---

## Input Validation Guidelines

### Always Validate and Sanitize
```typescript
import { sanitizeInput, validateInput } from '@/lib/security/kyc-security'

// ✅ CORRECT: Validate and sanitize all input
const processUserInput = (input: string, type: ValidationTypes) => {
  // 1. Sanitize first
  const sanitized = sanitizeInput(input, type)
  
  // 2. Then validate
  const validation = validateInput(sanitized, type)
  if (!validation.valid) {
    throw new ValidationError(validation.error)
  }
  
  return sanitized
}

// ❌ WRONG: Using input directly
const processUserInput = (input: string) => {
  return input // Vulnerable to XSS, injection attacks
}
```

### XSS Prevention
```typescript
// ✅ CORRECT: HTML entity encoding
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Use React's built-in protection
const SafeComponent = ({ userContent }: { userContent: string }) => (
  <div>{userContent}</div> // React automatically escapes
)

// ❌ WRONG: Dangerous HTML injection
const UnsafeComponent = ({ userContent }: { userContent: string }) => (
  <div dangerouslySetInnerHTML={{ __html: userContent }} />
)
```

### SQL Injection Prevention
```typescript
// ✅ CORRECT: Use parameterized queries
const getUserData = async (userId: string) => {
  return await db.query('SELECT * FROM users WHERE id = $1', [userId])
}

// ❌ WRONG: String concatenation
const getUserData = async (userId: string) => {
  return await db.query(`SELECT * FROM users WHERE id = '${userId}'`)
}
```

### Command Injection Prevention
```typescript
// ✅ CORRECT: Validate and escape shell commands
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const processFile = async (filename: string) => {
  // Validate filename
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error('Invalid filename')
  }
  
  // Use execFile instead of exec
  await execFileAsync('process-document', [filename])
}

// ❌ WRONG: Direct command execution
const processFile = async (filename: string) => {
  await exec(`process-document ${filename}`) // Vulnerable to injection
}
```

---

## Encryption Standards

### Data Encryption Requirements
```typescript
import { KYCEncryptionService, KYCFieldType } from '@/lib/security/kyc-encryption'

const encryptionService = new KYCEncryptionService()

// ✅ CORRECT: Encrypt PII data
const storePiiData = async (data: PersonalInfo, password: string) => {
  const encryptedSSN = encryptionService.encryptPII(
    data.ssn,
    KYCFieldType.SSN,
    password
  )
  
  const encryptedDOB = encryptionService.encryptPII(
    data.dateOfBirth,
    KYCFieldType.DATE_OF_BIRTH,
    password
  )
  
  return {
    ...data,
    ssn: encryptedSSN,
    dateOfBirth: encryptedDOB
  }
}
```

### Key Management
```typescript
// ✅ CORRECT: Proper key derivation
const deriveEncryptionKey = (password: string, salt: string) => {
  return crypto.pbkdf2Sync(password, salt, 250000, 32, 'sha256')
}

// ✅ CORRECT: Secure key storage
const storeEncryptionKey = async (key: string, userId: string) => {
  const encryptedKey = await encrypt(key, process.env.MASTER_KEY!)
  await secureKeyStore.set(`user:${userId}:key`, encryptedKey)
}

// ❌ WRONG: Weak key derivation
const deriveEncryptionKey = (password: string) => {
  return crypto.createHash('md5').update(password).digest('hex')
}
```

### Transport Encryption
```typescript
// ✅ CORRECT: Always use HTTPS in production
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.clearhold.app'
    : 'http://localhost:3001',
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,
    secureProtocol: 'TLSv1_2_method'
  })
})

// Validate SSL certificates
apiClient.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === 'production' && !config.url?.startsWith('https://')) {
    throw new Error('HTTPS required in production')
  }
  return config
})
```

---

## Authentication & Session Management

### JWT Security
```typescript
// ✅ CORRECT: Secure JWT implementation
const createJWT = (payload: any) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    {
      algorithm: 'HS256', // Never use 'none'
      expiresIn: '15m',
      issuer: 'clearhold.app',
      audience: 'clearhold-users'
    }
  )
}

const verifyJWT = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'], // Specify allowed algorithms
    issuer: 'clearhold.app',
    audience: 'clearhold-users'
  })
}

// ❌ WRONG: Insecure JWT
const createJWT = (payload: any) => {
  return jwt.sign(payload, 'weak-secret', { algorithm: 'none' })
}
```

### Session Security
```typescript
// ✅ CORRECT: Secure session configuration
const sessionConfig = {
  name: 'clearhold_session',
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict'
  }
}

// Session regeneration after privilege changes
const upgradeUserSession = (req: Request) => {
  req.session.regenerate((err) => {
    if (err) throw err
    // Update session with new privileges
  })
}
```

### CSRF Protection
```typescript
// ✅ CORRECT: CSRF token implementation
import { generateCSRFToken, validateCSRFToken } from '@/lib/security/kyc-security'

const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    // Generate token for forms
    req.csrfToken = generateCSRFToken()
    res.locals.csrfToken = req.csrfToken
  } else {
    // Validate token for state-changing operations
    const token = req.headers['x-csrf-token'] || req.body._csrf
    const sessionToken = req.session.csrfToken
    
    if (!validateCSRFToken(token, sessionToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
  }
  next()
}
```

---

## File Upload Security

### File Validation
```typescript
import { validateFile } from '@/lib/security/kyc-security'

// ✅ CORRECT: Comprehensive file validation
const processFileUpload = async (file: File) => {
  // 1. Basic validation
  const basicValidation = validateFile(file)
  if (!basicValidation.valid) {
    throw new Error(basicValidation.error)
  }
  
  // 2. Magic byte validation
  const buffer = await file.arrayBuffer()
  const magicBytes = new Uint8Array(buffer.slice(0, 4))
  
  const isValidPDF = magicBytes[0] === 0x25 && magicBytes[1] === 0x50 && 
                     magicBytes[2] === 0x44 && magicBytes[3] === 0x46
  const isValidJPEG = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && 
                      magicBytes[2] === 0xFF
  const isValidPNG = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && 
                     magicBytes[2] === 0x4E && magicBytes[3] === 0x47
  
  if (!isValidPDF && !isValidJPEG && !isValidPNG) {
    throw new Error('Invalid file format')
  }
  
  // 3. Virus scanning (in production)
  if (process.env.NODE_ENV === 'production') {
    await scanForViruses(buffer)
  }
  
  // 4. Content analysis
  await analyzeFileContent(buffer, file.type)
  
  return buffer
}

// ❌ WRONG: Only checking filename
const processFileUpload = async (file: File) => {
  if (file.name.endsWith('.pdf') || file.name.endsWith('.jpg')) {
    return file
  }
  throw new Error('Invalid file type')
}
```

### Secure File Storage
```typescript
// ✅ CORRECT: Secure file storage
const storeSecureFile = async (file: File, userId: string) => {
  // Generate secure filename
  const fileId = crypto.randomUUID()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '')
  const secureFilename = `${fileId}-${sanitizedName}`
  
  // Encrypt file content
  const encryptedFile = await encryptionService.encryptFile(
    file,
    process.env.FILE_ENCRYPTION_KEY!
  )
  
  // Store in secure location
  const storagePath = `kyc-documents/${userId}/${secureFilename}`
  await secureStorage.upload(storagePath, encryptedFile)
  
  // Log the upload
  logger.security('file_uploaded', {
    userId,
    fileId,
    originalName: file.name,
    size: file.size,
    type: file.type
  })
  
  return { fileId, path: storagePath }
}
```

---

## API Security

### Rate Limiting
```typescript
// ✅ CORRECT: Distributed rate limiting
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

const rateLimiter = async (identifier: string, limit: number, window: number) => {
  const key = `rate_limit:${identifier}`
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, window)
  }
  
  if (current > limit) {
    const ttl = await redis.ttl(key)
    throw new RateLimitError(`Rate limit exceeded. Retry in ${ttl} seconds`)
  }
  
  return {
    count: current,
    remaining: Math.max(0, limit - current),
    resetTime: Date.now() + (window * 1000)
  }
}
```

### API Authentication
```typescript
// ✅ CORRECT: Secure API authentication
const authenticateApiRequest = async (req: Request) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = verifyJWT(token)
    
    // Check token blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`)
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked')
    }
    
    // Validate user is still active
    const user = await getUserById(decoded.sub)
    if (!user || !user.active) {
      throw new UnauthorizedError('User account is inactive')
    }
    
    return user
  } catch (error) {
    throw new UnauthorizedError('Invalid token')
  }
}
```

### Request Validation
```typescript
// ✅ CORRECT: Comprehensive request validation
import { z } from 'zod'

const kycPersonalInfoSchema = z.object({
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']*$/),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s\-']*$/),
  email: z.string().email().max(255),
  dateOfBirth: z.string().datetime(),
  address: z.object({
    street: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    country: z.string().min(2).max(2), // ISO country code
    postalCode: z.string().min(3).max(20)
  })
})

const validateApiRequest = async (req: Request, schema: z.ZodSchema) => {
  // Validate content type
  if (!req.headers['content-type']?.includes('application/json')) {
    throw new BadRequestError('Content-Type must be application/json')
  }
  
  // Validate request size
  const contentLength = parseInt(req.headers['content-length'] || '0')
  if (contentLength > 1024 * 1024) { // 1MB limit
    throw new BadRequestError('Request body too large')
  }
  
  // Parse and validate JSON
  let body
  try {
    body = await req.json()
  } catch (error) {
    throw new BadRequestError('Invalid JSON in request body')
  }
  
  // Schema validation
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new BadRequestError('Validation failed', result.error.errors)
  }
  
  return result.data
}
```

---

## Client-Side Security

### Content Security Policy
```typescript
// ✅ CORRECT: Strict CSP implementation
const generateCSPNonce = () => crypto.randomBytes(16).toString('base64')

const getCSPHeader = (nonce: string) => {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://apis.google.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.clearhold.app",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests"
  ]
  
  return directives.join('; ')
}
```

### Secure Data Handling
```typescript
// ✅ CORRECT: Secure client-side data handling
const SecureKYCForm = () => {
  const [sensitiveData, setSensitiveData] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Clear sensitive data from memory when component unmounts
  useEffect(() => {
    return () => {
      // Clear state
      setSensitiveData('')
      
      // Clear any cached values
      if (typeof window !== 'undefined') {
        // Clear autocomplete values
        const inputs = document.querySelectorAll('input[data-sensitive]')
        inputs.forEach(input => {
          ;(input as HTMLInputElement).value = ''
        })
      }
    }
  }, [])
  
  const handleSubmit = async (formData: FormData) => {
    try {
      setIsProcessing(true)
      
      // Client-side encryption before transmission
      const encryptedData = await clientEncrypt(formData)
      await submitKYCData(encryptedData)
      
    } finally {
      // Clear sensitive data immediately after processing
      setSensitiveData('')
      setIsProcessing(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <SecureInput
        type="text"
        name="ssn"
        sensitive={true}
        validationType="documentNumber"
        onChange={(e) => setSensitiveData(e.target.value)}
        onBlur={() => {
          // Clear from DOM after user interaction
          setTimeout(() => {
            ;(e.target as HTMLInputElement).value = ''
          }, 100)
        }}
      />
    </form>
  )
}
```

### Secure Communication
```typescript
// ✅ CORRECT: Secure API client
const createSecureApiClient = () => {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 30000,
    withCredentials: true
  })
  
  // Request interceptor for security headers
  client.interceptors.request.use((config) => {
    // Add CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID()
    
    // Validate HTTPS in production
    if (process.env.NODE_ENV === 'production' && !config.url?.startsWith('https://')) {
      throw new Error('HTTPS required in production')
    }
    
    return config
  })
  
  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Don't log sensitive data in errors
      const sanitizedError = {
        message: error.message,
        status: error.response?.status,
        requestId: error.config?.headers['X-Request-ID']
      }
      
      logger.error('API request failed', sanitizedError)
      return Promise.reject(error)
    }
  )
  
  return client
}
```

---

## Logging & Monitoring

### Security Event Logging
```typescript
// ✅ CORRECT: Structured security logging
interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'file_upload' | 'system'
  action: string
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  timestamp: string
  success: boolean
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const logSecurityEvent = (event: SecurityEvent) => {
  // Remove sensitive data before logging
  const sanitizedEvent = {
    ...event,
    details: event.details ? sanitizeLogData(event.details) : undefined
  }
  
  // Send to security monitoring system
  securityLogger.log(sanitizedEvent)
  
  // Alert on high/critical events
  if (event.severity === 'high' || event.severity === 'critical') {
    alertingService.sendAlert(sanitizedEvent)
  }
}

// Example usage
logSecurityEvent({
  type: 'authentication',
  action: 'login_failed',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent') || '',
  timestamp: new Date().toISOString(),
  success: false,
  details: { reason: 'invalid_credentials', attemptCount: 3 },
  severity: 'medium'
})
```

### Data Sanitization for Logs
```typescript
// ✅ CORRECT: Log data sanitization
const sanitizeLogData = (data: any): any => {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'ssn', 'social',
    'credit_card', 'bank_account', 'routing_number', 'date_of_birth'
  ]
  
  if (typeof data === 'string') {
    // Check if string contains sensitive patterns
    if (sensitiveFields.some(field => data.toLowerCase().includes(field))) {
      return '[REDACTED]'
    }
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData)
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeLogData(value)
      }
    }
    return sanitized
  }
  
  return data
}
```

### Performance Monitoring
```typescript
// ✅ CORRECT: Security-aware performance monitoring
const monitorAPIPerformance = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const isSlowRequest = duration > 5000 // 5 seconds
    
    // Log performance metrics
    logger.info('api_request_completed', {
      method: req.method,
      path: sanitizePath(req.path), // Remove sensitive path parameters
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    })
    
    // Alert on unusually slow security-sensitive endpoints
    if (isSlowRequest && req.path.includes('/kyc/')) {
      alertingService.sendAlert({
        type: 'performance',
        message: 'Slow KYC endpoint response',
        details: {
          path: sanitizePath(req.path),
          duration,
          threshold: 5000
        },
        severity: 'medium'
      })
    }
  })
  
  next()
}
```

---

## Incident Response

### Security Incident Classification
```typescript
// ✅ CORRECT: Incident classification system
interface SecurityIncident {
  id: string
  type: 'data_breach' | 'unauthorized_access' | 'malware' | 'ddos' | 'insider_threat'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'detected' | 'investigating' | 'contained' | 'resolved'
  description: string
  affectedSystems: string[]
  detectedAt: Date
  reportedBy: string
  assignedTo?: string
  containmentActions: string[]
  evidenceLinks: string[]
}

const reportSecurityIncident = async (incident: Omit<SecurityIncident, 'id'>) => {
  const incidentId = `INC-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`
  
  const fullIncident: SecurityIncident = {
    ...incident,
    id: incidentId
  }
  
  // Store incident
  await incidentStore.create(fullIncident)
  
  // Immediate notifications for high/critical incidents
  if (incident.severity === 'high' || incident.severity === 'critical') {
    await notifySecurityTeam(fullIncident)
    await notifyManagement(fullIncident)
  }
  
  // Auto-escalate if not acknowledged within SLA
  setTimeout(async () => {
    const current = await incidentStore.get(incidentId)
    if (current.status === 'detected') {
      await escalateIncident(incidentId)
    }
  }, getEscalationTimeout(incident.severity))
  
  return incidentId
}
```

### Automated Incident Response
```typescript
// ✅ CORRECT: Automated response actions
const automatedIncidentResponse = {
  async handleSuspiciousLogin(event: SecurityEvent) {
    if (event.details?.failedAttempts >= 5) {
      // Temporarily lock account
      await userService.lockAccount(event.userId!, '15 minutes')
      
      // Invalidate all sessions
      await sessionService.invalidateAllSessions(event.userId!)
      
      // Notify user via secure channel
      await notificationService.sendSecurityAlert(event.userId!, {
        type: 'suspicious_login',
        ipAddress: event.ipAddress,
        timestamp: event.timestamp
      })
      
      // Report incident
      await reportSecurityIncident({
        type: 'unauthorized_access',
        severity: 'medium',
        status: 'contained',
        description: `Multiple failed login attempts detected for user ${event.userId}`,
        affectedSystems: ['authentication'],
        detectedAt: new Date(),
        reportedBy: 'automated_system',
        containmentActions: ['account_locked', 'sessions_invalidated', 'user_notified']
      })
    }
  },
  
  async handleDataBreach(suspiciousActivity: any) {
    // Immediate containment
    await networkService.isolateAffectedSystems(suspiciousActivity.systems)
    
    // Preserve evidence
    const evidenceId = await forensicsService.captureEvidence(suspiciousActivity)
    
    // Notify authorities (if required)
    if (suspiciousActivity.severity === 'critical') {
      await complianceService.notifyRegulators(suspiciousActivity)
    }
    
    // Report incident
    await reportSecurityIncident({
      type: 'data_breach',
      severity: 'critical',
      status: 'investigating',
      description: 'Potential data breach detected',
      affectedSystems: suspiciousActivity.systems,
      detectedAt: new Date(),
      reportedBy: 'automated_detection',
      containmentActions: ['systems_isolated', 'evidence_preserved'],
      evidenceLinks: [evidenceId]
    })
  }
}
```

---

## Security Testing

### Unit Testing Security Functions
```typescript
// ✅ CORRECT: Security function testing
describe('KYC Security Functions', () => {
  describe('Input Validation', () => {
    it('should prevent XSS attacks', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")'
      ]
      
      xssPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload, 'name')
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onerror')
      })
    })
    
    it('should prevent SQL injection', () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "' UNION SELECT * FROM users --"
      ]
      
      sqlPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload, 'name')
        expect(sanitized).not.toContain('DROP')
        expect(sanitized).not.toContain('UNION')
        expect(sanitized).not.toContain('--')
      })
    })
  })
  
  describe('Encryption', () => {
    it('should use unique IVs for each encryption', () => {
      const data = 'sensitive data'
      const password = 'test-password'
      
      const encrypted1 = encryptionService.encryptPII(data, KYCFieldType.SSN, password)
      const encrypted2 = encryptionService.encryptPII(data, KYCFieldType.SSN, password)
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.data).not.toBe(encrypted2.data)
    })
    
    it('should detect tampering via HMAC', () => {
      const data = 'sensitive data'
      const password = 'test-password'
      
      const encrypted = encryptionService.encryptPII(data, KYCFieldType.SSN, password)
      
      // Tamper with data
      const tamperedData = encrypted.data.slice(0, -2) + 'XX'
      
      expect(() => {
        encryptionService.decryptPII(
          { ...encrypted, data: tamperedData },
          password
        )
      }).toThrow('Authentication tag verification failed')
    })
  })
})
```

### Integration Testing
```typescript
// ✅ CORRECT: Security integration tests
describe('KYC API Security Integration', () => {
  let authToken: string
  let csrfToken: string
  
  beforeEach(async () => {
    // Set up authenticated session
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
    
    authToken = loginResponse.body.token
    csrfToken = loginResponse.body.csrfToken
  })
  
  it('should reject requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/kyc/personal')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ firstName: 'John', lastName: 'Doe' })
    
    expect(response.status).toBe(403)
    expect(response.body.error).toContain('CSRF')
  })
  
  it('should enforce rate limiting', async () => {
    const requests = Array(11).fill(null).map(() =>
      request(app)
        .post('/api/kyc/personal')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ firstName: 'John', lastName: 'Doe' })
    )
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status === 429)
    
    expect(rateLimited.length).toBeGreaterThan(0)
  })
  
  it('should sanitize malicious input', async () => {
    const maliciousInput = {
      firstName: '<script>alert("XSS")</script>',
      lastName: "'; DROP TABLE users; --"
    }
    
    const response = await request(app)
      .post('/api/kyc/personal')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send(maliciousInput)
    
    // Should either reject or sanitize
    expect(response.status).toBeOneOf([400, 200])
    
    if (response.status === 200) {
      // If accepted, should be sanitized
      expect(response.body.data.firstName).not.toContain('<script')
      expect(response.body.data.lastName).not.toContain('DROP')
    }
  })
})
```

### Penetration Testing Checklist
```typescript
// Security testing checklist for penetration testers
const penTestChecklist = {
  authentication: [
    'Test for authentication bypass',
    'Verify session management security',
    'Check for privilege escalation',
    'Test multi-factor authentication',
    'Verify password policies'
  ],
  
  inputValidation: [
    'Test XSS vulnerabilities',
    'Test SQL injection',
    'Test command injection',
    'Test path traversal',
    'Test file upload restrictions'
  ],
  
  sessionManagement: [
    'Test session fixation',
    'Test session hijacking',
    'Verify session timeout',
    'Check secure cookie flags',
    'Test concurrent sessions'
  ],
  
  apiSecurity: [
    'Test rate limiting',
    'Verify CORS configuration',
    'Test API authentication',
    'Check for API enumeration',
    'Test parameter pollution'
  ],
  
  cryptography: [
    'Verify encryption strength',
    'Test key management',
    'Check for weak algorithms',
    'Test certificate validation',
    'Verify random number generation'
  ]
}
```

---

## Compliance Requirements

### GDPR Compliance Checklist
- [ ] **Data Minimization**: Only collect necessary PII
- [ ] **Consent Management**: Clear consent for data processing
- [ ] **Right to Access**: Users can request their data
- [ ] **Right to Rectification**: Users can correct their data
- [ ] **Right to Erasure**: Users can delete their data
- [ ] **Data Portability**: Users can export their data
- [ ] **Privacy by Design**: Built-in privacy protections
- [ ] **Data Protection Officer**: Appointed and contactable
- [ ] **Breach Notification**: 72-hour breach reporting
- [ ] **Regular Audits**: Scheduled compliance reviews

### PCI-DSS Requirements
- [ ] **Strong Cryptography**: AES-256 encryption
- [ ] **Access Control**: Role-based permissions
- [ ] **Secure Development**: SDLC security practices
- [ ] **Regular Testing**: Penetration testing
- [ ] **Monitoring**: Security event logging
- [ ] **Network Security**: Firewall configurations
- [ ] **Vulnerability Management**: Regular scans
- [ ] **Asset Inventory**: Complete system inventory

### SOC 2 Controls
- [ ] **CC1**: Control Environment
- [ ] **CC2**: Communication and Information
- [ ] **CC3**: Risk Assessment
- [ ] **CC4**: Monitoring Activities
- [ ] **CC5**: Control Activities
- [ ] **CC6**: Logical and Physical Access
- [ ] **CC7**: System Operations
- [ ] **CC8**: Change Management
- [ ] **CC9**: Risk Mitigation

---

## Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

### Tools
- **SAST**: SonarQube, Checkmarx, Veracode
- **DAST**: OWASP ZAP, Burp Suite, Acunetix
- **Dependency Scanning**: Snyk, WhiteSource, GitHub Security
- **Secret Scanning**: GitGuardian, TruffleHog
- **Container Security**: Aqua, Twistlock, Clair

### Training
- OWASP WebGoat for hands-on security training
- Secure Code Warrior for secure development
- SANS courses for advanced security topics
- Internal security workshops and brown bags

---

## Getting Help

### Security Team Contacts
- **Security Lead**: security-lead@clearhold.app
- **Incident Response**: incident-response@clearhold.app
- **Security Escalation**: security-escalation@clearhold.app

### Emergency Procedures
1. **Immediate Threat**: Call security hotline
2. **Data Breach**: Follow incident response plan
3. **System Compromise**: Isolate and preserve evidence
4. **Compliance Issue**: Contact legal and compliance teams

### Security Review Process
1. Create security review ticket
2. Attach code changes and documentation
3. Security team reviews within 2 business days
4. Address feedback and re-submit if needed
5. Security approval required before deployment

---

**Remember**: Security is everyone's responsibility. When in doubt, ask the security team!

*This document is classified as INTERNAL and should only be shared with authorized personnel.*