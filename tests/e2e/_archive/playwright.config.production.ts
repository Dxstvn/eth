import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load production E2E environment
dotenv.config({ path: '.env.production.e2e' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3001', // Production server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Headers for ngrok and E2E testing
    extraHTTPHeaders: {
      'ngrok-skip-browser-warning': 'true',
      'x-e2e-test': 'true',
      'x-request-id': 'e2e-production-test'
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start production server
  webServer: {
    command: 'npm run start -- -p 3001',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});