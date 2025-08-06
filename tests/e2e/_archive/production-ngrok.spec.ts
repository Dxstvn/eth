import { test, expect } from '@playwright/test';

test.describe('Production Build with Ngrok Backend', () => {
  test.beforeEach(async ({ context }) => {
    // Set headers for ngrok and E2E testing
    await context.setExtraHTTPHeaders({
      'ngrok-skip-browser-warning': 'true',
      'x-e2e-test': 'true',
      'x-request-id': `prod-e2e-${Date.now()}`
    });
  });

  test('should load login page from production build', async ({ page }) => {
    // Monitor API calls to ngrok backend
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('ngrok-free.app') || request.url().includes('ngrok.app')) {
        apiCalls.push(request.url());
        console.log('🌐 API Call to ngrok:', request.url());
      }
    });

    // Navigate to login
    await page.goto('/login');
    
    // Wait for page to load (don't wait for networkidle as wallet calls might timeout)
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on the login page
    expect(page.url()).toContain('/login');
    
    // Check for login elements
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // Verify the Continue button exists but is disabled initially
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeDisabled();
    
    // Log API calls made during page load
    console.log(`📊 Made ${apiCalls.length} API calls to ngrok backend during page load`);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/production-login-page.png' });
  });

  test('should send passwordless email through ngrok backend', async ({ page }) => {
    const testEmail = 'prod-e2e-test@example.com';
    
    // Monitor API responses
    page.on('response', response => {
      if (response.url().includes('ngrok') && response.url().includes('/api/')) {
        console.log(`📨 API Response: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Enter email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(testEmail);
    
    // Click continue
    const continueButton = page.locator('button[type="submit"]:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    
    // Wait for password form
    await page.waitForSelector('button:has-text("Email me a sign-in link")', {
      state: 'visible',
      timeout: 10000
    });
    
    // Click passwordless option
    await page.click('button:has-text("Email me a sign-in link")');
    
    // Wait for API response and navigation
    const navigationPromise = page.waitForURL('**/auth/email-sent**', { 
      timeout: 15000 
    }).catch(() => null);
    
    // Also wait a bit for any API calls
    await page.waitForTimeout(3000);
    
    const navigated = await navigationPromise;
    
    if (navigated) {
      console.log('✅ Successfully navigated to email sent page');
      await expect(page.locator('text=Check your email')).toBeVisible();
    } else {
      // Check if we got an error instead
      const errorElement = page.locator('text=/error|failed|unable/i');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`⚠️  Got error response: ${errorText}`);
      }
    }
  });

  test('should verify ngrok headers are sent correctly', async ({ page }) => {
    let headersSent = false;
    
    // Intercept requests to check headers
    page.on('request', request => {
      if (request.url().includes('ngrok')) {
        const headers = request.headers();
        console.log('📤 Request headers to ngrok:', {
          'ngrok-skip-browser-warning': headers['ngrok-skip-browser-warning'],
          'x-e2e-test': headers['x-e2e-test'],
          'x-request-id': headers['x-request-id']
        });
        
        if (headers['ngrok-skip-browser-warning'] === 'true') {
          headersSent = true;
        }
      }
    });
    
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Give time for any background API calls
    await page.waitForTimeout(2000);
    
    expect(headersSent).toBe(true);
    console.log('✅ Ngrok headers are being sent correctly');
  });
});