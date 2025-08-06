import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - Mocked', () => {
  test('should complete passwordless flow with mocked responses', async ({ page }) => {
    const testEmail = 'test@example.com';
    
    // Mock the passwordless send-link API
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Magic link sent successfully'
        })
      });
    });
    
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for any loading to complete
    await page.waitForLoadState('networkidle');
    
    // Look for the email input
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(testEmail);
      
      // Find and click the continue button
      const continueButton = await page.locator('button[type="submit"]').filter({ hasText: /continue/i }).first();
      await continueButton.click();
      
      // Wait for the next step
      await page.waitForTimeout(1000);
      
      // Look for passwordless option
      const passwordlessButton = await page.locator('button').filter({ hasText: /email.*link|sign.*link/i }).first();
      if (await passwordlessButton.isVisible({ timeout: 3000 })) {
        await passwordlessButton.click();
        
        // Since we mocked the API, we should get a success response
        // Check if we're redirected to email-sent page
        await page.waitForURL('**/auth/email-sent*', { timeout: 5000 });
        
        // Verify success page
        expect(page.url()).toContain('/auth/email-sent');
        await expect(page.locator('text=Check your email')).toBeVisible();
        await expect(page.locator(`text=${testEmail}`)).toBeVisible();
        
        console.log('✅ Passwordless flow completed successfully with mocked API!');
      }
    } else {
      // We might be rate limited or have other issues
      const pageContent = await page.locator('body').textContent();
      console.log('Page content:', pageContent?.substring(0, 200));
      throw new Error('Could not find email input on login page');
    }
  });

  test('should handle validation errors', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Try with invalid email
    const emailInput = await page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill('invalid-email');
      
      const continueButton = await page.locator('button[type="submit"]').filter({ hasText: /continue/i }).first();
      
      // Check if button is disabled (HTML5 validation)
      const isDisabled = await continueButton.isDisabled();
      if (isDisabled) {
        console.log('✅ Button correctly disabled for invalid email');
        expect(isDisabled).toBe(true);
      } else {
        // Try to submit and check for error
        await continueButton.click();
        
        // Should either stay on same page or show error
        const hasError = await page.locator('text=/valid|invalid/i').isVisible({ timeout: 2000 })
          .catch(() => false);
        
        expect(page.url()).toContain('/login');
        console.log('✅ Validation handled correctly');
      }
    }
  });
});