#!/bin/bash

# Integration Test Runner for CryptoEscrow Authentication
# This script orchestrates comprehensive integration testing including:
# - Firebase emulator setup
# - Backend connectivity checks  
# - Full authentication flow testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREBASE_PROJECT="test-project"
AUTH_EMULATOR_PORT=9099
FIRESTORE_EMULATOR_PORT=8080
BACKEND_URL="https://api.clearhold.app"

echo -e "${BLUE}🧪 CryptoEscrow Authentication Integration Test Suite${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Function to check if Firebase emulators are running
check_emulators() {
    echo -e "${YELLOW}🔍 Checking Firebase emulators...${NC}"
    
    # Check Auth emulator
    if curl -s "http://localhost:${AUTH_EMULATOR_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Firebase Auth emulator running on port ${AUTH_EMULATOR_PORT}${NC}"
        AUTH_EMULATOR_RUNNING=true
    else
        echo -e "${YELLOW}⚠️  Firebase Auth emulator not running on port ${AUTH_EMULATOR_PORT}${NC}"
        AUTH_EMULATOR_RUNNING=false
    fi
    
    # Check Firestore emulator
    if curl -s "http://localhost:${FIRESTORE_EMULATOR_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Firestore emulator running on port ${FIRESTORE_EMULATOR_PORT}${NC}"
        FIRESTORE_EMULATOR_RUNNING=true
    else
        echo -e "${YELLOW}⚠️  Firestore emulator not running on port ${FIRESTORE_EMULATOR_PORT}${NC}"
        FIRESTORE_EMULATOR_RUNNING=false
    fi
}

# Function to check backend connectivity
check_backend() {
    echo -e "${YELLOW}🌐 Checking backend connectivity...${NC}"
    
    if curl -s --max-time 5 "${BACKEND_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend accessible at ${BACKEND_URL}${NC}"
        BACKEND_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Backend not accessible at ${BACKEND_URL}${NC}"
        BACKEND_AVAILABLE=false
    fi
}

# Function to start Firebase emulators
start_emulators() {
    echo -e "${YELLOW}🚀 Starting Firebase emulators...${NC}"
    
    # Check if firebase-tools is installed
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLI not found. Installing...${NC}"
        npm install -g firebase-tools
    fi
    
    # Start emulators in background
    firebase emulators:start --only auth,firestore --project=${FIREBASE_PROJECT} > /tmp/firebase-emulators.log 2>&1 &
    EMULATOR_PID=$!
    
    echo -e "${BLUE}⏳ Waiting for emulators to start...${NC}"
    sleep 10  # Give emulators time to start
    
    # Verify they started successfully
    check_emulators
    
    if [ "$AUTH_EMULATOR_RUNNING" = true ] && [ "$FIRESTORE_EMULATOR_RUNNING" = true ]; then
        echo -e "${GREEN}✅ Firebase emulators started successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to start Firebase emulators${NC}"
        echo -e "${YELLOW}Check logs: tail -f /tmp/firebase-emulators.log${NC}"
        return 1
    fi
}

# Function to stop Firebase emulators
stop_emulators() {
    if [ ! -z "$EMULATOR_PID" ]; then
        echo -e "${YELLOW}🛑 Stopping Firebase emulators...${NC}"
        kill $EMULATOR_PID 2>/dev/null || true
        wait $EMULATOR_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Firebase emulators stopped${NC}"
    fi
}

# Function to run test suites
run_tests() {
    local test_type=$1
    local test_command=$2
    local description=$3
    
    echo ""
    echo -e "${BLUE}🧪 Running ${description}...${NC}"
    echo -e "${BLUE}Command: ${test_command}${NC}"
    echo ""
    
    if eval $test_command; then
        echo -e "${GREEN}✅ ${description} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${description} failed${NC}"
        return 1
    fi
}

# Function to display test summary
display_summary() {
    echo ""
    echo -e "${BLUE}📊 Integration Test Summary${NC}"
    echo -e "${BLUE}==========================${NC}"
    echo ""
    
    echo -e "Backend Status: ${BACKEND_AVAILABLE:+${GREEN}✅ Available${NC}}${BACKEND_AVAILABLE:-${YELLOW}⚠️  Unavailable${NC}}"
    echo -e "Emulators Status: ${AUTH_EMULATOR_RUNNING:+${GREEN}✅ Running${NC}}${AUTH_EMULATOR_RUNNING:-${YELLOW}⚠️  Not Running${NC}}"
    echo ""
    
    if [ "$BACKEND_AVAILABLE" = true ]; then
        echo -e "${GREEN}🌐 Real backend tests will run${NC}"
    else
        echo -e "${YELLOW}⚠️  Real backend tests will be skipped${NC}"
        echo -e "${YELLOW}   To run them: Ensure ${BACKEND_URL} is accessible${NC}"
    fi
    
    if [ "$AUTH_EMULATOR_RUNNING" = true ] && [ "$FIRESTORE_EMULATOR_RUNNING" = true ]; then
        echo -e "${GREEN}🔥 Firebase emulator tests will run${NC}"
    else
        echo -e "${YELLOW}⚠️  Firebase emulator tests will be skipped${NC}"
        echo -e "${YELLOW}   To run them: firebase emulators:start --only auth,firestore${NC}"
    fi
    echo ""
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
    
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        echo -e "${BLUE}Installing npm dependencies...${NC}"
        npm install
    fi
    
    # Check for required test dependencies
    local missing_deps=()
    
    if ! npm list firebase-tools > /dev/null 2>&1; then
        missing_deps+=("firebase-tools")
    fi
    
    if ! npm list nock > /dev/null 2>&1; then
        missing_deps+=("nock")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${YELLOW}Installing missing dependencies: ${missing_deps[*]}${NC}"
        npm install "${missing_deps[@]}"
    fi
    
    echo -e "${GREEN}✅ Dependencies ready${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    stop_emulators
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo -e "${BLUE}📋 Pre-flight checks${NC}"
    echo ""
    
    # Install dependencies
    install_dependencies
    
    # Check current status
    check_emulators
    check_backend
    
    # Parse command line arguments
    START_EMULATORS=false
    EMULATOR_TESTS_ONLY=false
    BACKEND_TESTS_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --start-emulators)
                START_EMULATORS=true
                shift
                ;;
            --emulator-only)
                EMULATOR_TESTS_ONLY=true
                shift
                ;;
            --backend-only)
                BACKEND_TESTS_ONLY=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --start-emulators    Start Firebase emulators automatically"
                echo "  --emulator-only      Run only Firebase emulator tests"
                echo "  --backend-only       Run only backend integration tests"
                echo "  --help, -h          Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                              # Run all available tests"
                echo "  $0 --start-emulators           # Start emulators and run all tests"
                echo "  $0 --emulator-only              # Run only emulator tests"
                echo "  $0 --backend-only               # Run only backend tests"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Start emulators if requested
    if [ "$START_EMULATORS" = true ]; then
        if ! start_emulators; then
            echo -e "${RED}❌ Failed to start emulators. Exiting.${NC}"
            exit 1
        fi
        # Re-check emulator status
        check_emulators
    fi
    
    # Display test configuration
    display_summary
    
    # Track test results
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    echo -e "${BLUE}🚀 Starting integration tests...${NC}"
    
    # Run unit tests first to ensure basic functionality
    if [ "$EMULATOR_TESTS_ONLY" != true ] && [ "$BACKEND_TESTS_ONLY" != true ]; then
        if run_tests "unit" "npm test -- __tests__/auth-context-simple.test.tsx" "Core Auth Context Tests"; then
            ((TESTS_PASSED++))
        else
            ((TESTS_FAILED++))
        fi
    fi
    
    # Run backend integration tests
    if [ "$EMULATOR_TESTS_ONLY" != true ]; then
        if run_tests "backend" "npm run test:integration -- __tests__/integration/auth-backend-integration.test.tsx" "Backend Integration Tests"; then
            ((TESTS_PASSED++))
        else
            ((TESTS_FAILED++))
        fi
        
        if run_tests "real-backend" "npm run test:integration -- __tests__/integration/auth-real-backend.test.tsx" "Real Backend Connectivity Tests"; then
            ((TESTS_PASSED++))
        else
            ((TESTS_FAILED++))
        fi
    fi
    
    # Run Firebase emulator tests
    if [ "$BACKEND_TESTS_ONLY" != true ]; then
        if [ "$AUTH_EMULATOR_RUNNING" = true ] && [ "$FIRESTORE_EMULATOR_RUNNING" = true ]; then
            if run_tests "emulator" "FIREBASE_AUTH_EMULATOR_HOST=localhost:${AUTH_EMULATOR_PORT} FIRESTORE_EMULATOR_HOST=localhost:${FIRESTORE_EMULATOR_PORT} npm run test:integration -- __tests__/integration/auth-firebase-emulator.test.tsx" "Firebase Emulator Integration Tests"; then
                ((TESTS_PASSED++))
            else
                ((TESTS_FAILED++))
            fi
        else
            echo -e "${YELLOW}⚠️  Skipping Firebase emulator tests - emulators not running${NC}"
        fi
    fi
    
    # Final summary
    echo ""
    echo -e "${BLUE}🏁 Final Results${NC}"
    echo -e "${BLUE}===============${NC}"
    echo ""
    echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All integration tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 