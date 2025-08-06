# E2E Testing Guide

This guide explains how to run end-to-end (E2E) tests for the ClearHold platform with real backend services.

## Overview

Our E2E tests are designed to test the complete user flow with:
- Real backend API (localhost:3000)
- Firebase emulators (Auth, Firestore, Storage)
- Hardhat local blockchain node
- Frontend development server (localhost:3001)

## Prerequisites

Before running E2E tests, ensure you have:

1. **Backend server running** on port 3000
   ```bash
   cd /Users/dustinjasmin/personal-cryptoscrow-backend
   npm start
   ```

2. **Firebase emulators running**
   ```bash
   cd /Users/dustinjasmin/personal-cryptoscrow-backend
   npm run emulators
   ```

3. **Hardhat node running** on port 8545
   ```bash
   cd /Users/dustinjasmin/personal-cryptoscrow-backend
   npm run hardhat:node
   ```

## Configuration

### Environment Variables

The E2E tests use a special environment file `.env.e2e` that configures:
- `NEXT_PUBLIC_E2E_TEST=true` - Enables E2E test mode
- `NEXT_PUBLIC_BYPASS_AUTH=true` - Bypasses wallet initialization
- `NEXT_PUBLIC_DISABLE_WALLET_INIT=true` - Disables wallet auto-init
- Firebase emulator URLs
- Backend API URL

### Rate Limiting Bypass

E2E tests automatically bypass rate limiting by:
1. Adding `x-e2e-test: true` header to all requests
2. Backend recognizes this header in development mode
3. Frontend middleware skips rate limiting for E2E tests

## Running E2E Tests

### Quick Setup

Run the setup script to verify all services are running:
```bash
./scripts/setup-e2e.sh
```

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (recommended for debugging)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug
```

## Test Structure

### Test Files

- `passwordless-complete-e2e.spec.ts` - Complete passwordless authentication flow
- `passwordless-e2e-bypass.spec.ts` - Simple passwordless test with rate limit bypass

### Helper Files

- `helpers/auth.helper.ts` - Authentication utilities for E2E tests

## Writing E2E Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ context }) => {
    // Set E2E headers
    await context.setExtraHTTPHeaders({
      'x-e2e-test': 'true',
      'x-request-id': `e2e-${Date.now()}`
    });
  });

  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    // Your test code
  });
});
```

### Using Auth Helper

```typescript
import { AuthHelper } from './helpers/auth.helper';

test('authenticated flow', async ({ page, context }) => {
  const auth = new AuthHelper(page, context);
  
  // Authenticate as test user
  await auth.authenticateAsTestUser('test-user-1', 'test@example.com');
  
  // Now you can access protected routes
  await page.goto('/dashboard');
});
```

## Troubleshooting

### Common Issues

1. **Rate limiting errors (429)**
   - Ensure `x-e2e-test: true` header is set
   - Check backend is running with correct environment
   - Verify rate limiter middleware was updated

2. **CORS errors**
   - Ensure backend has `localhost:3001` in allowed origins
   - Check `x-request-id` header is allowed

3. **Port conflicts**
   - Frontend E2E server runs on port 3001
   - Use `lsof -i :3001` to check what's using the port

4. **Authentication failures**
   - Ensure Firebase emulators are running
   - Check backend is in test/development mode
   - Verify JWT secret matches between frontend and backend

### Debug Tips

1. Use Playwright UI mode for step-by-step debugging:
   ```bash
   npm run test:e2e:ui
   ```

2. Enable console logs in tests:
   ```typescript
   page.on('console', msg => console.log('Browser:', msg.text()));
   ```

3. Take screenshots on failure:
   ```typescript
   await page.screenshot({ path: 'error.png' });
   ```

## Backend Configuration for E2E

The backend has been configured to support E2E testing:

1. **Rate Limiter** (`rateLimiter.js`):
   - Skips rate limiting when `x-e2e-test: true` header is present
   - Only in test/development environments

2. **CORS** (`securityMiddleware.js`):
   - Allows `localhost:3001` origin
   - Allows `x-request-id` and `x-e2e-test` headers

3. **Authentication** (`authMiddleware.js`):
   - Recognizes `NODE_ENV=e2e_test`
   - Accepts test tokens in E2E mode

## Best Practices

1. **Isolate Test Data**: Use unique test emails/IDs to avoid conflicts
2. **Clean Up**: Clear test data after tests if needed
3. **Wait for Elements**: Use proper waits instead of arbitrary delays
4. **Check Network**: Monitor API calls to ensure they're hitting the backend
5. **Use Helpers**: Leverage auth helpers for consistent authentication