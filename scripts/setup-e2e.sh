#!/bin/bash

echo "🚀 Setting up E2E test environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check if backend is running
echo "🔍 Checking if backend is running on port 3000..."
if ! port_in_use 3000; then
    echo -e "${YELLOW}⚠️  Backend is not running on port 3000${NC}"
    echo "Please start the backend server first:"
    echo "  cd /Users/dustinjasmin/personal-cryptoscrow-backend"
    echo "  npm start"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Check if Firebase emulators are running
echo "🔍 Checking Firebase emulators..."
EMULATOR_PORTS=(5004 9099 9199)
EMULATOR_NAMES=("Firestore" "Auth" "Storage")

for i in ${!EMULATOR_PORTS[@]}; do
    if ! port_in_use ${EMULATOR_PORTS[$i]}; then
        echo -e "${YELLOW}⚠️  ${EMULATOR_NAMES[$i]} emulator is not running on port ${EMULATOR_PORTS[$i]}${NC}"
        EMULATORS_MISSING=true
    else
        echo -e "${GREEN}✅ ${EMULATOR_NAMES[$i]} emulator is running${NC}"
    fi
done

if [ "$EMULATORS_MISSING" = true ]; then
    echo "Please start Firebase emulators in the backend directory:"
    echo "  cd /Users/dustinjasmin/personal-cryptoscrow-backend"
    echo "  npm run emulators"
    exit 1
fi

# Check if Hardhat node is running
echo "🔍 Checking Hardhat node..."
if ! port_in_use 8545; then
    echo -e "${YELLOW}⚠️  Hardhat node is not running on port 8545${NC}"
    echo "Please start Hardhat node in the backend directory:"
    echo "  cd /Users/dustinjasmin/personal-cryptoscrow-backend"
    echo "  npm run hardhat:node"
    exit 1
fi
echo -e "${GREEN}✅ Hardhat node is running${NC}"

# Check if frontend dev server is already running on port 3001
echo "🔍 Checking if port 3001 is available..."
if port_in_use 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo "Please stop any process using port 3001 or use a different port"
    exit 1
fi
echo -e "${GREEN}✅ Port 3001 is available${NC}"

# Install dependencies if needed
echo "📦 Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create E2E environment file if it doesn't exist
if [ ! -f ".env.e2e" ]; then
    echo -e "${YELLOW}⚠️  .env.e2e file not found. Using template...${NC}"
    cp .env.e2e.template .env.e2e 2>/dev/null || echo "No template found, using existing .env.e2e"
fi

echo -e "${GREEN}✨ E2E test environment is ready!${NC}"
echo ""
echo "You can now run E2E tests with:"
echo "  npm run test:e2e         # Run all E2E tests"
echo "  npm run test:e2e:ui      # Run with Playwright UI"
echo "  npm run test:e2e:headed  # Run in headed mode"
echo "  npm run test:e2e:debug   # Run in debug mode"
echo ""
echo "The frontend dev server will start automatically on port 3001"