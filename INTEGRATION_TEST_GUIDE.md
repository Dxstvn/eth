# Authentication Integration Testing Guide

This guide covers the comprehensive integration testing suite for the CryptoEscrow authentication system. The tests verify real backend connectivity, Firebase emulator integration, and full authentication flows.

## 🧪 Test Categories

### 1. **Unit Tests** (Basic Functionality)
- Core authentication context operations
- Basic API client functionality
- Token management logic
- Error handling primitives

### 2. **Backend Integration Tests** (Real API Testing)
- Staging backend connectivity
- Authentication endpoint validation
- Error response handling
- API rate limiting and security
- Network failure scenarios

### 3. **Firebase Emulator Tests** (Real Firebase Flows)
- Firebase authentication with emulators
- Real ID token generation and validation
- Full-stack integration with backend
- Firebase-specific error handling

## 🚀 Quick Start

### Running All Tests
```bash
# Run complete integration test suite
npm run test:integration:full

# Run with automatic emulator startup
npm run test:integration:auto
```

### Running Specific Test Types
```bash
# Backend-only tests (requires staging backend)
npm run test:integration:backend

# Firebase emulator tests only
npm run test:integration:emulators

# Basic unit tests
npm test
```

## 🛠️ Setup Requirements

### Required Dependencies
```bash
npm install firebase-tools nock --save-dev
```

### Firebase Emulator Setup
1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Start Firebase Emulators**:
   ```bash
   npm run firebase:emulators
   ```
   This starts:
   - Auth emulator on port 9099
   - Firestore emulator on port 8080
   - UI dashboard on port 4000

3. **Run emulator tests**:
   ```bash
   npm run test:emulated
   ```

## 📋 Test Coverage

### Backend Integration Tests (`auth-backend-integration.test.tsx`)

#### ✅ **Backend Connectivity**
- Health endpoint connectivity
- Connection timeout handling
- Service unavailable scenarios
- CORS validation

#### ✅ **Authentication Flows**
- Email/password signup
- Email/password signin
- Google OAuth integration
- Invalid credentials handling
- Duplicate email error handling

#### ✅ **Token Management**
- Token persistence across page reloads
- localStorage error handling
- Token clearing on signout
- Authorization header injection

#### ✅ **API Client Integration**
- Authenticated request handling
- Unauthorized response handling
- Bearer token validation

#### ✅ **Error Handling**
- Network error recovery
- Server error handling
- Malformed response handling

#### ✅ **Performance & Reliability**
- Concurrent request handling
- Request timeout management
- Rate limiting compliance

### Firebase Emulator Tests (`auth-firebase-emulator.test.tsx`)

#### 🔥 **Firebase Authentication**
- User creation with email/password
- User signin with existing credentials
- Authentication error handling
- ID token generation and validation

#### 🔥 **Full-Stack Integration**
- Frontend → Firebase → Backend flow
- Real ID token verification
- Firebase emulator environment validation

#### 🔥 **Firebase-Specific Features**
- Auth state management
- User profile handling
- Firebase error translation

### Real Backend Tests (`auth-real-backend.test.tsx`)

#### 🌐 **Live Backend Validation**
- Production staging backend connectivity
- Real API endpoint testing
- Actual response time measurement
- Live error handling validation

#### 🌐 **Production-Ready Testing**
- Real network conditions
- Actual security headers
- Live rate limiting
- Production error scenarios

## 🎯 Test Execution Strategies

### 1. **Development Testing**
```bash
# Quick unit tests during development
npm test -- --watch

# Backend integration during feature development
npm run test:integration:backend
```

### 2. **CI/CD Pipeline Testing**
```bash
# Complete test suite for CI
npm run test:integration:full

# With coverage reporting
npm run test:coverage
```

### 3. **Pre-deployment Testing**
```bash
# Full integration with emulators
npm run test:integration:auto

# Production backend validation
npm run test:integration:backend
```

## 🔧 Configuration

### Test Environment Variables
```bash
# Firebase Emulator Configuration
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080

# Backend Configuration
STAGING_API_URL=https://api.clearhold.app
```

### Test Scripts Configuration
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testMatch='**/__tests__/integration/**/*.test.tsx'",
    "test:integration:watch": "jest --testMatch='**/__tests__/integration/**/*.test.tsx' --watch",
    "test:integration:full": "./scripts/run-integration-tests.sh",
    "test:integration:backend": "./scripts/run-integration-tests.sh --backend-only",
    "test:integration:emulators": "./scripts/run-integration-tests.sh --emulator-only",
    "test:integration:auto": "./scripts/run-integration-tests.sh --start-emulators",
    "firebase:emulators": "firebase emulators:start --only auth,firestore",
    "test:emulated": "FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 FIRESTORE_EMULATOR_HOST=localhost:8080 npm run test:integration"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### **Firebase Emulators Not Starting**
```bash
# Check if ports are in use
lsof -i :9099 -i :8080 -i :4000

# Kill processes using ports
kill -9 $(lsof -t -i:9099)
kill -9 $(lsof -t -i:8080)

# Restart emulators
npm run firebase:emulators
```

#### **Backend Not Accessible**
```bash
# Test backend connectivity
curl -v https://api.clearhold.app/health

# Check network/firewall settings
ping api.clearhold.app

# Verify DNS resolution
nslookup api.clearhold.app
```

#### **localStorage Errors in Tests**
The integration tests include comprehensive localStorage mocking. If you see localStorage errors:

1. Check that the mock is properly imported
2. Verify Jest setup includes JSDOM environment
3. Ensure beforeEach clears mocks properly

#### **Test Timeout Issues**
```bash
# Increase Jest timeout for slow networks
jest --testTimeout=30000

# Run specific slow tests
npm run test:integration -- --testNamePattern="timeout"
```

### Debug Mode
```bash
# Run tests with detailed output
npm run test:integration -- --verbose

# Run specific test file
npm run test:integration -- auth-backend-integration.test.tsx

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📊 Test Results Interpretation

### Success Indicators
- ✅ All backend connectivity tests pass
- ✅ Authentication flows work end-to-end  
- ✅ Token management is robust
- ✅ Error handling is comprehensive
- ✅ Performance requirements are met

### Warning Indicators
- ⚠️ Backend occasionally unavailable (network issues)
- ⚠️ Slow response times (>3 seconds)
- ⚠️ Emulators not running (feature incomplete testing)

### Failure Indicators
- ❌ Authentication flows broken
- ❌ Token management failing
- ❌ API integration broken
- ❌ Critical error handling missing

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Authentication Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test
    
    - name: Run backend integration tests
      run: npm run test:integration:backend
      
    - name: Setup Firebase Emulators
      run: |
        npm install -g firebase-tools
        firebase emulators:start --only auth,firestore &
        sleep 10
    
    - name: Run emulator integration tests
      run: npm run test:emulated
      env:
        FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
        FIRESTORE_EMULATOR_HOST: localhost:8080
```

## 📈 Performance Benchmarks

### Expected Response Times
- **Health Check**: < 1 second
- **Authentication**: < 3 seconds
- **Token Refresh**: < 2 seconds
- **API Calls**: < 2 seconds

### Success Rate Targets
- **Backend Connectivity**: > 99%
- **Authentication Success**: > 95%
- **Token Validation**: > 99%
- **Error Recovery**: > 90%

## 🎉 Success Metrics

A successful integration test run should show:

```
🧪 CryptoEscrow Authentication Integration Test Suite
==================================================

✅ Firebase Auth emulator running on port 9099
✅ Firestore emulator running on port 8080
✅ Backend accessible at https://api.clearhold.app

📊 Integration Test Summary
==========================

Backend Status: ✅ Available
Emulators Status: ✅ Running

🌐 Real backend tests will run
🔥 Firebase emulator tests will run

🏁 Final Results
===============

Tests Passed: 4
Tests Failed: 0

🎉 All integration tests passed!
```

This comprehensive testing suite ensures that the authentication system is production-ready and can handle real-world scenarios with confidence. 