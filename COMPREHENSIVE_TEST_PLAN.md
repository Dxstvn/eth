# Comprehensive Test Suite Overhaul Plan
## Achieving 100% Pass Rate with Modern Testing Infrastructure

### **Executive Summary**
This plan addresses the current 20.5% test file pass rate (17/83 files) and transforms the testing infrastructure to achieve 100% pass rate across all unit test suites while modernizing, consolidating, and eliminating deprecated functionality.

### **Current State Analysis**
- **Total Test Files**: 83
- **Passing**: 17 files (20.5%)
- **Failing**: 66 files (79.5%)
- **Framework Issues**: 26 Jest/Vitest conflicts
- **Timer Issues**: 35+ timeout failures
- **Mock Issues**: 15+ configuration problems

---

## **Phase 1: Cleanup & Elimination (Week 1)**

### **1.1 Remove Deprecated Functionality Tests**
**Target**: Eliminate 15+ deprecated test files

#### **Authentication (Remove 3 files)**
```bash
# REMOVE - Testing deprecated auth-context v1
- __tests__/auth-context.test.tsx
- __tests__/auth-context-simple.test.tsx  
- context/__tests__/auth-context.test.tsx

# KEEP & FIX - Modern auth testing
+ components/__tests__/auth-navigation.test.tsx (fix Jest→Vitest)
+ services/__tests__/auth-service.test.ts (create new)
```

#### **IPFS/Legacy Storage (Remove 8 files)**
```bash
# REMOVE - All IPFS-related tests (functionality deprecated)
- components/__tests__/ipfs-*.test.tsx (multiple files)
- lib/__tests__/ipfs-*.test.ts (multiple files)
- __tests__/ipfs-integration.test.tsx

# REPLACE WITH - Cloud Storage tests
+ components/__tests__/cloud-storage-*.test.tsx (create new)
```

#### **Redundant Wallet Tests (Remove 4, Keep 1)**
```bash
# REMOVE - Duplicate wallet detection tests
- __tests__/wallet-context-debug.test.tsx
- __tests__/wallet-detection-basic.test.tsx
- __tests__/wallet-detection-e2e.test.tsx
- __tests__/wallet-detection-minimal.test.tsx

# CONSOLIDATE INTO
+ components/__tests__/wallet-comprehensive.test.tsx (create new)
```

#### **Crypto Utils Duplicates (Remove 2, Keep 1)**
```bash
# REMOVE - Duplicate crypto tests
- lib/__tests__/crypto-utils-correct.test.ts
- lib/__tests__/crypto-utils-fixed.test.ts

# KEEP & FIX
+ lib/__tests__/crypto-utils.test.ts (migrate to Vitest)
```

#### **Hook Test Duplicates (Remove 2, Keep 2)**
```bash
# REMOVE - Mock versions, keep real implementations
- hooks/__tests__/use-mobile-real.test.ts
- hooks/__tests__/use-auth-guard-real.test.tsx

# KEEP & FIX
+ hooks/__tests__/use-mobile.test.ts (migrate to Vitest)
+ hooks/__tests__/use-auth-guard.test.tsx (migrate to Vitest)
```

### **1.2 Backend Test Separation**
**Target**: Move/Remove 8+ backend test files from frontend

```bash
# MOVE TO BACKEND or REMOVE entirely
- backend/src/config/__tests__/unit/awsSecretsManager.unit.test.js
- Any other backend-related test files in frontend directories

# FRONTEND KEEPS ONLY
+ Frontend integration tests that test against backend APIs
```

**Phase 1 Result**: ✅ **COMPLETED** - Reduced from 83 → 72 test files (-11 files)

---

## **Phase 2: Jest to Vitest Migration (Week 2)**

### **2.1 Core Migration Strategy**

#### **Global Configuration Update**
```typescript
// Remove jest.config.js entirely
// Update vitest.config.ts with comprehensive setup

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10000
  }
})
```

#### **Test File Pattern Migration**
```typescript
// FROM (Jest pattern)
import { jest } from '@jest/globals'
const mockFn = jest.fn()
jest.mock('@/services/api')

// TO (Vitest pattern)  
import { vi } from 'vitest'
const mockFn = vi.fn()
vi.mock('@/services/api')
```

### **2.2 Systematic File Migration**
**Target**: Convert 26 Jest files to Vitest

#### **Priority 1: Critical Components (8 files)**
```bash
# Auth & API
- __tests__/auth-api-client.test.tsx → Vitest
- services/__tests__/api-client.test.ts → Vitest

# Core Services  
- services/__tests__/wallet-detection.test.ts → Vitest
- services/__tests__/transaction-api.test.ts → Vitest
- services/__tests__/network-detection.test.ts → Vitest

# Navigation
- components/__tests__/auth-navigation.test.tsx → Vitest
- components/__tests__/navbar.test.tsx → Vitest
- components/__tests__/footer.test.tsx → Vitest
```

#### **Priority 2: Component Tests (12 files)**
```bash
# Dashboard Components
- components/__tests__/dashboard-*.test.tsx → Vitest (multiple files)
- components/__tests__/wallet-*.test.tsx → Vitest (multiple files)
- components/__tests__/transaction-*.test.tsx → Vitest (multiple files)
```

#### **Priority 3: Utility Tests (6 files)**
```bash
# Lib & Utils
- lib/__tests__/utils.test.ts → Vitest
- lib/__tests__/api-utils.test.ts → Vitest
- lib/__tests__/validation.test.ts → Vitest
- hooks/__tests__/*.test.ts → Vitest (remaining files)
```

**Phase 2 Result**: 100% Vitest adoption, eliminate Jest completely

---

## **Phase 3: Fix Timer & Mock Issues (Week 3)**

### **3.1 Systematic Timer Issue Resolution**
**Target**: Fix 35+ timer timeout failures

#### **Standard Timer Fix Pattern**
```typescript
// BEFORE (Causing timeouts)
it('should load data', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})

// AFTER (Reliable pattern)
it('should load data', async () => {
  render(<Component />)
  
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  
  expect(screen.getByText('Data')).toBeInTheDocument()
})
```

#### **Files Requiring Timer Fixes (35+ files)**
```bash
# Apply timer fix pattern to:
- components/__tests__/dashboard-comprehensive.test.tsx
- components/__tests__/recent-activity-comprehensive.test.tsx  
- components/__tests__/wallet-balance-comprehensive.test.tsx
- components/__tests__/transaction-list-comprehensive.test.tsx
- components/__tests__/market-overview-comprehensive.test.tsx
# ... and 30+ other files with timeout issues
```

### **3.2 Mock Configuration Standardization**
**Target**: Fix 15+ mock configuration issues

#### **Standard Mock Setup Pattern**
```typescript
// Standard mock configuration for all tests
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  
  // Context mocks
  mockUseAuth.mockReturnValue({ isDemoAccount: false })
  mockUseWallet.mockReturnValue({ address: null })
  mockUseDatabaseStore.mockReturnValue({
    getData: vi.fn().mockReturnValue([])
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllTimers()
})
```

#### **Service Mock Patterns**
```typescript
// Standardize service mocking
vi.mock('@/services/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))
```

**Phase 3 Result**: Resolve timer timeouts and mock failures

---

## **Phase 4: Test Coverage Expansion (Week 4)**

### **4.1 Critical Missing Service Tests**
**Target**: Add 21 missing service test files

#### **API Services (5 files)**
```bash
+ services/__tests__/auth-service.test.ts
+ services/__tests__/transaction-api.test.ts  
+ services/__tests__/wallet-api.test.ts
+ services/__tests__/contacts-api.test.ts
+ services/__tests__/api-config.test.ts
```

#### **Core Services (4 files)**
```bash
+ services/__tests__/wallet-detection.test.ts
+ services/__tests__/network-detection.test.ts
+ services/__tests__/multi-chain-service.test.ts
+ services/__tests__/validation-service.test.ts
```

### **4.2 Critical Missing Component Tests**
**Target**: Add 25 high-priority component tests

#### **Transaction Components (8 files)**
```bash
+ components/__tests__/transaction-card.test.tsx
+ components/__tests__/transaction-stage-indicator.test.tsx
+ components/__tests__/transaction-timeline.test.tsx
+ components/__tests__/transaction-details.test.tsx
+ components/__tests__/transaction-status.test.tsx
+ components/__tests__/transaction-progress.test.tsx
+ components/__tests__/transaction-actions.test.tsx
+ components/__tests__/transaction-history.test.tsx
```

#### **Wallet Components (5 files)**
```bash
+ components/__tests__/wallet-selector.test.tsx
+ components/__tests__/wallet-connection.test.tsx
+ components/__tests__/wallet-address-display.test.tsx
+ components/__tests__/wallet-balance-display.test.tsx
+ components/__tests__/wallet-network-indicator.test.tsx
```

#### **Dashboard Components (7 files)**
```bash
+ components/__tests__/market-overview.test.tsx
+ components/__tests__/upcoming-deadlines.test.tsx
+ components/__tests__/portfolio-summary.test.tsx
+ components/__tests__/activity-feed.test.tsx
+ components/__tests__/notification-center.test.tsx
+ components/__tests__/settings-panel.test.tsx
+ components/__tests__/help-center.test.tsx
```

#### **Onboarding Components (5 files)**
```bash
+ components/__tests__/onboarding-wizard.test.tsx
+ components/__tests__/welcome-screen.test.tsx
+ components/__tests__/account-setup.test.tsx
+ components/__tests__/wallet-setup.test.tsx
+ components/__tests__/verification-steps.test.tsx
```

### **4.3 Context Provider Tests**
**Target**: Add 4 missing context tests

```bash
+ context/__tests__/contact-context.test.tsx
+ context/__tests__/onboarding-context.test.tsx
+ context/__tests__/sidebar-context.test.tsx  
+ context/__tests__/transaction-context.test.tsx
```

### **4.4 Hook Tests**
**Target**: Add 3 missing hook tests

```bash
+ hooks/__tests__/use-performance.test.ts
+ hooks/__tests__/use-wallet-auth-integration.test.ts
+ hooks/__tests__/use-toast.test.ts
```

**Phase 4 Result**: Comprehensive test coverage for all active functionality

---

## **Phase 5: Consolidation & Optimization (Week 5)**

### **5.1 Test Suite Consolidation**
**Target**: Merge related test files for better organization

#### **Dashboard Test Consolidation**
```bash
# MERGE multiple dashboard component tests INTO
+ components/__tests__/dashboard-integrated.test.tsx
  - Tests stats, activity, overview, deadlines together
  - Tests cross-component data consistency
  - Tests integrated user workflows
```

#### **Wallet Test Consolidation**  
```bash
# MERGE multiple wallet tests INTO
+ components/__tests__/wallet-integrated.test.tsx
  - Tests wallet connection, balance, transactions
  - Tests multi-chain support
  - Tests wallet switching workflows
```

#### **Auth Test Consolidation**
```bash
# MERGE auth-related tests INTO
+ components/__tests__/auth-integrated.test.tsx
  - Tests login, signup, logout flows
  - Tests protected routes
  - Tests auth state management
```

### **5.2 Performance & Integration Tests**
```bash
+ components/__tests__/performance-benchmarks.test.tsx
+ components/__tests__/cross-component-integration.test.tsx
+ components/__tests__/user-workflow-integration.test.tsx
```

**Phase 5 Result**: Streamlined, well-organized test suite

---

## **Phase 6: Quality Assurance & Standards (Week 6)**

### **6.1 Testing Standards Documentation**
```bash
+ TESTING_STANDARDS.md
  - Vitest configuration guidelines
  - Mock patterns and best practices
  - Timer handling standards
  - Component testing templates
  - Service testing templates
```

### **6.2 Automated Quality Checks**
```bash
# Add to package.json scripts
"test:coverage": "vitest --coverage --reporter=html"
"test:watch": "vitest --watch"
"test:ui": "vitest --ui"
"test:lint": "eslint **/*.test.{ts,tsx}"
```

### **6.3 CI/CD Integration**
```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm run test:coverage
- name: Check Coverage Threshold
  run: npx vitest --coverage --coverage.reporter=json --coverage.reporter=json-summary
```

---

## **Success Metrics & Timeline**

### **Week-by-Week Targets**

| Week | Task | Current | Target | Success Metric |
|------|------|---------|--------|----------------|
| 1 | Cleanup | 83 files | 58 files | Remove 25 deprecated files |
| 2 | Migration | 26 Jest files | 0 Jest files | 100% Vitest adoption |
| 3 | Fix Issues | 66 failing | 20 failing | Fix timer/mock issues |
| 4 | Coverage | 20 components tested | 70+ components tested | Add 50+ new tests |
| 5 | Consolidation | Scattered tests | Organized suites | Logical test grouping |
| 6 | Standards | Ad-hoc testing | Standardized practices | Documentation & CI |

### **Final Success Criteria**
- ✅ **100% test file pass rate** (0 failing test files)
- ✅ **95%+ individual test pass rate** (minimal skipped tests)
- ✅ **80%+ code coverage** for critical paths
- ✅ **100% Vitest adoption** (0 Jest dependencies)
- ✅ **Comprehensive service coverage** (all API services tested)
- ✅ **Modern testing practices** (standardized patterns)

### **Risk Mitigation**
- **Parallel Development**: Work on non-conflicting files simultaneously
- **Incremental Validation**: Test each phase before proceeding
- **Rollback Plan**: Keep backup of working tests during migration
- **Documentation**: Maintain detailed change log for tracking

---

## **Implementation Commands**

### **Phase 1: Quick Start**
```bash
# Remove deprecated files
rm __tests__/auth-context.test.tsx
rm __tests__/auth-context-simple.test.tsx
rm __tests__/wallet-detection-*.test.tsx
rm components/__tests__/ipfs-*.test.tsx

# Verify remaining test count
find . -name "*.test.{ts,tsx}" | wc -l
```

### **Phase 2: Migration Script**
```bash
# Create migration script
echo "Converting Jest to Vitest patterns..."
find . -name "*.test.{ts,tsx}" -exec sed -i 's/jest\./vi\./g' {} \;
find . -name "*.test.{ts,tsx}" -exec sed -i 's/from "jest"/from "vitest"/g' {} \;
```

This comprehensive plan transforms the current 20.5% pass rate into a 100% pass rate while modernizing the entire testing infrastructure and eliminating technical debt.