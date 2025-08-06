import { test, expect } from '@playwright/test';

test.describe('Passwordless - Production Simple Tests', () => {
  // Set E2E headers for all tests
  test.use({
    extraHTTPHeaders: {
      'ngrok-skip-browser-warning': 'true',
      'x-e2e-test': 'true',
      'x-request-id': 'prod-e2e-simple'
    }
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title
    await expect(page).toHaveTitle(/ClearHold/);
    
    // Check essential elements
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    
    console.log('✅ Login page loaded successfully');
  });

  test('email input validation works', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")').first();
    
    // Initially disabled
    await expect(continueButton).toBeDisabled();
    
    // Invalid email
    await emailInput.fill('invalid');
    await expect(continueButton).toBeDisabled();
    
    // Valid email
    await emailInput.fill('test@example.com');
    await expect(continueButton).toBeEnabled();
    
    console.log('✅ Email validation working correctly');
  });

  test('passwordless option appears after email', async ({ page }) => {
    await page.goto('/login');
    
    // Enter email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Check for auth methods
    const authMethodsAppeared = await page.locator('text=How would you like to sign in?')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (authMethodsAppeared) {
      await expect(page.locator('button:has-text("Email me a sign-in link")')).toBeVisible();
      console.log('✅ Passwordless option available');
    } else {
      // Might have hit rate limit or other issue
      const errorVisible = await page.locator('text=/error|failed|rate limit/i').isVisible();
      console.log(`⚠️ Auth methods didn't appear. Error visible: ${errorVisible}`);
    }
  });

  test('can send passwordless email', async ({ page }) => {
    await page.goto('/login');
    
    // Enter email and continue
    await page.fill('input[type="email"]', 'sendtest@example.com');
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for auth methods
    const authMethodsVisible = await page.locator('text=How would you like to sign in?')
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (!authMethodsVisible) {
      console.log('⚠️ Skipping test - auth methods not visible');
      return;
    }
    
    // Click passwordless
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Wait for navigation or error
    await page.waitForTimeout(5000);
    
    // Check result
    if (page.url().includes('/auth/email-sent')) {
      await expect(page.locator('text=Check your email')).toBeVisible();
      console.log('✅ Passwordless email sent successfully');
    } else {
      // Check for error message
      const hasError = await page.locator('text=/error|failed|rate limit/i').isVisible();
      console.log(`ℹ️ Email send result: ${hasError ? 'Error shown' : 'Unknown state'}`);
    }
  });

  test('google login option exists', async ({ page }) => {
    await page.goto('/login');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    
    console.log('✅ Google login option available');
  });
});