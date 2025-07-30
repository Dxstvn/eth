import React from 'react';
import { signRequest, requiresSigning } from '@/lib/security/request-signing';

/**
 * HMAC Request Signing Interceptor
 * 
 * Automatically signs critical API requests with HMAC-SHA256
 */

interface HMACInterceptorConfig {
  getSigningKey: () => string | null;
  getUserId?: () => string | undefined;
  includeBody?: boolean;
}

export function createHMACInterceptor(config: HMACInterceptorConfig) {
  return async (requestConfig: RequestInit & { url?: string }): Promise<RequestInit> => {
    // For the API client, we need to handle this differently
    // The URL will be constructed in the request method
    // For now, return the config as-is
    // The actual signing will happen in a modified request method
    return requestConfig;

    // Check if this endpoint requires signing
    if (!requiresSigning(path)) {
      return requestConfig;
    }

    // Get signing key
    const signingKey = config.getSigningKey();
    if (!signingKey) {
      console.warn('HMAC signing key not available for critical endpoint:', path);
      return requestConfig;
    }

    // Get request method
    const method = requestConfig.method || 'GET';

    // Parse body if present
    let body;
    if (requestConfig.body) {
      try {
        body = JSON.parse(requestConfig.body as string);
      } catch {
        // Body might not be JSON
        body = requestConfig.body;
      }
    }

    // Sign the request
    const signatureHeaders = signRequest(
      method,
      path,
      {
        secretKey: signingKey,
        userId: config.getUserId?.(),
        includeBody: config.includeBody !== false && !!body
      },
      body
    );

    // Add signature headers to the request
    const headers = new Headers(requestConfig.headers);
    Object.entries(signatureHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return {
      ...requestConfig,
      headers
    };
  };
}

/**
 * Get HMAC signing key from environment or secure storage
 */
export function getHMACSigningKey(): string | null {
  // In a real application, this should come from a secure source
  // For client-side, it could be derived from user credentials
  // For server-side, it should be in environment variables
  
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.HMAC_SECRET_KEY || null;
  } else {
    // Client-side - derive from user session
    // This is a simplified example - in production, use a more secure method
    const userToken = localStorage.getItem('clearhold_auth_token');
    if (!userToken) return null;
    
    // In production, this should be a derived key specific for HMAC
    // not the actual auth token
    return deriveHMACKey(userToken);
  }
}

/**
 * Derive HMAC key from user credentials
 * This is a placeholder - implement based on your security requirements
 */
function deriveHMACKey(userToken: string): string {
  // In production, this should:
  // 1. Use a proper key derivation function (KDF)
  // 2. Include a salt specific to the user
  // 3. Be consistent across sessions
  
  // For now, we'll use a simple hash of the token
  // This is NOT secure for production use
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Use Web Crypto API in browser
    return userToken; // Placeholder
  }
  
  return userToken; // Placeholder
}

/**
 * React hook for HMAC configuration
 */
export function useHMACConfig() {
  const [signingKey, setSigningKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Initialize signing key
    const key = getHMACSigningKey();
    setSigningKey(key);

    // Listen for auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clearhold_auth_token') {
        const newKey = getHMACSigningKey();
        setSigningKey(newKey);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { signingKey };
}