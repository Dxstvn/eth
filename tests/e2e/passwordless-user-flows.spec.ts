import { test, expect, Page, BrowserContext } from '@playwright/test';
import { interceptAPIForLocalTesting } from './helpers/api-interceptor';

// Helper to simulate email client
async function simulateEmailClient(context: BrowserContext, signInUrl: string) {
  const emailPage = await context.newPage();
  await emailPage.goto(signInUrl);
  return emailPage;
}

// Helper to setup authenticated state
async function setupAuthenticatedUser(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('clearhold_auth_token', 'mock-jwt-token');
    localStorage.setItem('clearhold_user', JSON.stringify({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    }));
  });
}

test.describe('Passwordless Authentication - Real User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API interception to use localhost:3000
    await interceptAPIForLocalTesting(page);
    
    // Navigate to a page first to establish context
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  });
  test('complete flow: new user registration', async ({ page, context }) => {
    // Mock APIs for new user flow
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          success: true,
          link: 'http://localhost:3000/auth/email-action?mode=signIn&oobCode=new-user-code'
        })
      });
    });

    await page.route('**/api/auth/passwordless/verify-token', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          token: 'new-user-jwt',
          user: {
            uid: 'new-user-123',
            email: 'newuser@example.com',
            emailVerified: true
          },
          isNewUser: true
        })
      });
    });

    // 1. User visits login page
    await page.goto('/login');
    
    // 2. Enters email
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.click('button:has-text("Continue")');
    
    // 3. Chooses passwordless
    await page.click('button:has-text("Email me a secure link")');
    
    // 4. Sees confirmation
    await page.waitForURL('**/auth/email-sent*');
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // 5. Opens email link in new tab (simulated)
    const emailPage = await simulateEmailClient(
      context, 
      'http://localhost:3000/auth/email-action?mode=signIn&oobCode=new-user-code'
    );
    
    // 6. Completes sign-in
    await expect(emailPage.locator('text=Sign In Successful!')).toBeVisible();
    
    // 7. Should redirect to onboarding for new users
    await emailPage.waitForURL('**/onboarding/welcome', { timeout: 5000 });
  });

  test('complete flow: returning user on same device', async ({ page }) => {
    // Store email to simulate same device
    await page.evaluate(() => {
      localStorage.setItem('clearhold_email_for_signin', 'returning@example.com');
    });

    // Mock successful verification
    await page.route('**/api/auth/passwordless/verify-token', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          token: 'returning-user-jwt',
          user: {
            uid: 'returning-123',
            email: 'returning@example.com',
            emailVerified: true
          },
          isNewUser: false
        })
      });
    });

    // User clicks email link
    await page.goto('/auth/email-action?mode=signIn&oobCode=returning-user-code');
    
    // Should auto-verify without asking for email
    await expect(page.locator('text=Verifying your sign-in link')).toBeVisible();
    
    // Should show success
    await expect(page.locator('text=Sign In Successful!')).toBeVisible();
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('complete flow: cross-device authentication', async ({ browser }) => {
    // Create two contexts to simulate different devices
    const mobileContext = await browser.newContext({
      ...browser.contexts()[0]._options,
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    });
    const desktopContext = await browser.newContext();

    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();

    try {
      // 1. User starts on mobile
      await mobilePage.goto('/login');
      await mobilePage.fill('input[type="email"]', 'crossdevice@example.com');
      await mobilePage.click('button:has-text("Continue")');
      await mobilePage.click('button:has-text("Email me a secure link")');
      
      // 2. Email sent confirmation on mobile
      await mobilePage.waitForURL('**/auth/email-sent*');
      
      // 3. User opens link on desktop (different context = no stored email)
      await desktopPage.goto('/auth/email-action?mode=signIn&oobCode=cross-device-code');
      
      // 4. Should ask for email on desktop
      await expect(desktopPage.locator('text=Cross-Device Sign In')).toBeVisible();
      
      // 5. User enters email
      await desktopPage.fill('input[placeholder="you@example.com"]', 'crossdevice@example.com');
      await desktopPage.click('button:has-text("Complete Sign In")');
      
      // 6. Should complete sign-in on desktop
      await expect(desktopPage.locator('text=Sign In Successful!')).toBeVisible();
    } finally {
      await mobileContext.close();
      await desktopContext.close();
    }
  });

  test('user flow: switching from password to passwordless', async ({ page }) => {
    await page.goto('/login');
    
    // Start with email
    await page.fill('input[type="email"]', 'switcher@example.com');
    await page.click('button:has-text("Continue")');
    
    // Initially choose password
    await page.click('button:has-text("Enter your password")');
    
    // Realize they forgot password, go back
    await page.click('button:has-text("Back")');
    
    // Choose passwordless instead
    await page.click('button:has-text("Email me a secure link")');
    
    // Should proceed with passwordless flow
    await page.waitForURL('**/auth/email-sent*');
    await expect(page.locator('text=switcher@example.com')).toBeVisible();
  });

  test('user flow: handling interruptions', async ({ page }) => {
    // User starts sign-in process
    await page.goto('/login');
    await page.fill('input[type="email"]', 'interrupted@example.com');
    await page.click('button:has-text("Continue")');
    
    // Gets interrupted, navigates away
    await page.goto('/');
    
    // Comes back to login
    await page.goto('/login');
    
    // Email should be preserved
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('interrupted@example.com');
    
    // Can continue where they left off
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=How would you like to sign in?')).toBeVisible();
  });

  test('user flow: expired link recovery', async ({ page }) => {
    // Mock expired link
    await page.route('**/api/auth/passwordless/verify-token', async route => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'This sign-in link has expired.',
          code: 'auth/expired-action-code'
        })
      });
    });

    // User clicks expired link
    await page.goto('/auth/email-action?mode=signIn&oobCode=expired-code');
    
    // Enters email if needed
    const emailInput = page.locator('input[placeholder="you@example.com"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('expired@example.com');
      await page.click('button:has-text("Complete Sign In")');
    }
    
    // Sees expired error
    await expect(page.locator('text=Link Expired')).toBeVisible();
    
    // Clicks request new link
    await page.click('button:has-text("Request New Link")');
    
    // Should be back at login with email preserved
    await expect(page).toHaveURL('/login');
    await expect(page.locator('input[type="email"]')).toHaveValue('expired@example.com');
  });

  test('user flow: multiple tabs behavior', async ({ context }) => {
    // User has multiple tabs open
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    
    // Mock successful auth
    const mockAuth = async (page: Page) => {
      await page.route('**/api/users/profile', async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            uid: 'multi-tab-user',
            email: 'multitab@example.com',
            displayName: 'Multi Tab User'
          })
        });
      });
    };
    
    await mockAuth(tab1);
    await mockAuth(tab2);
    
    // Start login on tab1
    await tab1.goto('/login');
    await setupAuthenticatedUser(tab1);
    
    // Navigate to dashboard
    await tab1.goto('/dashboard');
    
    // Tab2 should also be authenticated (shared localStorage)
    await tab2.goto('/dashboard');
    
    // Both tabs should show authenticated state
    const checkAuth = async (page: Page) => {
      const authToken = await page.evaluate(() => 
        localStorage.getItem('clearhold_auth_token')
      );
      expect(authToken).toBeTruthy();
    };
    
    await checkAuth(tab1);
    await checkAuth(tab2);
  });

  test('user flow: remember me functionality', async ({ page }) => {
    // Complete sign-in with "remember me" equivalent (persistent token)
    await setupAuthenticatedUser(page);
    
    // Close and reopen browser (simulated by clearing session storage but keeping localStorage)
    await page.evaluate(() => {
      sessionStorage.clear();
    });
    
    // Navigate to protected page
    await page.goto('/dashboard');
    
    // Should still be authenticated
    const authToken = await page.evaluate(() => 
      localStorage.getItem('clearhold_auth_token')
    );
    expect(authToken).toBeTruthy();
    
    // Should not redirect to login
    expect(page.url()).toContain('/dashboard');
  });

  test('user flow: deep link after authentication', async ({ page }) => {
    const targetUrl = '/transactions/new?amount=1000&currency=USD';
    
    // User tries to access protected page
    await page.goto(targetUrl);
    
    // Should redirect to login (assuming middleware redirects)
    await page.waitForURL('**/login*');
    
    // Complete passwordless sign-in
    await page.fill('input[type="email"]', 'deeplink@example.com');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Email me a secure link")');
    
    // After successful auth, should redirect to original target
    // (This would be implemented in the actual auth flow)
    // For now, we verify the redirect parameter is preserved
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect') || url.searchParams.get('from')).toBeTruthy();
  });
});

test.describe('Passwordless Authentication - Error Recovery', () => {
  test('graceful degradation when JavaScript fails', async ({ page }) => {
    // Disable JavaScript
    await page.setJavaScriptEnabled(false);
    
    await page.goto('/login');
    
    // Form should still be visible and functional
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Should have proper form action for no-JS fallback
    const form = page.locator('form').first();
    const action = await form.getAttribute('action');
    expect(action).toBeTruthy();
  });

  test('handling browser back/forward navigation', async ({ page }) => {
    // Navigate through the flow
    await page.goto('/login');
    await page.fill('input[type="email"]', 'navigation@example.com');
    await page.click('button:has-text("Continue")');
    
    // Go back
    await page.goBack();
    
    // Email should still be there
    await expect(page.locator('input[type="email"]')).toHaveValue('navigation@example.com');
    
    // Go forward
    await page.goForward();
    
    // Should be back at auth method selection
    await expect(page.locator('text=How would you like to sign in?')).toBeVisible();
  });

  test('recovery from network failures', async ({ page }) => {
    let attemptCount = 0;
    
    // First attempt fails, second succeeds
    await page.route('**/api/auth/passwordless/send-link', async route => {
      attemptCount++;
      if (attemptCount === 1) {
        await route.abort('failed');
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'retry@example.com');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Email me a secure link")');
    
    // First attempt fails
    await expect(page.locator('text=Failed to send sign-in link')).toBeVisible();
    
    // User retries
    await page.click('button:has-text("Try again")');
    
    // Second attempt succeeds
    await page.waitForURL('**/auth/email-sent*');
    await expect(page.locator('text=Check your email')).toBeVisible();
  });
});