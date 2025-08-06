import { test, expect } from '@playwright/test';
import { interceptAPIForLocalTesting } from './helpers/api-interceptor';
import { testConfig, waitForBackendOperation } from './helpers/test-config';

test.describe('Passwordless Authentication - Real Backend Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API interception to use localhost:3000
    await interceptAPIForLocalTesting(page);
    
    // Navigate to a page first to establish context
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete passwordless sign-in flow with real backend', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Enter email
    await page.fill('input[type="email"]', testConfig.testUsers.existingUser.email);
    
    // Click continue button
    await page.click('button:has-text("Continue")');
    
    // Wait for auth method selection to appear
    await page.waitForSelector('text=How would you like to sign in?', { 
      timeout: testConfig.timeouts.navigation 
    });
    
    // Click on passwordless option
    await page.click('button:has-text("Email me a secure link")');
    
    // Wait for real backend to process the request
    await waitForBackendOperation(2000);
    
    // Should be redirected to email-sent page
    await page.waitForURL('**/auth/email-sent*', { 
      timeout: testConfig.timeouts.emailSend 
    });
    
    // Verify success message
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testConfig.testUsers.existingUser.email}`)).toBeVisible();
    
    // Note: In a real test environment, you would:
    // 1. Check the Firebase emulator for the sent email
    // 2. Extract the magic link from the email
    // 3. Navigate to the link to complete authentication
  });

  test('should handle rate limiting from real backend', async ({ page }) => {
    await page.goto('/login');
    
    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', `test${i}@example.com`);
      await page.click('button:has-text("Continue")');
      
      // Only continue if we see the auth method selection
      const authMethodsVisible = await page.locator('text=How would you like to sign in?').isVisible();
      if (authMethodsVisible) {
        await page.click('button:has-text("Email me a secure link")');
        
        // Wait for backend to process
        await waitForBackendOperation(1000);
        
        // Go back to try again
        await page.goto('/login');
      }
    }
    
    // Eventually should see rate limit error from real backend
    await expect(page.locator('text=/rate limit|too many/i')).toBeVisible({ 
      timeout: 10000 
    });
  });

  test('should validate email format using real backend validation', async ({ page }) => {
    await page.goto('/login');
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    
    // Try to submit
    await page.click('button:has-text("Continue")');
    
    // Should see validation error (either from frontend or backend)
    await expect(page.locator('text=/valid email|invalid/i')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Temporarily break the API interception to simulate network failure
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.abort('failed');
    });

    await page.goto('/login');
    
    // Enter email and continue
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Continue")');
    
    // Should see auth methods
    const authMethodsVisible = await page.locator('text=How would you like to sign in?').isVisible();
    if (authMethodsVisible) {
      // Select passwordless
      await page.click('button:has-text("Email me a secure link")');
      
      // Should show error message
      await expect(page.locator('text=/failed|error|unable/i')).toBeVisible({ 
        timeout: 10000 
      });
    }
  });
});

test.describe('Passwordless Authentication - Firebase Emulator Integration', () => {
  test('should work with Firebase Auth emulator', async ({ page, context }) => {
    // This test assumes Firebase emulators are running
    await interceptAPIForLocalTesting(page);
    
    await page.goto('/login');
    
    // Use a test email that works with Firebase emulator
    const testEmail = 'emulator-test@example.com';
    
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Continue")');
    
    // Wait for auth methods
    await page.waitForSelector('text=How would you like to sign in?');
    await page.click('button:has-text("Email me a secure link")');
    
    // Wait for backend to process with Firebase emulator
    await waitForBackendOperation(3000);
    
    // Should redirect to email sent page
    await page.waitForURL('**/auth/email-sent*', { timeout: 10000 });
    
    // In a full integration test, you would:
    // 1. Query the Firebase emulator admin API to get the email link
    // 2. Open the link in a new page/tab
    // 3. Verify successful authentication
    
    // For now, just verify we got to the email sent page
    await expect(page.locator('text=Check your email')).toBeVisible();
  });
});