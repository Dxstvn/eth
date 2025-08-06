import { test, expect } from '@playwright/test';
import { 
  clearEmulatorEmails, 
  waitForEmail, 
  extractMagicLink,
  getFirestoreUser 
} from './helpers/firebase-emulator';

test.describe('Passwordless Authentication - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing emails in the emulator
    await clearEmulatorEmails();
    
    // Navigate to a page first to establish context
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('complete passwordless flow with Firebase emulators', async ({ page, context }) => {
    const testEmail = 'complete-flow-test@example.com';
    
    // Step 1: Navigate to login page
    await page.goto('/login');
    
    // The login page shows two different flows based on state
    // First, check if we're in the email-only flow or two-step flow
    const isPasswordlessDirectFlow = await page.locator('text=Enter your email to receive a secure sign-in link').isVisible({ timeout: 3000 })
      .catch(() => false);
    
    if (isPasswordlessDirectFlow) {
      // Direct passwordless flow
      await page.fill('input[placeholder="Email address"]', testEmail);
      await page.click('button:has-text("Continue with Email")');
    } else {
      // Two-step flow: email first, then choose auth method
      await page.fill('input[type="email"]', testEmail);
      await page.click('button:has-text("Continue")');
      
      // Wait for password form and choose passwordless
      await page.waitForSelector('button:has-text("Email me a sign-in link")', { timeout: 5000 });
      await page.click('button:has-text("Email me a sign-in link")');
    }
    
    // Step 2: Verify we're redirected to email sent page
    await page.waitForURL('**/auth/email-sent*', { timeout: 10000 });
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    
    // Step 4: Wait for and retrieve the email from Firebase emulator
    console.log('Waiting for email to be sent...');
    const email = await waitForEmail(testEmail, 15000);
    
    if (!email) {
      throw new Error('Email was not sent within timeout period');
    }
    
    // Step 5: Extract the magic link from the email
    const magicLink = extractMagicLink(email.body || email.html || '');
    if (!magicLink) {
      throw new Error('Could not find magic link in email');
    }
    
    console.log('Magic link found:', magicLink);
    
    // Step 6: Open the magic link in a new tab (simulating user clicking email)
    const emailPage = await context.newPage();
    await emailPage.goto(magicLink);
    
    // Step 7: Handle the email action page
    // The page might ask for email confirmation if it's a different device
    const needsEmailConfirmation = await emailPage.locator('text=Cross-Device Sign In').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (needsEmailConfirmation) {
      // Enter email to confirm
      await emailPage.fill('input[placeholder="you@example.com"]', testEmail);
      await emailPage.click('button:has-text("Complete Sign In")');
    }
    
    // Step 8: Verify successful authentication
    await expect(emailPage.locator('text=Sign In Successful!')).toBeVisible({ timeout: 10000 });
    
    // Step 9: Should redirect to dashboard
    await emailPage.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Step 10: Verify user is authenticated
    const authToken = await emailPage.evaluate(() => localStorage.getItem('clearhold_auth_token'));
    expect(authToken).toBeTruthy();
    
    // Step 11: Verify user data in Firestore emulator (optional)
    const userData = await emailPage.evaluate(() => {
      const userStr = localStorage.getItem('clearhold_user');
      return userStr ? JSON.parse(userStr) : null;
    });
    
    expect(userData).toBeTruthy();
    expect(userData.email).toBe(testEmail);
    
    // Clean up
    await emailPage.close();
  });

  test('cross-device authentication with real backend', async ({ browser }) => {
    const testEmail = 'cross-device-test@example.com';
    
    // Create two different browser contexts to simulate different devices
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });
    const desktopContext = await browser.newContext();
    
    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();
    
    try {
      // No API interception needed - using ngrok directly
      
      // Step 1: Start sign-in on mobile
      await mobilePage.goto('/login');
      await mobilePage.fill('input[type="email"]', testEmail);
      await mobilePage.click('button:has-text("Continue")');
      await mobilePage.waitForSelector('button:has-text("Email me a sign-in link")');
      await mobilePage.click('button:has-text("Email me a sign-in link")');
      
      // Step 2: Verify email sent page on mobile
      await mobilePage.waitForURL('**/auth/email-sent*');
      
      // Step 3: Wait for email
      const email = await waitForEmail(testEmail, 15000);
      if (!email) throw new Error('Email not received');
      
      const magicLink = extractMagicLink(email.body || email.html || '');
      if (!magicLink) throw new Error('Magic link not found');
      
      // Step 4: Open link on desktop (different device)
      await desktopPage.goto(magicLink);
      
      // Step 5: Should show cross-device sign-in
      await expect(desktopPage.locator('text=Cross-Device Sign In')).toBeVisible();
      
      // Step 6: Enter email to confirm
      await desktopPage.fill('input[placeholder="you@example.com"]', testEmail);
      await desktopPage.click('button:has-text("Complete Sign In")');
      
      // Step 7: Verify successful authentication on desktop
      await expect(desktopPage.locator('text=Sign In Successful!')).toBeVisible();
      await desktopPage.waitForURL('**/dashboard');
      
      // Step 8: Mobile should still be on email sent page (not automatically signed in)
      expect(mobilePage.url()).toContain('/auth/email-sent');
      
    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('rate limiting with real backend', async ({ page }) => {
    // Clear emails first
    await clearEmulatorEmails();
    
    const baseEmail = 'ratelimit-test';
    let hitRateLimit = false;
    
    // Try to send multiple magic links quickly
    for (let i = 0; i < 10 && !hitRateLimit; i++) {
      await page.goto('/login');
      await page.fill('input[type="email"]', `${baseEmail}${i}@example.com`);
      await page.click('button:has-text("Continue")');
      
      // Wait for password form with passwordless option
      const hasPasswordlessOption = await page.waitForSelector('button:has-text("Email me a sign-in link")', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      
      if (hasPasswordlessOption) {
        await page.click('button:has-text("Email me a sign-in link")');
        
        // Check if we hit rate limit
        const hasError = await page.waitForSelector('text=/rate limit|too many/i', { timeout: 3000 })
          .then(() => true)
          .catch(() => false);
        
        if (hasError) {
          hitRateLimit = true;
          break;
        }
        
        // Otherwise wait for email sent page
        await page.waitForURL('**/auth/email-sent*', { timeout: 5000 }).catch(() => {});
      }
    }
    
    // Verify we eventually hit the rate limit
    expect(hitRateLimit).toBe(true);
  });
});