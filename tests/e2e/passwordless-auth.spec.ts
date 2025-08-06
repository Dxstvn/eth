import { test, expect, Page } from '@playwright/test';
import { interceptAPIForLocalTesting } from './helpers/api-interceptor';

// Helper function to set up API interception for tests
async function setupAPIInterception(page: Page) {
  // Redirect all API calls to localhost:3000 for testing
  await interceptAPIForLocalTesting(page);
}

test.describe('Passwordless Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API interception to use localhost:3000
    await setupAPIInterception(page);
    
    // Navigate to a page first to establish context
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should complete passwordless sign-in flow', async ({ page }) => {

    // Navigate to login page
    await page.goto('/login');
    
    // Enter email
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Click continue button
    await page.click('button:has-text("Continue")');
    
    // Should see the auth method selection
    await expect(page.locator('text=How would you like to sign in?')).toBeVisible();
    
    // Click on passwordless option
    await page.click('button:has-text("Email me a secure link")');
    
    // Should be redirected to email-sent page
    await page.waitForURL('**/auth/email-sent*');
    
    // Verify success message
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('text=We\'ve sent a secure sign-in link')).toBeVisible();
  });

  test('should handle email validation errors', async ({ page }) => {
    await page.goto('/login');
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    
    // Click continue
    await page.click('button:has-text("Continue")');
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too many attempts. Please try again later.'
        })
      });
    });

    await page.goto('/login');
    
    // Enter email and continue
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Continue")');
    
    // Select passwordless
    await page.click('button:has-text("Email me a secure link")');
    
    // Should show rate limit error
    await expect(page.locator('text=Too many attempts')).toBeVisible();
  });

  test('should handle cross-device authentication', async ({ page }) => {
    // Clear stored email to simulate cross-device flow
    await page.evaluate(() => localStorage.removeItem('clearhold_email_for_signin'));
    
    // Navigate directly to email action page with mock parameters
    await page.goto('/auth/email-action?mode=signIn&oobCode=mock-code&apiKey=mock-key');
    
    // Should show cross-device sign-in form
    await expect(page.locator('text=Cross-Device Sign In')).toBeVisible();
    await expect(page.locator('text=It looks like you\'re signing in from a different device')).toBeVisible();
    
    // Enter email
    await page.fill('input[placeholder="you@example.com"]', 'test@example.com');
    
    // Click complete sign-in
    await page.click('button:has-text("Complete Sign In")');
    
    // Should show success message (mocked)
    await expect(page.locator('text=Sign In Successful!')).toBeVisible();
  });

  test('should handle expired link error', async ({ page }) => {
    // Mock expired link error
    await page.route('**/api/auth/passwordless/verify-token', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This sign-in link has expired or has already been used.'
        })
      });
    });

    await page.goto('/auth/email-action?mode=signIn&oobCode=expired-code');
    
    // Enter email if needed
    const emailInput = page.locator('input[placeholder="you@example.com"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.click('button:has-text("Complete Sign In")');
    }
    
    // Should show expired link error
    await expect(page.locator('text=Link Expired')).toBeVisible();
    await expect(page.locator('text=This sign-in link has expired')).toBeVisible();
    
    // Should have option to request new link
    await expect(page.locator('button:has-text("Request New Link")')).toBeVisible();
  });

  test('should handle invalid link', async ({ page }) => {
    // Navigate with invalid link format
    await page.goto('/auth/email-action?invalid=true');
    
    // Should show invalid link error
    await expect(page.locator('text=Invalid Sign-in Link')).toBeVisible();
    await expect(page.locator('text=This link is not valid')).toBeVisible();
    
    // Should have back to login option
    await expect(page.locator('button:has-text("Back to Login")')).toBeVisible();
  });

  test('should navigate back from email-sent page', async ({ page }) => {
    await page.goto('/auth/email-sent?email=test@example.com');
    
    // Click back to login
    await page.click('text=Back to login');
    
    // Should be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should show device verification info', async ({ page }) => {
    await page.goto('/auth/email-action?mode=signIn&oobCode=mock-code');
    
    // Should show device verification card
    await expect(page.locator('text=Device Verification')).toBeVisible();
    await expect(page.locator('text=Confirming your device for secure sign-in')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.abort('failed');
    });

    await page.goto('/login');
    
    // Enter email and continue
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Continue")');
    
    // Select passwordless
    await page.click('button:has-text("Email me a secure link")');
    
    // Should show generic error
    await expect(page.locator('text=Failed to send sign-in link')).toBeVisible();
  });

  test('should preserve email across navigation', async ({ page }) => {

    await page.goto('/login');
    
    // Enter email
    const testEmail = 'preserve@example.com';
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Continue")');
    
    // Select passwordless
    await page.click('button:has-text("Email me a secure link")');
    
    // Check email is shown on success page
    await page.waitForURL('**/auth/email-sent*');
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });
});

test.describe('Passwordless Authentication - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile devices', async ({ page }) => {

    await page.goto('/login');
    
    // Enter email
    await page.fill('input[type="email"]', 'mobile@example.com');
    await page.click('button:has-text("Continue")');
    
    // Auth method selection should be mobile-friendly
    await expect(page.locator('text=How would you like to sign in?')).toBeVisible();
    
    // Click passwordless option
    await page.click('button:has-text("Email me a secure link")');
    
    // Should redirect to email-sent page
    await page.waitForURL('**/auth/email-sent*');
    
    // Check mobile layout
    await expect(page.locator('.max-w-lg')).toBeVisible();
  });

  test('should show mobile-optimized error states', async ({ page }) => {
    await page.goto('/auth/email-action?invalid=true');
    
    // Error card should be mobile-optimized
    const errorCard = page.locator('.max-w-md');
    await expect(errorCard).toBeVisible();
    
    // Check responsive padding
    const cardPadding = await errorCard.evaluate(el => 
      window.getComputedStyle(el).padding
    );
    expect(cardPadding).toBeTruthy();
  });
});

test.describe('Passwordless Authentication - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    
    // Tab to email input
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    // Type email
    await page.keyboard.type('keyboard@example.com');
    
    // Tab to continue button
    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Continue")')).toBeFocused();
    
    // Press Enter to submit
    await page.keyboard.press('Enter');
    
    // Should show auth methods
    await expect(page.locator('text=How would you like to sign in?')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/login');
    
    // Check form has proper labels
    const emailInput = page.locator('input[type="email"]');
    const label = await emailInput.getAttribute('aria-label') || 
                 await page.locator('label[for="email"]').textContent();
    expect(label).toContain('email');
    
    // Check buttons have accessible text
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toHaveAttribute('type', 'submit');
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/login');
    
    // Submit invalid email
    await page.fill('input[type="email"]', 'invalid');
    await page.click('button:has-text("Continue")');
    
    // Error should be in an alert role
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toContainText('valid email');
  });
});