import { test, expect } from '@playwright/test';
import { interceptAPIForLocalTesting } from './helpers/api-interceptor';

test.describe('Passwordless Authentication - Simple Flow', () => {
  test('debug passwordless flow', async ({ page }) => {
    // Set up API interception
    await interceptAPIForLocalTesting(page);
    
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Browser error:', err));
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('API Request:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    // Navigate to login
    await page.goto('/login');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-screenshots/login-initial.png' });
    
    // Try to find and fill email
    const emailInput = await page.locator('input[type="email"]').first();
    await emailInput.fill('test@example.com');
    
    // Find and click continue button
    const continueButton = await page.locator('button').filter({ hasText: /continue/i }).first();
    await continueButton.click();
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking continue
    await page.screenshot({ path: 'test-screenshots/after-continue.png' });
    
    // Look for any passwordless option
    const passwordlessButtons = await page.locator('button').filter({ hasText: /email.*link|magic.*link|sign.*link/i }).all();
    console.log(`Found ${passwordlessButtons.length} passwordless buttons`);
    
    if (passwordlessButtons.length > 0) {
      await passwordlessButtons[0].click();
      
      // Wait for any response
      await page.waitForTimeout(3000);
      
      // Take screenshot after clicking passwordless
      await page.screenshot({ path: 'test-screenshots/after-passwordless.png' });
      
      // Check current URL
      console.log('Current URL:', page.url());
      
      // Check for any error messages
      const errors = await page.locator('text=/error|failed|invalid/i').all();
      for (const error of errors) {
        console.log('Error found:', await error.textContent());
      }
    }
    
    // Don't fail the test, just gather information
    expect(true).toBe(true);
  });
});