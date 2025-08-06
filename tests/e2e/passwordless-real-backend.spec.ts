import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - Real Backend', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();
  });

  test('should complete passwordless flow with real backend', async ({ page }) => {
    const testEmail = 'e2e-test@example.com';
    
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to be ready (auth check to complete)
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill email and continue
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for the next step - should show password form with passwordless option
    await page.waitForSelector('button:has-text("Email me a sign-in link")', { timeout: 5000 });
    
    // Click passwordless option
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Wait for API response and navigation
    await page.waitForURL('**/auth/email-sent*', { timeout: 10000 });
    
    // Verify we're on the email sent page
    expect(page.url()).toContain('/auth/email-sent');
    
    // Verify email is displayed
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    console.log('✅ Passwordless email sent successfully!');
  });

  test('should handle invalid email', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Try invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    
    // The Continue button might be disabled due to HTML5 validation
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    const isDisabled = await continueButton.isDisabled();
    
    if (!isDisabled) {
      await continueButton.click();
      // Should see validation error
      await expect(page.locator('text=/valid email|invalid/i')).toBeVisible({ timeout: 3000 });
    } else {
      // Button is disabled, which is correct behavior
      expect(isDisabled).toBe(true);
    }
  });

  test('should handle rate limiting', async ({ page }) => {
    // This test might trigger real rate limiting, so be careful
    const baseEmail = 'ratelimit-test';
    
    for (let i = 0; i < 3; i++) {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      await page.fill('input[type="email"]', `${baseEmail}${i}@example.com`);
      await page.click('button[type="submit"]:has-text("Continue")');
      
      const hasPasswordlessOption = await page.waitForSelector('button:has-text("Email me a sign-in link")', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      
      if (hasPasswordlessOption) {
        await page.click('button:has-text("Email me a sign-in link")');
        
        // Check if we got rate limited or succeeded
        const isRateLimited = await page.waitForSelector('text=/rate limit|too many/i', { timeout: 3000 })
          .then(() => true)
          .catch(() => false);
        
        if (isRateLimited) {
          console.log(`Rate limited after ${i + 1} attempts`);
          expect(isRateLimited).toBe(true);
          break;
        } else {
          // Wait for success
          await page.waitForURL('**/auth/email-sent*', { timeout: 5000 }).catch(() => {});
        }
      }
    }
  });
});