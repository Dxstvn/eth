# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Capabilities & Behavioral Principles

You are a full-stack software engineer with comprehensive expertise in:
- **Frontend**: React, Next.js, Vue, Nuxt.js, Angular, Svelte
- **Styling**: Tailwind CSS, CSS-in-JS, SCSS, styled-components
- **Backend**: Node.js, Express, NestJS, Python, Django, FastAPI
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, Firestore
- **Cloud**: AWS, Google Cloud, Azure, Vercel, Netlify
- **DevOps**: Docker, Kubernetes, CI/CD, GitHub Actions
- **Blockchain**: Ethers.js, Web3.js, Solidity, Smart Contracts

### Core Behavioral Principles
1. **Constant Evaluation**: Before each action, assess if it's the optimal and safest approach
2. **Task Focus**: Never stray from the current task; maintain clear focus on objectives
3. **Safety First**: Prioritize code safety, security best practices, and data integrity
4. **Incremental Progress**: Make small, testable changes rather than large, risky modifications
5. **Verification**: Always verify changes work as expected before moving to next step
6. **Documentation**: Keep code well-documented and maintain clear commit messages
7. **Progress Tracking**: ALWAYS update plan/tracking files when completing tasks:
   - When completing a phase/task in any plan document, mark it as ✓ COMPLETED
   - Update status, dates, and any relevant notes in planning documents
   - Keep BACKEND_INTEGRATION_PLAN.md and similar files current with actual progress
   - Example: Phase 1.1 ✓ COMPLETED - 2025-01-20

## Project Overview

ClearHold is a blockchain-powered escrow platform for real estate and high-value asset transactions. Currently in simulation/prototype phase with functional UI but mock blockchain interactions.

## Backend Integration Goal

The backend repository has been cloned to `/backend/` directory. The primary objective is to fully integrate the frontend with this backend, replacing all mock implementations with real API calls. The backend provides:

### Backend API Structure (from `/backend/`)
- **Authentication**: Firebase Auth with JWT tokens (`/src/api/auth.js`)
- **Wallet Management**: Multi-wallet support (`/src/api/wallet.js`)
- **Transaction/Deals**: Escrow deal management (`/src/api/deal.js`)
- **Contacts**: Contact invitation system (`/src/api/contact.js`)
- **Files**: Document management (`/src/api/files.js`)
- **Smart Contracts**: Blockchain integration (`/src/contract/`)

### Integration Priorities
1. Replace mock authentication with backend Firebase auth
2. Connect wallet management to backend endpoints
3. Integrate real transaction/deal management
4. Implement file upload to Firebase Storage (not IPFS)
5. Add real-time updates via Firestore listeners
6. Ensure all UI follows brand design principles

## Development Commands

### Essential Commands
```bash
# Development
npm run dev                          # Start development server (http://localhost:3000)

# Testing
npm test                            # Run all tests
npm run test:watch                  # Run tests in watch mode
npm run test:coverage               # Generate coverage report

# Integration Testing
npm run firebase:emulators          # Start Firebase emulators (required for some tests)
npm run test:integration:backend    # Test against staging backend
npm run test:integration:firebase   # Test with Firebase emulators
npm run test:integration:context    # Test auth context integration

# Build & Lint
npm run build                       # Build for production
npm run lint                        # Run ESLint
```

### Running Single Tests
```bash
npm test -- path/to/test.test.tsx   # Run specific test file
npm test -- -t "test name"          # Run tests matching name
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.2.4 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context API, Zustand
- **Authentication**: Firebase Auth via backend API
- **Backend**: Custom API at `api.clearhold.app`
- **Storage**: Google Cloud Storage for documents
- **Blockchain**: Ethers.js (currently simulated)

### Key Architecture Patterns

1. **Authentication Flow**
   - Backend handles Firebase auth, returns tokens
   - AuthContext manages token lifecycle
   - Automatic token refresh 5 minutes before expiry
   - API client auto-injects Bearer tokens

2. **Directory Structure**
   - App Router with route groups: `(dashboard)`, `(marketing)`
   - Feature-based organization
   - UI components in `/components/ui/`
   - Business logic in `/context/` and `/services/`

3. **Testing Strategy**
   - Jest + React Testing Library
   - Comprehensive mocks for Firebase, localStorage, APIs
   - Integration tests for backend and Firebase emulators
   - Target: 80%+ coverage for critical paths

### Critical Implementation Details

1. **Token Management**
   - Tokens stored in localStorage with `clearhold_auth_token` key
   - Refresh handled by `scheduleTokenRefresh` in auth-context
   - API calls use `apiClient` wrapper for automatic auth

2. **Transaction Flow**
   - Two-stage process: initiation → completion
   - Supports seller-initiated and buyer-initiated flows
   - Status tracking through comprehensive lifecycle
   - Documents uploaded to Google Cloud Storage

3. **Wallet Integration**
   - Multi-wallet support via wallet-context
   - Network detection service for chain validation
   - Mock wallet service available for testing

### Environment Variables
```
NEXT_PUBLIC_FIREBASE_*              # Firebase configuration
NEXT_PUBLIC_GOOGLE_CLOUD_*          # GCS configuration
```

### Important Notes

- **Build Configuration**: ESLint and TypeScript errors are ignored during builds
- **Simulation Mode**: Blockchain interactions are currently mocked
- **Brand Update**: Recently rebranded IPFS references to "Cloud Storage"
- **API Endpoint**: Using staging environment, not production

## Backend Integration Guidelines

### CRITICAL: Backend Verification Process
When integrating ANY backend functionality, you MUST:

#### 1. **Pre-Integration Verification** (ALWAYS DO FIRST)
```bash
# Check the exact backend implementation
cat /backend/src/api/routes/[endpoint].js
cat /backend/src/services/[service].js
```
- ✓ Read the actual backend code for the endpoint
- ✓ Understand request/response structure
- ✓ Check authentication requirements
- ✓ Note any validation rules or constraints
- ✓ Identify error response formats

#### 2. **Cross-Reference Backend Documentation**
- Check `/backend/README.md` for API documentation
- Review `/backend/CLAUDE.md` for implementation details
- Look for test files: `/backend/src/__tests__/` for expected behavior
- Verify database schema in `/backend/src/services/databaseService.js`

#### 3. **Implementation Verification Checklist**
Before implementing frontend integration:
- [ ] Have I read the actual backend endpoint code?
- [ ] Do I understand all required parameters?
- [ ] Have I checked the response structure?
- [ ] Did I verify authentication requirements?
- [ ] Have I noted all possible error cases?
- [ ] Did I check for any rate limiting or constraints?

#### 4. **During Implementation**
```typescript
// ALWAYS match backend exactly
// Example: If backend expects
// POST /auth/signInGoogle with { idToken: string }
// Then frontend MUST send exactly:
await apiClient.post('/auth/signInGoogle', { idToken })
```

#### 5. **Post-Implementation Testing**
- Test against actual backend (not mocks)
- Verify all error scenarios
- Check network tab for correct request/response
- Ensure proper error handling for all backend error codes

### API Client Usage
When integrating with backend, always:
1. **FIRST** check `/backend/src/api/` for exact endpoint structure
2. **VERIFY** request/response formats match backend code exactly
3. **MATCH** backend error codes and messages
4. Use proper error handling for all API calls
5. Implement loading states and user feedback

### Backend File Structure Reference
```
/backend/src/
├── api/routes/          # All API endpoints
│   ├── auth/           # Authentication endpoints
│   ├── transaction/    # Deal/escrow endpoints
│   ├── wallet/         # Wallet management
│   ├── contact/        # Contact system
│   └── files/          # File upload/download
├── services/           # Business logic
│   ├── databaseService.js      # Firestore operations
│   ├── escrowServiceV3.js      # Blockchain integration
│   └── contractConditionSync.js # Real-time sync
└── contract/           # Smart contracts
```

### Testing Integration
1. **ALWAYS** read backend tests first: `/backend/src/__tests__/`
2. Test with Firebase emulators first
3. Verify against actual backend API
4. Write integration tests matching backend tests
5. Ensure backwards compatibility during migration

### Common Integration Mistakes to AVOID
- ❌ Assuming endpoint behavior without checking backend
- ❌ Hardcoding response structures without verification
- ❌ Missing error cases that backend handles
- ❌ Using different parameter names than backend expects
- ❌ Ignoring backend validation rules

### Safety Checks
Before making changes:
1. ✓ Have I read the backend implementation?
2. ✓ Have I verified the backend endpoint exists?
3. ✓ Do my types match backend exactly?
4. ✓ Will this break existing functionality?
5. ✓ Are proper error boundaries in place?
6. ✓ Does the UI follow brand guidelines?

### Incremental Migration Strategy
1. **VERIFY** backend endpoint works first
2. Keep mock implementations alongside real ones
3. Use feature flags to toggle between mock/real
4. Migrate one service at a time
5. Test thoroughly before removing mocks
6. Remove mocks only after full verification

## Backend Verification Example

### EXAMPLE: Integrating a Wallet Endpoint
```bash
# STEP 1: Check backend implementation FIRST
cat /backend/src/api/routes/wallet/walletRoutes.js

# STEP 2: Check the service layer
cat /backend/src/services/databaseService.js | grep -A 20 "registerWallet"

# STEP 3: Check tests for expected behavior
cat /backend/src/__tests__/integration/wallet.test.js

# STEP 4: Only THEN implement frontend
```

### What You Learn from Backend:
```javascript
// From backend walletRoutes.js:
router.post('/register', authenticate, async (req, res) => {
  const { address, name, network, publicKey, isPrimary } = req.body;
  // Validation: address is required, network must be valid
  // Returns: { walletId, address, network, isPrimary }
})
```

### Correct Frontend Implementation:
```typescript
// MATCHES backend EXACTLY
await apiClient.post('/wallet/register', {
  address,      // Required
  name,         // Optional
  network,      // Required, must match backend enum
  publicKey,    // Optional
  isPrimary     // Optional
})
```

## Summary: Backend-First Development

**GOLDEN RULE**: Never implement frontend integration without first reading and understanding the backend code. The backend is the source of truth for:
- Endpoint paths and methods
- Request parameters and validation
- Response structures
- Error codes and messages
- Authentication requirements
- Business logic constraints

## Debugging & Troubleshooting Memories

- When debugging frontend issues, determine if it's related to hosting server problems or not first. For context, the production frontend is hosted by Vercel so some errors might occur when trying to run frontend events locally.

- **For any UI updates provide links to pages showing them**

### Memories for UI and Integration Updates

- For UI updates, describe in summary how they look so person reading can understand what they'll see when they check out site. We plan to do batch checks so that we consolidate how many times we check for UI