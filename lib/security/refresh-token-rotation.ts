import crypto from 'crypto';

/**
 * Refresh Token Rotation Implementation
 * 
 * This module implements secure refresh token rotation to:
 * 1. Prevent token replay attacks
 * 2. Limit token lifetime exposure
 * 3. Detect token theft
 * 4. Maintain session continuity
 */

// Token families track refresh token lineage
const tokenFamilies = new Map<string, {
  familyId: string;
  currentRefreshToken: string;
  previousRefreshToken?: string;
  userId: string;
  createdAt: number;
  lastRotated: number;
  rotationCount: number;
  suspected?: boolean;
}>()

// Blacklisted tokens (detected as stolen or manually revoked)
const blacklistedTokens = new Set<string>()

// Token metadata storage
const tokenMetadata = new Map<string, {
  userId: string;
  familyId: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
  deviceFingerprint?: string;
  ipAddress?: string;
}>()

interface RefreshTokenOptions {
  userId: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  accessTokenDuration?: number; // in seconds
  refreshTokenDuration?: number; // in seconds
}

interface TokenRotationResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenFamily: string;
}

interface TokenValidationResult {
  valid: boolean;
  reason?: string;
  userId?: string;
  familyId?: string;
}

/**
 * Generate a secure token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Generate a token family ID
 */
function generateFamilyId(): string {
  return `fam_${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Create initial refresh token for a new session
 */
export function createInitialRefreshToken(options: RefreshTokenOptions): TokenRotationResult {
  const {
    userId,
    deviceFingerprint,
    ipAddress,
    accessTokenDuration = 900, // 15 minutes
    refreshTokenDuration = 2592000 // 30 days
  } = options

  const familyId = generateFamilyId()
  const refreshToken = generateSecureToken()
  const now = Date.now()

  // Store token family
  tokenFamilies.set(familyId, {
    familyId,
    currentRefreshToken: refreshToken,
    userId,
    createdAt: now,
    lastRotated: now,
    rotationCount: 0
  })

  // Store token metadata
  tokenMetadata.set(refreshToken, {
    userId,
    familyId,
    issuedAt: now,
    expiresAt: now + (refreshTokenDuration * 1000),
    used: false,
    deviceFingerprint,
    ipAddress
  })

  // Generate access token (simplified - in production, use proper JWT)
  const accessToken = generateAccessToken(userId, accessTokenDuration)

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenDuration,
    tokenFamily: familyId
  }
}

/**
 * Rotate refresh token
 */
export async function rotateRefreshToken(
  currentRefreshToken: string,
  options: Partial<RefreshTokenOptions> = {}
): Promise<TokenRotationResult | { error: string; code: string }> {
  // Check if token is blacklisted
  if (blacklistedTokens.has(currentRefreshToken)) {
    return { error: 'Token has been revoked', code: 'TOKEN_REVOKED' }
  }

  // Get token metadata
  const metadata = tokenMetadata.get(currentRefreshToken)
  if (!metadata) {
    return { error: 'Invalid refresh token', code: 'INVALID_TOKEN' }
  }

  // Check if token is expired
  if (Date.now() > metadata.expiresAt) {
    tokenMetadata.delete(currentRefreshToken)
    return { error: 'Refresh token expired', code: 'TOKEN_EXPIRED' }
  }

  // Check if token has already been used
  if (metadata.used) {
    // Token reuse detected - possible theft
    await handleTokenTheft(metadata.familyId)
    return { error: 'Token reuse detected. All tokens revoked.', code: 'TOKEN_THEFT_DETECTED' }
  }

  // Get token family
  const family = tokenFamilies.get(metadata.familyId)
  if (!family) {
    return { error: 'Token family not found', code: 'INVALID_FAMILY' }
  }

  // Verify this is the current token in the family
  if (family.currentRefreshToken !== currentRefreshToken) {
    // This might be an old token - check if it's the previous one
    if (family.previousRefreshToken === currentRefreshToken) {
      // Automatic reuse of previous token - likely a race condition
      // Allow it once but log for monitoring
      console.warn('Previous refresh token reused:', {
        familyId: family.familyId,
        userId: family.userId
      })
    } else {
      // Unknown token in family - possible theft
      await handleTokenTheft(metadata.familyId)
      return { error: 'Invalid token for family', code: 'TOKEN_THEFT_DETECTED' }
    }
  }

  // Mark current token as used
  metadata.used = true

  // Generate new refresh token
  const newRefreshToken = generateSecureToken()
  const now = Date.now()
  const refreshTokenDuration = options.refreshTokenDuration || 2592000 // 30 days

  // Update token family
  family.previousRefreshToken = currentRefreshToken
  family.currentRefreshToken = newRefreshToken
  family.lastRotated = now
  family.rotationCount++

  // Store new token metadata
  tokenMetadata.set(newRefreshToken, {
    userId: metadata.userId,
    familyId: metadata.familyId,
    issuedAt: now,
    expiresAt: now + (refreshTokenDuration * 1000),
    used: false,
    deviceFingerprint: options.deviceFingerprint || metadata.deviceFingerprint,
    ipAddress: options.ipAddress || metadata.ipAddress
  })

  // Generate new access token
  const accessTokenDuration = options.accessTokenDuration || 900
  const accessToken = generateAccessToken(metadata.userId, accessTokenDuration)

  // Clean up old token after a grace period (5 minutes)
  setTimeout(() => {
    tokenMetadata.delete(currentRefreshToken)
  }, 5 * 60 * 1000)

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: accessTokenDuration,
    tokenFamily: metadata.familyId
  }
}

/**
 * Handle suspected token theft
 */
async function handleTokenTheft(familyId: string): Promise<void> {
  const family = tokenFamilies.get(familyId)
  if (!family) return

  console.error('Token theft detected:', {
    familyId,
    userId: family.userId,
    rotationCount: family.rotationCount
  })

  // Mark family as suspected
  family.suspected = true

  // Blacklist all tokens in the family
  if (family.currentRefreshToken) {
    blacklistedTokens.add(family.currentRefreshToken)
  }
  if (family.previousRefreshToken) {
    blacklistedTokens.add(family.previousRefreshToken)
  }

  // Remove family
  tokenFamilies.delete(familyId)

  // In production, you would:
  // 1. Log security event
  // 2. Send alert to user
  // 3. Require re-authentication
  // 4. Possibly trigger additional security measures
}

/**
 * Validate refresh token without using it
 */
export function validateRefreshToken(refreshToken: string): TokenValidationResult {
  if (blacklistedTokens.has(refreshToken)) {
    return { valid: false, reason: 'Token has been revoked' }
  }

  const metadata = tokenMetadata.get(refreshToken)
  if (!metadata) {
    return { valid: false, reason: 'Invalid token' }
  }

  if (Date.now() > metadata.expiresAt) {
    return { valid: false, reason: 'Token expired' }
  }

  if (metadata.used) {
    return { valid: false, reason: 'Token already used' }
  }

  return {
    valid: true,
    userId: metadata.userId,
    familyId: metadata.familyId
  }
}

/**
 * Revoke all tokens for a user
 */
export function revokeAllUserTokens(userId: string): void {
  // Find all families for user
  const userFamilies = Array.from(tokenFamilies.entries())
    .filter(([_, family]) => family.userId === userId)
    .map(([familyId]) => familyId)

  // Revoke each family
  userFamilies.forEach(familyId => {
    handleTokenTheft(familyId)
  })
}

/**
 * Revoke specific token family
 */
export function revokeTokenFamily(familyId: string): void {
  handleTokenTheft(familyId)
}

/**
 * Clean up expired tokens (run periodically)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now()
  
  // Clean up expired token metadata
  for (const [token, metadata] of tokenMetadata.entries()) {
    if (now > metadata.expiresAt + 24 * 60 * 60 * 1000) { // 24 hours after expiry
      tokenMetadata.delete(token)
    }
  }

  // Clean up old families (no activity for 60 days)
  for (const [familyId, family] of tokenFamilies.entries()) {
    if (now - family.lastRotated > 60 * 24 * 60 * 60 * 1000) {
      tokenFamilies.delete(familyId)
    }
  }
}

/**
 * Generate access token (simplified - in production use proper JWT)
 */
function generateAccessToken(userId: string, expiresIn: number): string {
  // In production, this would:
  // 1. Generate proper JWT with claims
  // 2. Sign with secret key
  // 3. Include proper headers
  
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    jti: crypto.randomBytes(16).toString('hex')
  }

  // Simplified encoding (in production use proper JWT library)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * Get token statistics for monitoring
 */
export function getTokenStatistics() {
  return {
    activeFamilies: tokenFamilies.size,
    activeTokens: tokenMetadata.size,
    blacklistedTokens: blacklistedTokens.size,
    suspectedFamilies: Array.from(tokenFamilies.values()).filter(f => f.suspected).length
  }
}

// Schedule periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000) // Every hour
}