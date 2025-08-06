# E2E Tests for Passwordless Authentication

This directory contains end-to-end tests for the passwordless authentication feature using Playwright.

## Test Files

- **`passwordless-auth.spec.ts`** - Core functionality tests
  - Basic sign-in flow
  - Email validation
  - Rate limiting
  - Cross-device authentication
  - Error handling
  - Mobile responsiveness
  - Accessibility

- **`passwordless-security.spec.ts`** - Security-focused tests
  - XSS prevention
  - CSRF protection
  - Replay attack prevention
  - Rate limiting enforcement
  - Session timeout handling
  - Timing attack protection

- **`passwordless-user-flows.spec.ts`** - Real-world user scenarios
  - New user registration
  - Returning user flows
  - Cross-device authentication
  - Authentication method switching
  - Interruption recovery
  - Multi-tab behavior
  - Deep linking

## Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Run All E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run only passwordless tests
npm run test:e2e -- passwordless

# Run specific test file
npm run test:e2e -- passwordless-auth.spec.ts
```

### Run in Different Modes

```bash
# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- -g "should complete passwordless sign-in flow"

# Run on specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Generate Test Report

```bash
# Run tests and generate HTML report
npm run test:e2e -- --reporter=html

# Open the report
npx playwright show-report
```

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/login');
  });

  test('should do something', async ({ page }) => {
    // Your test here
    await page.click('button');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Common Helpers

```typescript
// Mock API responses
await page.route('**/api/endpoint', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'mocked' })
  });
});

// Wait for navigation
await page.waitForURL('**/success-page');

// Check element visibility
await expect(page.locator('selector')).toBeVisible();

// Fill forms
await page.fill('input[type="email"]', 'test@example.com');

// Click buttons
await page.click('button:has-text("Submit")');
```

## CI/CD Integration

The tests are configured to run in CI with:
- Retries on failure (2 attempts)
- Parallel execution disabled for stability
- Screenshots on failure
- Video recording on failure
- Trace collection for debugging

## Debugging Failed Tests

1. **Run with debug flag**
   ```bash
   npm run test:e2e -- --debug
   ```

2. **Check screenshots**
   - Located in `test-results/` directory
   - Automatically captured on failure

3. **View traces**
   ```bash
   npx playwright show-trace trace.zip
   ```

4. **Use VSCode extension**
   - Install "Playwright Test for VSCode"
   - Run and debug tests directly from the editor

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Mock external dependencies** to ensure test stability
3. **Test user journeys** not just individual pages
4. **Include accessibility tests** in your test suite
5. **Keep tests independent** - each test should run in isolation
6. **Use Page Object Model** for complex pages
7. **Add proper waits** instead of arbitrary timeouts

## Environment Variables

For testing against different environments:

```bash
# Test against staging
PLAYWRIGHT_BASE_URL=https://staging.clearhold.app npm run test:e2e

# Test against local backend
API_URL=http://localhost:8080 npm run test:e2e
```

## Troubleshooting

### Tests timing out
- Increase timeout in test: `test.setTimeout(60000)`
- Check if dev server is running: `npm run dev`

### Element not found
- Use Playwright Inspector: `npm run test:e2e -- --debug`
- Check if element is in shadow DOM or iframe
- Verify selectors with: `npx playwright codegen`

### Flaky tests
- Add proper waits: `await page.waitForLoadState('networkidle')`
- Mock time-dependent features
- Use `test.describe.serial()` for dependent tests

### Different behavior in CI
- Check viewport size differences
- Verify environment variables
- Review browser version differences