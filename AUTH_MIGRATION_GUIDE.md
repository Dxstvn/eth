# Authentication Migration Guide

## Overview

This guide documents the migration from direct Firebase client SDK usage to backend-only authentication in Phase 2.1.

## Changes Made

### 1. New Auth Service (`/services/auth-service.ts`)
- Centralized authentication logic
- Backend-only communication
- Automatic token refresh with 5-minute buffer
- Secure token storage in localStorage
- Session management across tabs

### 2. Updated Auth Context (`/context/auth-context-v2.tsx`)
- Removed direct Firebase Auth state listener
- Uses auth-service for all operations
- Firebase client SDK only used for Google OAuth flow
- Simplified state management
- Multi-tab synchronization

## Key Improvements

### Security
- ✅ No direct Firebase client SDK authentication
- ✅ All auth operations go through backend
- ✅ Backend validates and issues JWT tokens
- ✅ Automatic token refresh prevents expiry

### Token Management
- ✅ Tokens stored securely in localStorage
- ✅ Automatic refresh 5 minutes before expiry
- ✅ Prevents multiple simultaneous refresh attempts
- ✅ Clears auth on refresh failure

### Session Management  
- ✅ Sessions persist across page reloads
- ✅ Multi-tab synchronization
- ✅ Automatic sign-out on token removal
- ✅ Profile updates sync across tabs

## Migration Steps

### Step 1: Update Imports
```typescript
// Old
import { useAuth } from '@/context/auth-context'

// New (during migration)
import { useAuth } from '@/context/auth-context-v2'
```

### Step 2: Update Auth Context in Layout
```typescript
// In app/layout.tsx
import { AuthProvider } from "@/context/auth-context-v2"
```

### Step 3: API Changes
The auth context API remains mostly the same:
- `user` - Now returns UserProfile instead of Firebase User
- `signInWithGoogle()` - Same interface
- `signInWithEmail()` - Same interface
- `signUpWithEmail()` - Same interface
- `signOut()` - Same interface
- `refreshToken()` - Now properly implemented
- `updateProfile()` - New method for profile updates

### Step 4: Remove Firebase Dependencies
Components no longer need to:
- Import from 'firebase/auth'
- Check Firebase auth state
- Handle Firebase user objects

## Testing Checklist

- [ ] Google Sign-In works
- [ ] Email Sign-In works
- [ ] Email Sign-Up works
- [ ] Sign Out works
- [ ] Token refresh works
- [ ] Multi-tab sync works
- [ ] Profile updates work
- [ ] Protected routes work

## Rollback Plan

If issues arise:
1. Revert to original auth-context.tsx
2. Update imports back to old version
3. No database changes needed

## Next Steps

After successful migration:
1. Remove old auth-context.tsx
2. Rename auth-context-v2.tsx to auth-context.tsx
3. Update all imports
4. Remove migration guide