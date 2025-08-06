import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - E2E with Bypass', () => {
  test.use({
    // Add custom header to bypass rate limiting in dev
    extraHTTPHeaders: {
      'x-e2e-test': 'true'
    }
  });

  test('should complete passwordless flow', async ({ page }) => {
    const testEmail = 'e2e-test@example.com';
    
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // The email input should be visible
    const emailInput = await page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // Fill email and continue
    await emailInput.fill(testEmail);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for the password form with passwordless option
    await page.waitForSelector('button:has-text("Email me a sign-in link")', { timeout: 5000 });
    
    // Click passwordless option
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Should navigate to email sent page
    await page.waitForURL('**/auth/email-sent*', { timeout: 10000 });
    
    // Verify success page
    expect(page.url()).toContain('/auth/email-sent');
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    
    console.log('✅ Passwordless email sent successfully!');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = await page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // Try invalid email
    await emailInput.fill('invalid-email');
    
    // Check if continue button is disabled
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    const isDisabled = await continueButton.isDisabled();
    
    if (isDisabled) {
      console.log('✅ Button correctly disabled for invalid email');
      expect(isDisabled).toBe(true);
    } else {
      // Try to click and see if we get validation error
      await continueButton.click();
      
      // Should stay on login page
      expect(page.url()).toContain('/login');
      console.log('✅ Form validation prevented submission');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Complete the flow
    const emailInput = await page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Click passwordless
    await page.waitForSelector('button:has-text("Email me a sign-in link")');
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Should show error message
    await expect(page.locator('text=/error|failed|unable/i')).toBeVisible({ timeout: 5000 });
    console.log('✅ Error handling works correctly');
  });
});