import { test, expect } from '@playwright/test';

test.describe('Debug Chromium Loading Issue', () => {
  test('check auth loading state', async ({ page }) => {
    // Add console log listener
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log(`Browser error:`, error.message);
    });

    // Navigate to login with debug
    console.log('Navigating to /login...');
    await page.goto('/login', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-screenshots/chromium-login-debug.png' });
    
    // Check what's visible
    const loadingScreen = await page.locator('text="Authenticating your session"').isVisible().catch(() => false);
    const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
    
    console.log('Loading screen visible:', loadingScreen);
    console.log('Email input visible:', emailInput);
    
    // If loading screen is visible, wait for it to disappear
    if (loadingScreen) {
      console.log('Waiting for loading screen to disappear...');
      try {
        await page.waitForSelector('text="Authenticating your session"', { 
          state: 'hidden',
          timeout: 5000 
        });
        console.log('Loading screen disappeared');
      } catch (e) {
        console.log('Loading screen still visible after 5 seconds');
        
        // Check localStorage for auth state
        const authState = await page.evaluate(() => {
          return {
            localStorage: Object.keys(localStorage),
            authToken: localStorage.getItem('clearhold_auth_token'),
            userProfile: localStorage.getItem('clearhold_user_profile')
          };
        });
        console.log('Auth state in browser:', authState);
      }
    }
    
    // Final check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('check auth context initialization', async ({ page }) => {
    // Clear all storage first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to login
    await page.goto('/login');
    
    // Wait a bit for React to initialize
    await page.waitForTimeout(1000);
    
    // Check React component state
    const authState = await page.evaluate(() => {
      // Try to access React fiber to check component state
      const rootElement = document.getElementById('__next');
      if (rootElement && (rootElement as any)._reactRootContainer) {
        return 'React root found';
      }
      return 'React root not found';
    });
    
    console.log('React state:', authState);
    
    // Check for hydration errors
    const hydrationError = await page.evaluate(() => {
      const errors = document.querySelector('[data-nextjs-dialog]');
      return errors ? errors.textContent : null;
    });
    
    if (hydrationError) {
      console.log('Hydration error found:', hydrationError);
    }
    
    // Final assertion
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});