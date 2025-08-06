#!/bin/bash

# Performance Testing Script for Phase 11.3
# Runs comprehensive performance tests against local backend

echo "🚀 ClearHold Performance Testing Suite"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${BLUE}📋 Checking backend health...${NC}"
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running. Please start with: npm run dev:fullstack${NC}"
    exit 1
fi

# Run performance test suites
echo -e "\n${BLUE}📊 Running Performance Test Suites...${NC}"

echo -e "\n${YELLOW}1. Load Testing Suite${NC}"
echo "Testing concurrent users, wallet operations, and database performance..."
npm test -- __tests__/performance/load-testing.test.tsx --reporter=verbose

echo -e "\n${YELLOW}2. Stress Testing Suite (Light Load)${NC}"
echo "Testing system behavior under stress conditions..."
npm test -- __tests__/performance/stress-testing.test.tsx -t "should handle light concurrent load" --reporter=verbose

echo -e "\n${YELLOW}3. Resource Monitoring Suite${NC}"
echo "Monitoring system resources and performance characteristics..."
npm test -- __tests__/performance/resource-monitoring.test.tsx -t "should monitor baseline response times" --reporter=verbose

echo -e "\n${YELLOW}4. Concurrent Connection Testing${NC}"
echo "Testing concurrent connection handling..."
npm test -- __tests__/performance/resource-monitoring.test.tsx -t "should monitor concurrent connection handling" --reporter=verbose

echo -e "\n${GREEN}🎯 Performance Testing Complete!${NC}"
echo ""
echo "📈 Performance Test Results Summary:"
echo "├── Load Testing: Concurrent users, wallet ops, database performance"
echo "├── Stress Testing: System behavior under load"
echo "├── Resource Monitoring: Response times and system metrics"
echo "└── Connection Testing: Concurrent connection handling"
echo ""
echo "📋 Next Steps:"
echo "├── Review test output for performance bottlenecks"
echo "├── Check response time thresholds"
echo "├── Monitor resource usage patterns"
echo "└── Optimize based on findings"
echo ""
echo -e "${BLUE}💡 To run full stress testing (longer duration):${NC}"
echo "npm test -- __tests__/performance/stress-testing.test.tsx"
echo ""
echo -e "${BLUE}💡 To run full resource monitoring:${NC}"
echo "npm test -- __tests__/performance/resource-monitoring.test.tsx"