# Simplified E2E Testing Setup

This document describes the new simplified approach to E2E testing that maintains security while being easier to use.

## Overview

The simplified testing setup runs tests in development mode with special test headers that bypass rate limiting and authentication complexity while maintaining security boundaries.

### Key Benefits

1. **Simpler Configuration** - Single `.env.test` file with clear test-specific settings
2. **Faster Test Execution** - No production builds or complex ngrok setups required
3. **Secure by Design** - Test mode only works in development/test environments
4. **Easy Debugging** - Tests run against local development server with full debugging

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend

The backend automatically supports test mode when:
- Environment is development, test, or staging
- Request includes `x-test-mode: true` header
- Request includes `x-test-auth` header with test token

No additional backend configuration needed!

### 3. Run Tests

```bash
# Start dev server in test mode (in one terminal)
npm run dev:test

# Run E2E tests (in another terminal)
npm run test:e2e:simple

# Or run with UI for debugging
npm run test:e2e:simple:ui
```

## Security Features

### Frontend Security
- Test mode headers only injected when `NEXT_PUBLIC_TEST_MODE=true`
- Test tokens never used in production builds
- Rate limiting bypassed only in development mode
- Wallet initialization disabled in test mode

### Backend Security
- Test authentication only works with valid test headers
- Rate limiting skip requires both test header AND valid environment
- CORS headers explicitly allow test mode headers
- Test user has limited, predefined permissions

## Configuration Files

### `.env.test`
```env
# Backend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_TEST_MODE=true
NEXT_PUBLIC_DISABLE_WALLET_INIT=true

# Security Flags
NEXT_PUBLIC_TEST_AUTH_TOKEN=test-jwt-token-for-e2e
NEXT_PUBLIC_TEST_USER_ID=test-user-123

# Test Environment
NODE_ENV=development
E2E_TEST_MODE=true
```

### `playwright.config.test.ts`
- Configured for local development server
- Includes test headers automatically
- Runs dev server as part of test execution

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Best Practices

1. **Keep Tests Simple** - Focus on user interactions, not implementation details
2. **Use Data Attributes** - Add `data-testid` for reliable element selection
3. **Avoid Hardcoded Waits** - Use Playwright's built-in waiting mechanisms
4. **Test User Flows** - Write tests that mirror real user behavior

## Migration from Old Setup

### Archived Files
The old complex testing setup has been archived to `tests/e2e/_archive/`:
- Production ngrok tests
- Complex environment configurations
- Multiple playwright configs

### Key Differences
| Old Setup | New Setup |
|-----------|-----------|
| Multiple env files | Single `.env.test` |
| Production builds | Development mode |
| Ngrok tunneling | Direct localhost |
| Complex headers | Simple test headers |
| Manual backend config | Automatic detection |

## Troubleshooting

### Tests Failing with 401/403
- Ensure backend is running with test/development environment
- Check that `x-test-mode` header is being sent
- Verify `.env.test` is loaded correctly

### Rate Limiting Issues
- Confirm `NODE_ENV=development` in test environment
- Check middleware is detecting test headers
- Verify backend rate limiter skip logic

### CORS Errors
- Backend must allow test headers in CORS config
- Frontend must be running on allowed origin (localhost:3000)

## Maintenance

### Adding New Test Headers
1. Add to backend CORS `allowedHeaders`
2. Add to frontend test interceptor
3. Update this documentation

### Updating Test User
1. Change in `.env.test`
2. Update backend auth middleware test user
3. Ensure consistent across all tests

## Conclusion

This simplified approach provides a secure, maintainable way to run E2E tests without the complexity of production-like setups. It's designed for developer productivity while maintaining security best practices.