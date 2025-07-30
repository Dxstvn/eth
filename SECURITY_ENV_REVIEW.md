# Security Review: NEXT_PUBLIC Environment Variables

## Overview
This document reviews all `NEXT_PUBLIC_` environment variables for potential security issues. In Next.js, any environment variable prefixed with `NEXT_PUBLIC_` is exposed to the client-side code.

## Environment Variables Found

### 1. **NEXT_PUBLIC_API_URL** ✅ SAFE
- **Usage**: API endpoint configuration
- **Found in**: `services/api-config.ts`, `services/api.ts`, `services/wallet-api.ts`, `next.config.js`
- **Value**: Points to API server (e.g., "https://api.clearhold.app")
- **Security Assessment**: SAFE - Public API endpoints need to be known by the client

### 2. **NEXT_PUBLIC_WS_URL** ✅ SAFE
- **Usage**: WebSocket connection URL
- **Found in**: `services/realtime-service.ts`
- **Security Assessment**: SAFE - WebSocket endpoints are public

### 3. **NEXT_PUBLIC_FIREBASE_*** ⚠️ REVIEW REQUIRED
- **Variables**:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- **Usage**: Firebase configuration
- **Found in**: `lib/firebase-client.ts`
- **Security Assessment**: GENERALLY SAFE - Firebase config is designed to be public, security is enforced through Firebase Security Rules. However:
  - Ensure Firebase Security Rules are properly configured
  - API keys should be restricted to specific domains in Firebase Console
  - Monitor usage quotas to prevent abuse

### 4. **NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT** ⚠️ CAUTION
- **Usage**: Error logging service endpoint
- **Found in**: `services/error-service.ts`
- **Security Assessment**: SAFE if properly configured, but ensure rate limiting on the endpoint

### 5. **NEXT_PUBLIC_ERROR_LOGGING_API_KEY** ❌ SECURITY RISK
- **Usage**: API key for error logging service
- **Found in**: `services/error-service.ts`
- **Security Assessment**: RISKY - API keys should not be exposed client-side
- **Recommendation**: Move error logging to backend or use a service that supports domain restrictions

### 6. **NEXT_PUBLIC_HMAC_CLIENT_KEY** ❌ SECURITY RISK
- **Usage**: HMAC signing key for requests
- **Found in**: `lib/security/request-signing.ts`
- **Security Assessment**: CRITICAL RISK - Signing keys must never be exposed
- **Recommendation**: Implement proper key derivation or move signing to backend

### 7. **NEXT_PUBLIC_APP_URL** ✅ SAFE
- **Usage**: Application URL for CSP and redirects
- **Found in**: `middleware-kyc.ts`, `lib/security/kyc-security.ts`
- **Security Assessment**: SAFE - Application URL is public information

### 8. **NEXT_PUBLIC_API_VERSION** ✅ SAFE
- **Usage**: API version tracking
- **Found in**: `services/api/cached-client.ts`
- **Security Assessment**: SAFE - Version information is not sensitive

### 9. **NEXT_PUBLIC_API_VERBOSE** ✅ SAFE
- **Usage**: Debug logging flag
- **Found in**: `services/api/logger.ts`
- **Security Assessment**: SAFE - But should be disabled in production

### 10. **NEXT_PUBLIC_BYPASS_AUTH** ⚠️ DEVELOPMENT ONLY
- **Usage**: Development bypass for authentication
- **Found in**: Multiple files
- **Security Assessment**: DANGEROUS if enabled in production
- **Recommendation**: Ensure this is NEVER set in production environments

## Recommendations

### High Priority (Security Risks):
1. **Remove NEXT_PUBLIC_ERROR_LOGGING_API_KEY**
   - Move error logging to backend
   - Or use a service with domain-based authentication

2. **Remove NEXT_PUBLIC_HMAC_CLIENT_KEY**
   - Implement proper key derivation from user credentials
   - Or move request signing entirely to backend

### Medium Priority:
3. **Restrict Firebase API Keys**
   - Configure domain restrictions in Firebase Console
   - Implement proper Firebase Security Rules
   - Monitor usage and set up alerts for anomalies

4. **Ensure Development Variables Don't Leak**
   - Add checks to prevent `NEXT_PUBLIC_BYPASS_AUTH` in production
   - Consider using different .env files for different environments

### Low Priority:
5. **Add Documentation**
   - Document all public environment variables
   - Explain security implications
   - Provide setup instructions for domain restrictions

## Safe Environment Variables Pattern

```typescript
// Good: Public endpoints
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com

// Bad: Secrets and keys
NEXT_PUBLIC_SECRET_KEY=abc123  // Never do this!
NEXT_PUBLIC_API_KEY=xyz789     // Move to backend!

// Good: Feature flags
NEXT_PUBLIC_FEATURE_CHAT=true
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

## Implementation Changes Needed

1. **Update error-service.ts** to remove API key usage
2. **Update request-signing.ts** to use derived keys
3. **Add production environment checks** for development-only variables
4. **Create environment variable validation** on app startup