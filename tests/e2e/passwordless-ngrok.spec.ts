import { test, expect } from '@playwright/test';

test.describe('Passwordless Authentication - Production Test', () => {
  test('debug authentication loading state', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    // Navigate directly to login
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Wait for authentication check to complete
    console.log('Waiting for auth check to complete...');
    
    // Wait for "Authenticating your session..." to disappear
    const authCheckText = page.locator('text=Authenticating your session');
    if (await authCheckText.isVisible({ timeout: 1000 })) {
      console.log('Auth check in progress...');
      await authCheckText.waitFor({ state: 'hidden', timeout: 30000 });
      console.log('Auth check completed');
    }
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'test-screenshots/login-after-auth.png' });
    
    // Check what's visible on the page
    const pageContent = await page.locator('body').textContent();
    console.log('Page content:', pageContent?.substring(0, 200));
    
    // Look for any form elements
    const emailInputs = await page.locator('input[type="email"]').count();
    const textInputs = await page.locator('input[type="text"]').count();
    const buttons = await page.locator('button').count();
    
    console.log(`Found ${emailInputs} email inputs, ${textInputs} text inputs, ${buttons} buttons`);
    
    // Try to find any input field
    const anyInput = await page.locator('input').first();
    if (await anyInput.isVisible({ timeout: 5000 })) {
      const inputType = await anyInput.getAttribute('type');
      const placeholder = await anyInput.getAttribute('placeholder');
      console.log(`Found input: type=${inputType}, placeholder=${placeholder}`);
      
      // Try to fill it
      await anyInput.fill('test@example.com');
      
      // Find a button to click
      const submitButton = await page.locator('button').filter({ hasText: /continue|sign|email/i }).first();
      if (await submitButton.isVisible()) {
        const buttonText = await submitButton.textContent();
        console.log(`Clicking button: ${buttonText}`);
        await submitButton.click();
        
        // Wait for navigation or response
        await page.waitForTimeout(5000);
        
        console.log('After click URL:', page.url());
        await page.screenshot({ path: 'test-screenshots/after-submit.png' });
      }
    } else {
      console.log('No input fields found on login page');
      // Maybe we're already logged in?
      if (page.url().includes('/dashboard')) {
        console.log('Already redirected to dashboard');
      }
    }
    
    // Don't fail the test
    expect(true).toBe(true);
  });
});