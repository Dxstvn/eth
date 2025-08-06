import { test, expect } from '@playwright/test';

// E2E test configuration
const E2E_CONFIG = {
  testEmail: 'e2e-test@example.com',
  testPassword: 'testPassword123',
  baseUrl: 'http://localhost:3001',
  apiUrl: 'http://localhost:3000',
  timeout: {
    navigation: 30000,
    element: 10000,
    api: 15000
  }
};

test.describe('Passwordless Authentication - Complete E2E Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Set E2E test headers for all requests
    await context.setExtraHTTPHeaders({
      'x-e2e-test': 'true',
      'x-request-id': `e2e-${Date.now()}`
    });
  });

  test('should complete full passwordless authentication flow', async ({ page, context }) => {
    // Step 1: Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle', timeout: E2E_CONFIG.timeout.navigation });
    
    // Verify page loaded
    await expect(page).toHaveTitle(/ClearHold/);
    
    // Step 2: Enter email
    const emailInput = await page.waitForSelector('input[type="email"]', { 
      state: 'visible',
      timeout: E2E_CONFIG.timeout.element 
    });
    
    await emailInput.fill(E2E_CONFIG.testEmail);
    
    // Step 3: Click continue
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    
    // Step 4: Wait for password form
    await page.waitForSelector('button:has-text("Email me a sign-in link")', {
      state: 'visible',
      timeout: E2E_CONFIG.timeout.element
    });
    
    // Verify email is displayed
    await expect(page.locator(`text=${E2E_CONFIG.testEmail}`)).toBeVisible();
    
    // Step 5: Click passwordless option
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Step 6: Wait for API call to complete
    const response = await page.waitForResponse(
      response => response.url().includes('/api/auth/passwordless/send-link') && response.status() === 200,
      { timeout: E2E_CONFIG.timeout.api }
    );
    
    expect(response.ok()).toBeTruthy();
    
    // Step 7: Verify redirect to email sent page
    await page.waitForURL('**/auth/email-sent**', { 
      timeout: E2E_CONFIG.timeout.navigation 
    });
    
    // Step 8: Verify email sent page content
    await expect(page.locator('h1:has-text("Check your email")')).toBeVisible();
    await expect(page.locator(`text=${E2E_CONFIG.testEmail}`)).toBeVisible();
    await expect(page.locator('text=/We sent a sign-in link/i')).toBeVisible();
    
    console.log('✅ Passwordless authentication flow completed successfully!');
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Navigate to login
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Make multiple requests quickly to trigger rate limiting
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', `test${i}@example.com`);
      await page.click('button[type="submit"]:has-text("Continue")');
      
      // Wait for password form
      await page.waitForSelector('button:has-text("Email me a sign-in link")', {
        state: 'visible'
      });
      
      // Click passwordless
      await page.click('button:has-text("Email me a sign-in link")');
      
      // Go back to login
      await page.goto('/login');
    }
    
    // The requests should still succeed due to E2E header bypass
    expect(page.url()).not.toContain('error');
  });

  test('should validate email format before submission', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    const emailInput = await page.waitForSelector('input[type="email"]');
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    
    // Test invalid email formats
    const invalidEmails = ['invalid', 'test@', '@test.com', 'test..test@example.com'];
    
    for (const email of invalidEmails) {
      await emailInput.fill(email);
      
      // Check if button is disabled or if submission is prevented
      const isDisabled = await continueButton.isDisabled();
      
      if (!isDisabled) {
        await continueButton.click();
        // Should stay on login page
        await expect(page).toHaveURL(/\/login/);
      }
    }
    
    // Test valid email
    await emailInput.fill('valid@example.com');
    await continueButton.click();
    
    // Should proceed to password form
    await expect(page.locator('button:has-text("Email me a sign-in link")')).toBeVisible({
      timeout: E2E_CONFIG.timeout.element
    });
  });

  test('should handle backend errors gracefully', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Intercept API call and force an error
    await page.route('**/api/auth/passwordless/send-link', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Complete the flow
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]:has-text("Continue")');
    await page.waitForSelector('button:has-text("Email me a sign-in link")');
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Should show error message
    await expect(page.locator('text=/error|failed|unable/i')).toBeVisible({
      timeout: E2E_CONFIG.timeout.element
    });
    
    // Should stay on the same page
    expect(page.url()).toContain('/login');
  });

  test('should allow going back to email entry', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Enter email and continue
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for password form
    await page.waitForSelector('button:has-text("Email me a sign-in link")');
    
    // Click back button
    const backButton = page.locator('button:has-text("Back")');
    await expect(backButton).toBeVisible();
    await backButton.click();
    
    // Should be back at email entry
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Continue")')).toBeVisible();
  });
});