# E2E Testing with Production Build and Ngrok Backend

This guide explains how to run E2E tests against a production build of the frontend while using the ngrok tunneled backend.

## Overview

Testing against production builds with ngrok backend allows you to:
- Test the exact code that will be deployed
- Verify integration with the remote backend through ngrok tunnel
- Catch production-specific issues early
- Test with real network latency

## Key Differences from Development Testing

1. **Environment Variables**: `NEXT_PUBLIC_*` variables are baked in at build time
2. **Performance**: Production builds are optimized and minified
3. **Network**: Requests go through ngrok tunnel instead of localhost
4. **Headers**: Special ngrok headers are required

## Setup Instructions

### 1. Update Ngrok URL

When your ngrok URL changes, update it in the build script:

```bash
# Option 1: Pass as argument
./scripts/build-production-e2e.sh https://your-new-ngrok-url.ngrok-free.app

# Option 2: Edit .env.production.e2e directly
# Update NEXT_PUBLIC_API_URL=https://your-new-ngrok-url.ngrok-free.app
```

### 2. Build for Production E2E

```bash
# Build the production version with ngrok backend
npm run build:e2e:prod
```

This script:
- Updates the ngrok URL in `.env.production.e2e`
- Builds Next.js with production optimizations
- Configures the build to use ngrok backend

### 3. Run Production E2E Tests

```bash
# Run all production E2E tests
npm run test:e2e:prod

# Run with Playwright UI (recommended for debugging)
npm run test:e2e:prod:ui

# Run in headed mode to see the browser
npm run test:e2e:prod:headed
```

## Configuration Files

### `.env.production.e2e`
- Contains ngrok backend URL
- Production mode with E2E flags enabled
- Disables wallet initialization for testing

### `playwright.config.production.ts`
- Configured for production server on port 3000
- Includes ngrok-specific headers
- Single worker to avoid rate limiting

## Writing Production E2E Tests

### Best Practices

1. **Monitor Network Requests**
```typescript
page.on('request', request => {
  if (request.url().includes('ngrok')) {
    console.log('API call:', request.url());
  }
});
```

2. **Handle Network Latency**
```typescript
// Increase timeouts for ngrok requests
await page.waitForResponse(
  response => response.url().includes('/api/'),
  { timeout: 15000 } // 15 seconds
);
```

3. **Verify Headers**
```typescript
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({
    'ngrok-skip-browser-warning': 'true',
    'x-e2e-test': 'true'
  });
});
```

## Troubleshooting

### Common Issues

1. **"Tunnel not found" errors**
   - Ngrok URL has changed - rebuild with new URL
   - Check if ngrok is still running on backend server

2. **CORS errors**
   - Ensure backend allows your frontend origin
   - Check ngrok headers are being sent

3. **Timeouts**
   - Network latency through ngrok is higher
   - Increase timeout values in tests

4. **Build fails**
   - Check `.env.production.e2e` syntax
   - Ensure all required env variables are set

### Debug Commands

```bash
# Check current ngrok URL in build
grep NEXT_PUBLIC_API_URL .env.production.e2e

# Start production server manually for debugging
npm run start:e2e:prod

# Check if ngrok backend is accessible
curl -H "ngrok-skip-browser-warning: true" https://your-ngrok-url.ngrok-free.app/api/health
```

## Differences from Local Development E2E

| Aspect | Development E2E | Production E2E |
|--------|----------------|----------------|
| Backend | localhost:3000 | ngrok tunnel |
| Build | Development mode | Production optimized |
| Env vars | Runtime | Build-time |
| Performance | Slower (dev mode) | Faster (optimized) |
| Debugging | Full source maps | Minified code |

## CI/CD Integration

For CI/CD pipelines:

1. Store ngrok URL as environment variable
2. Run build script with URL before tests
3. Ensure ngrok tunnel is stable during test run

Example GitHub Actions:
```yaml
- name: Build for E2E with Ngrok
  run: |
    ./scripts/build-production-e2e.sh ${{ secrets.NGROK_URL }}
    
- name: Run Production E2E Tests
  run: npm run test:e2e:prod
```

## Summary

Production E2E testing with ngrok provides the most realistic testing environment before deployment. While it requires rebuilding when the ngrok URL changes, it catches issues that development testing might miss.