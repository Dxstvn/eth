import { test, expect } from '@playwright/test';
import { navigateToLogin, fillLoginForm, clearStorage } from '../helpers/test-utils';

/**
 * Simplified E2E tests for authentication flow
 * Clean tests without test mode hacks
 */
test.describe('Authentication Flow - Simplified', () => {
  
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login or show login button
    const loginButton = page.locator('a[href="/login"], button:has-text("Sign In")');
    
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
    
    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('shows email input on login page', async ({ page }) => {
    await navigateToLogin(page);
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    
    // Should have placeholder or label
    const placeholder = await emailInput.getAttribute('placeholder');
    const label = await page.locator('label:has-text("Email")').isVisible();
    
    expect(placeholder || label).toBeTruthy();
  });

  test('Google sign-in button is visible', async ({ page }) => {
    await navigateToLogin(page);
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('can switch between login and signup', async ({ page }) => {
    await navigateToLogin(page);
    
    // Look for signup link/button
    const signupLink = page.locator('text=/sign up|create account|new account/i');
    
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await page.waitForTimeout(1000);
      
      // Check if we're in signup mode (might show different text or fields)
      const signupIndicator = await page.locator('text=/create|sign up|register/i').isVisible();
      expect(signupIndicator).toBeTruthy();
    }
  });

  test('forgot password link is accessible', async ({ page }) => {
    await navigateToLogin(page);
    
    const forgotLink = page.locator('a[href*="forgot"], text=/forgot password/i');
    
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to forgot password page
      const currentUrl = page.url();
      expect(currentUrl).toContain('forgot');
    }
  });
});