import { defineConfig, devices } from '@playwright/test';

/**
 * Simplified E2E test configuration
 * Uses development mode with test-specific security features
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Add 1 retry for local tests
  workers: process.env.CI ? 1 : 4, // Limit workers to reduce race conditions
  reporter: [
    ['html'],
    ['line'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  // Increase global timeout for slower environments
  timeout: 45000, // 45 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for expect assertions
  },
  
  use: {
    // Run against development server with test mode
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Increase action timeout
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
    
    // Global test headers
    extraHTTPHeaders: {
      'x-test-mode': 'true',
      'x-test-auth': process.env.NEXT_PUBLIC_TEST_AUTH_TOKEN || 'test-token',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run development server with test environment
  webServer: {
    command: 'npm run dev -- --port 3001',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_TEST_MODE: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    },
  },
});