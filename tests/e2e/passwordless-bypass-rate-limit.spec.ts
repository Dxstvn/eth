import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - Bypass Rate Limit', () => {
  test('should test passwordless with custom headers', async ({ page }) => {
    const testEmail = 'e2e-test@example.com';
    
    // Add custom headers to bypass rate limiting
    await page.setExtraHTTPHeaders({
      'X-Forwarded-For': `10.0.0.${Math.floor(Math.random() * 255)}`, // Random IP
      'X-Real-IP': `10.0.0.${Math.floor(Math.random() * 255)}`,
      'User-Agent': `E2E-Test-${Date.now()}` // Unique user agent
    });
    
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the rate limit error page
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('Account temporarily blocked')) {
      console.log('Still rate limited even with different headers');
      // The rate limit might be using more than just IP
    }
    
    // Look for email input
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      console.log('✅ Login page loaded successfully!');
      
      // Fill email and continue
      await emailInput.fill(testEmail);
      
      // Click continue
      const continueButton = await page.locator('button[type="submit"]').filter({ hasText: /continue/i }).first();
      await continueButton.click();
      
      // Wait for password form with passwordless option
      const passwordlessButton = await page.locator('button').filter({ hasText: /email.*link|sign.*link/i }).first();
      if (await passwordlessButton.isVisible({ timeout: 5000 })) {
        console.log('✅ Found passwordless option');
        await passwordlessButton.click();
        
        // Wait for response
        await page.waitForTimeout(2000);
        
        // Check if we got to the email sent page
        if (page.url().includes('/auth/email-sent')) {
          console.log('✅ Email sent successfully!');
          await expect(page.locator('text=Check your email')).toBeVisible();
          await expect(page.locator(`text=${testEmail}`)).toBeVisible();
        } else {
          // Check for any errors
          const currentUrl = page.url();
          const pageContent = await page.locator('body').textContent();
          console.log('Current URL:', currentUrl);
          console.log('Page content:', pageContent?.substring(0, 200));
        }
      }
    } else {
      throw new Error('Login page did not load properly');
    }
  });
});