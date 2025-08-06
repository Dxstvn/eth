import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page first
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should send passwordless email successfully', async ({ page }) => {
    const testEmail = 'test@example.com';
    
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check which login flow is shown
    const hasEmailAddressPlaceholder = await page.locator('input[placeholder="Email address"]').isVisible({ timeout: 2000 })
      .catch(() => false);
    
    if (hasEmailAddressPlaceholder) {
      // Direct passwordless flow - "Enter your email to receive a secure sign-in link"
      console.log('Using direct passwordless flow');
      await page.fill('input[placeholder="Email address"]', testEmail);
      await page.click('button:has-text("Continue with Email")');
    } else {
      // Two-step flow
      console.log('Using two-step flow');
      await page.fill('input[type="email"]', testEmail);
      await page.click('button:has-text("Continue")');
      
      // Wait for the next step to load
      await page.waitForTimeout(1000);
      
      // Look for passwordless option
      const passwordlessButton = page.locator('button:has-text("Email me a sign-in link")');
      if (await passwordlessButton.isVisible({ timeout: 3000 })) {
        await passwordlessButton.click();
      }
    }
    
    // Wait for response - either success or error
    await page.waitForTimeout(3000);
    
    // Check if we were redirected to email-sent page
    const isOnEmailSentPage = page.url().includes('/auth/email-sent');
    const hasCheckEmailText = await page.locator('text=Check your email').isVisible({ timeout: 2000 })
      .catch(() => false);
    
    if (isOnEmailSentPage || hasCheckEmailText) {
      console.log('Successfully sent passwordless email');
      expect(isOnEmailSentPage || hasCheckEmailText).toBe(true);
      
      // Verify email is displayed
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    } else {
      // Check for error messages
      const errorMessages = await page.locator('text=/error|failed|invalid|unable/i').all();
      if (errorMessages.length > 0) {
        for (const error of errorMessages) {
          console.log('Error found:', await error.textContent());
        }
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-screenshots/passwordless-error.png' });
      }
      
      // Check current URL and page state
      console.log('Current URL:', page.url());
      console.log('Page title:', await page.title());
      
      // Fail the test with helpful message
      throw new Error('Passwordless email was not sent successfully. Check logs and screenshot.');
    }
  });

  test('should handle invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const invalidEmail = 'invalid-email';
    
    // Check which flow we're in
    const hasEmailAddressPlaceholder = await page.locator('input[placeholder="Email address"]').isVisible({ timeout: 2000 })
      .catch(() => false);
    
    if (hasEmailAddressPlaceholder) {
      await page.fill('input[placeholder="Email address"]', invalidEmail);
      // Try to submit - might be disabled
      const button = page.locator('button:has-text("Continue with Email")');
      if (await button.isEnabled()) {
        await button.click();
      }
    } else {
      await page.fill('input[type="email"]', invalidEmail);
      // HTML5 validation might prevent submission
      const button = page.locator('button:has-text("Continue")');
      if (await button.isEnabled()) {
        await button.click();
      }
    }
    
    // Check for validation error
    // Could be HTML5 validation or custom error message
    const hasValidationError = await page.locator('text=/valid email|invalid/i').isVisible({ timeout: 3000 })
      .catch(() => false);
    
    // Or check if we're still on the same page (form not submitted)
    const stillOnLoginPage = page.url().includes('/login');
    
    expect(hasValidationError || stillOnLoginPage).toBe(true);
  });
});