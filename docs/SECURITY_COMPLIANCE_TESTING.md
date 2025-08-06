# Security & Compliance Testing Guide

## Overview
This document outlines the testing strategy for security and compliance features in the ClearHold platform. Our approach uses multiple layers of testing to ensure comprehensive coverage without interfering with production security features.

## Test Structure

```
tests/
├── unit/
│   ├── security/
│   │   ├── input-validation.test.ts    # XSS, SQL injection prevention
│   │   ├── encryption.test.ts          # Cryptographic operations
│   │   └── csrf-protection.test.ts     # CSRF token management
│   └── compliance/
│       └── audit-logging.test.ts       # Audit trail generation
├── integration/
│   ├── kyc-workflow-emulator.test.ts   # KYC with Firebase emulators
│   ├── security-headers.test.ts        # Security header validation
│   └── compliance-audit-trail.test.ts  # Audit trail with Firestore
└── e2e/
    └── simplified/                      # Simplified E2E tests
```

## Running Tests

### 1. Unit Tests (No Backend Required)

#### Run All Security Unit Tests
```bash
npm test -- tests/unit/security/
```

#### Run Individual Test Suites
```bash
# Input validation tests
npm test -- tests/unit/security/input-validation.test.ts

# Encryption tests
npm test -- tests/unit/security/encryption.test.ts

# CSRF protection tests
npm test -- tests/unit/security/csrf-protection.test.ts

# Audit logging tests
npm test -- tests/unit/compliance/audit-logging.test.ts
```

#### Run with Coverage
```bash
npm run test:coverage -- tests/unit/
```

### 2. Integration Tests (With Firebase Emulators)

#### Setup Backend Stack
```bash
# Terminal 1: Start backend with emulators
cd /Users/dustinjasmin/personal-cryptoscrow-backend
npm run dev:fullstack
```

This starts:
- Firebase Auth Emulator (port 9099)
- Firestore Emulator (port 5004)
- Storage Emulator (port 9199)
- Hardhat Node (port 8545)
- Backend Server (port 3000)

#### Run Integration Tests
```bash
# Terminal 2: Run integration tests
cd /Users/dustinjasmin/eth-1
npm run test:integration:firebase
```

### 3. Backend API Security Tests

#### Run Backend Security Tests
```bash
cd /Users/dustinjasmin/personal-cryptoscrow-backend

# KYC security tests
npm run test:kyc

# Auth security tests
npm run test:auth:integration:emulator

# File upload security
npm run test:fileUploadDownload:integration:emulator
```

### 4. Simplified E2E Tests

#### Setup Full Stack
```bash
# Terminal 1: Backend stack
cd /Users/dustinjasmin/personal-cryptoscrow-backend
npm run dev:fullstack

# Terminal 2: Frontend
cd /Users/dustinjasmin/eth-1
npm run dev:e2e

# Terminal 3: Run E2E tests
npm run test:e2e:simple
```

## Test Coverage Areas

### Security Testing

#### Input Validation ✅
- [x] Email validation
- [x] XSS prevention
- [x] SQL injection detection
- [x] Path traversal prevention
- [x] Phone number validation
- [x] SSN format validation
- [x] Amount validation

#### Encryption ✅
- [x] AES-256-GCM encryption/decryption
- [x] PBKDF2 key derivation
- [x] SHA-256 hashing
- [x] Secure token generation
- [x] Timing-safe comparison
- [x] Tamper detection via auth tags

#### CSRF Protection ✅
- [x] Token generation and validation
- [x] Single-use tokens
- [x] Token rotation
- [x] Session management
- [x] Origin validation
- [x] Referer validation

### Compliance Testing

#### Audit Logging ✅
- [x] Event logging with timestamps
- [x] User activity tracking
- [x] Data classification tracking
- [x] Retention policy enforcement
- [x] Compliance report generation
- [x] Anomaly detection
- [x] PII sanitization

#### KYC/AML Workflows (Integration)
- [ ] Document upload security
- [ ] Identity verification flow
- [ ] Sanctions screening
- [ ] Risk assessment
- [ ] Approval workflow

#### Data Privacy (Integration)
- [ ] GDPR compliance
- [ ] Data retention policies
- [ ] Right to erasure
- [ ] Data portability

## Security Test Scenarios

### 1. Authentication Security
```typescript
// Test rate limiting
for (let i = 0; i < 6; i++) {
  await attemptLogin('user@example.com', 'wrong-password');
}
// Should be blocked after 5 attempts
```

### 2. XSS Prevention
```typescript
// Test XSS payloads
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")'
];
// All should be sanitized
```

### 3. Encryption Security
```typescript
// Test data encryption
const sensitiveData = 'SSN: 123-45-6789';
const encrypted = encrypt(sensitiveData, password);
// Should not be readable without password
```

### 4. Audit Trail
```typescript
// Test audit logging
const entry = auditLogger.logEvent({
  eventType: 'KYC_SUBMITTED',
  userId: 'user-123',
  result: 'SUCCESS'
});
// Should have 7-year retention
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Security & Compliance Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- tests/unit/

  integration-tests:
    runs-on: ubuntu-latest
    services:
      firebase:
        image: firebase-emulator
        ports:
          - 9099:9099
          - 5004:5004
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run test:integration:firebase
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up test data after each test
- Use fresh instances for each test

### 2. Security Testing
- Never use real credentials in tests
- Use emulators for external services
- Test both success and failure paths
- Include edge cases and malicious inputs

### 3. Compliance Testing
- Verify audit trails are generated
- Check retention policies
- Test data classification
- Verify PII handling

### 4. Performance
- Keep unit tests fast (< 100ms each)
- Use parallel test execution
- Mock heavy operations
- Use test databases/emulators

## Troubleshooting

### Common Issues

#### Rate Limiting in Tests
**Problem**: Tests fail due to rate limiting
**Solution**: Tests run against emulators with rate limiting disabled

#### Authentication Errors
**Problem**: 401 errors in integration tests
**Solution**: Ensure Firebase emulators are running

#### Timeout Errors
**Problem**: Tests timeout waiting for elements
**Solution**: Increase timeout or use proper wait conditions

## Maintenance

### Regular Tasks
1. **Weekly**: Run full test suite
2. **Monthly**: Review test coverage
3. **Quarterly**: Update security test cases
4. **Annually**: Compliance audit of test scenarios

### Adding New Tests
1. Identify security/compliance requirement
2. Write unit test first
3. Add integration test if needed
4. Document test scenario
5. Update this guide

## Contact

For questions about security testing:
- Security Team: security@clearhold.app
- Compliance Team: compliance@clearhold.app
- Engineering: engineering@clearhold.app