import crypto from 'crypto';
import React from 'react';

/**
 * HMAC Request Signing for Critical API Operations
 * 
 * This module provides request signing functionality to ensure:
 * 1. Request integrity - Prevent tampering
 * 2. Request authenticity - Verify sender
 * 3. Replay protection - Prevent request replay attacks
 */

// Critical endpoints that require HMAC signing
const CRITICAL_ENDPOINTS = [
  '/transaction/create',
  '/transaction/complete',
  '/transaction/cancel',
  '/wallet/register',
  '/wallet/update',
  '/kyc/submit',
  '/kyc/approve',
  '/auth/changePassword',
  '/auth/deleteAccount',
  '/contacts/invite',
  '/files/delete'
];

interface SignedRequestHeaders {
  'X-Request-Timestamp': string;
  'X-Request-Nonce': string;
  'X-Request-Signature': string;
  'X-Request-Algorithm': string;
}

interface SigningOptions {
  secretKey: string;
  userId?: string;
  includeBody?: boolean;
}

/**
 * Generate a cryptographically secure nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create canonical request string for signing
 */
function createCanonicalRequest(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body?: any,
  userId?: string
): string {
  const parts = [
    method.toUpperCase(),
    path,
    timestamp,
    nonce
  ];

  if (userId) {
    parts.push(userId);
  }

  if (body && typeof body === 'object') {
    // Sort keys for consistent ordering
    const sortedBody = JSON.stringify(body, Object.keys(body).sort());
    parts.push(crypto.createHash('sha256').update(sortedBody).digest('hex'));
  }

  return parts.join('\n');
}

/**
 * Sign a request with HMAC-SHA256
 */
export function signRequest(
  method: string,
  path: string,
  options: SigningOptions,
  body?: any
): SignedRequestHeaders {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const canonicalRequest = createCanonicalRequest(
    method,
    path,
    timestamp,
    nonce,
    options.includeBody ? body : undefined,
    options.userId
  );

  const signature = crypto
    .createHmac('sha256', options.secretKey)
    .update(canonicalRequest)
    .digest('hex');

  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Nonce': nonce,
    'X-Request-Signature': signature,
    'X-Request-Algorithm': 'HMAC-SHA256'
  };
}

/**
 * Verify a signed request
 */
export function verifyRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  secretKey: string,
  body?: any,
  options?: {
    maxAgeSeconds?: number;
    userId?: string;
  }
): { valid: boolean; error?: string } {
  const maxAge = options?.maxAgeSeconds || 300; // 5 minutes default

  // Extract required headers
  const timestamp = headers['x-request-timestamp'] || headers['X-Request-Timestamp'];
  const nonce = headers['x-request-nonce'] || headers['X-Request-Nonce'];
  const signature = headers['x-request-signature'] || headers['X-Request-Signature'];
  const algorithm = headers['x-request-algorithm'] || headers['X-Request-Algorithm'];

  if (!timestamp || !nonce || !signature) {
    return { valid: false, error: 'Missing required signature headers' };
  }

  if (algorithm !== 'HMAC-SHA256') {
    return { valid: false, error: 'Unsupported signature algorithm' };
  }

  // Check timestamp to prevent replay attacks
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  if (Math.abs(currentTime - requestTime) > maxAge) {
    return { valid: false, error: 'Request timestamp too old or too far in future' };
  }

  // Recreate canonical request
  const canonicalRequest = createCanonicalRequest(
    method,
    path,
    timestamp,
    nonce,
    body,
    options?.userId
  );

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalRequest)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  return { valid };
}

/**
 * Check if an endpoint requires HMAC signing
 */
export function requiresSigning(path: string): boolean {
  return CRITICAL_ENDPOINTS.some(endpoint => path.startsWith(endpoint));
}

/**
 * Middleware helper for Next.js API routes
 */
export function withRequestSigning(
  handler: Function,
  options?: {
    secretKey?: string;
    maxAgeSeconds?: number;
  }
) {
  return async (req: any, res: any) => {
    const secretKey = options?.secretKey || process.env.HMAC_SECRET_KEY;
    
    if (!secretKey) {
      console.error('HMAC secret key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Skip signing check for non-critical endpoints
    if (!requiresSigning(req.url)) {
      return handler(req, res);
    }

    const verification = verifyRequest(
      req.method,
      req.url,
      req.headers,
      secretKey,
      req.body,
      {
        maxAgeSeconds: options?.maxAgeSeconds,
        userId: req.user?.id // Assumes user is attached by auth middleware
      }
    );

    if (!verification.valid) {
      return res.status(401).json({ 
        error: 'Invalid request signature',
        details: verification.error 
      });
    }

    // Add nonce to request for additional replay protection
    req.requestNonce = req.headers['x-request-nonce'];

    return handler(req, res);
  };
}

/**
 * Client-side helper to sign fetch requests
 */
export async function signedFetch(
  url: string,
  options: RequestInit & { 
    signingKey?: string;
    userId?: string;
  } = {}
): Promise<Response> {
  // Derive signing key from user session instead of using exposed key
  const signingKey = options.signingKey || deriveSigningKeyFromSession();
  
  if (!signingKey) {
    throw new Error('HMAC signing key not available - user must be authenticated');
  }

  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname + urlObj.search;
  
  // Only sign critical endpoints
  if (!requiresSigning(path)) {
    return fetch(url, options);
  }

  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : undefined;

  const signatureHeaders = signRequest(
    method,
    path,
    {
      secretKey: signingKey,
      userId: options.userId,
      includeBody: !!body
    },
    body
  );

  const headers = new Headers(options.headers);
  Object.entries(signatureHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * React hook for signed requests
 */
export function useSignedRequest() {
  const signRequest = React.useCallback(
    async (url: string, options?: RequestInit) => {
      return signedFetch(url, {
        ...options,
        userId: getCurrentUserId() // Implement based on your auth system
      });
    },
    []
  );

  return { signRequest };
}

// Helper to get current user ID (implement based on your auth system)
function getCurrentUserId(): string | undefined {
  // This should be implemented based on your authentication system
  // For example, from a context or localStorage
  return undefined;
}

/**
 * Derive HMAC signing key from user session
 * This creates a unique key per session without exposing secrets
 */
function deriveSigningKeyFromSession(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Get user's auth token
  const authToken = localStorage.getItem('clearhold_auth_token');
  if (!authToken) return null;
  
  try {
    // Parse token to get user ID and session info
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    
    // Create a deterministic key from user session data
    // In production, this should use Web Crypto API for proper key derivation
    const sessionData = [
      payload.sub || payload.userId,
      payload.sessionId || payload.jti,
      payload.iat,
      window.location.origin
    ].join(':');
    
    // Simple hash for demo - in production use proper KDF
    return btoa(sessionData).substring(0, 32);
  } catch (error) {
    console.error('Failed to derive signing key:', error);
    return null;
  }
}

// For Next.js middleware support
export interface SignatureMiddlewareConfig {
  secretKey?: string;
  maxAgeSeconds?: number;
  skipPaths?: string[];
}

/**
 * Verify request signature in Next.js middleware
 */
export function verifySignatureMiddleware(
  request: Request,
  config?: SignatureMiddlewareConfig
): { valid: boolean; error?: string } {
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip non-critical endpoints
  if (!requiresSigning(path)) {
    return { valid: true };
  }

  // Skip configured paths
  if (config?.skipPaths?.some(skip => path.startsWith(skip))) {
    return { valid: true };
  }

  const secretKey = config?.secretKey || process.env.HMAC_SECRET_KEY;
  if (!secretKey) {
    return { valid: false, error: 'HMAC secret key not configured' };
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return verifyRequest(
    request.method,
    path + url.search,
    headers,
    secretKey,
    request.body,
    { maxAgeSeconds: config?.maxAgeSeconds }
  );
}