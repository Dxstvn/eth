import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E environment variables
dotenv.config({ path: '.env.e2e' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially for E2E
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for E2E tests to avoid rate limiting
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Add E2E test header to all requests
    extraHTTPHeaders: {
      'x-e2e-test': 'true',
      'x-request-id': 'e2e-test'
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run dev server with E2E environment
  webServer: {
    command: 'npm run dev:e2e',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_PUBLIC_E2E_TEST: 'true',
      PORT: '3001'
    },
    timeout: 120 * 1000, // 2 minutes for server startup
  },
});