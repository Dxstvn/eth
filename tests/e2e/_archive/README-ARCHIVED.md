# Archived E2E Testing Setup

This directory contains the previous complex E2E testing setup that has been replaced with a simpler approach.

## Why This Was Archived

The old setup had several complexities:
1. Required production builds for testing
2. Needed ngrok tunneling configuration
3. Multiple environment files to manage
4. Complex header management for bypassing security
5. Difficult to debug when tests failed

## Archived Files

- `production-ngrok.spec.ts` - Tests designed for ngrok backend
- `passwordless-production-flow.spec.ts` - Production passwordless tests
- `passwordless-production-simple.spec.ts` - Simplified production tests
- `playwright.config.production.ts` - Production test configuration
- `.env.production.e2e` - Production test environment
- `build-production-e2e.sh` - Build script for production testing

## When to Use This Archive

You might need to reference these files if:
- Testing against actual production environment
- Debugging production-specific issues
- Need to test with real ngrok tunnels
- Verifying production build behavior

## Migration Notes

To migrate tests from this setup to the new simplified approach:

1. Remove production-specific configurations
2. Replace complex auth headers with simple test headers
3. Update environment variables to use `.env.test`
4. Remove ngrok-specific logic
5. Simplify test assertions

## Security Considerations

The archived setup had more complex security measures:
- Required exact header matching
- Used production-like tokens
- Needed backend staging mode
- Complex CORS configuration

The new setup maintains security through environment detection rather than complex headers.