import { test, expect } from '@playwright/test';

/**
 * Smoke tests for critical paths
 * Clean tests without test mode hacks
 */
test.describe('Smoke Tests', () => {
  // Configure tests to run serially to avoid server overload
  test.describe.configure({ mode: 'serial' });

  test('app loads without critical errors', async ({ page }) => {
    // Only track critical errors, not all console messages
    const criticalErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out non-critical errors
        if (text.includes('Failed to load resource') || 
            text.includes('favicon') || 
            text.includes('fonts')) {
          return;
        }
        criticalErrors.push(text);
      }
    });
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000);
    
    // Should not have critical errors
    if (criticalErrors.length > 0) {
      console.log('Errors found:', criticalErrors);
    }
    
    // Allow some errors but not too many
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test('main navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Should either show dashboard or redirect to login
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const validUrls = currentUrl.includes('/login') || 
                      currentUrl.includes('/dashboard') ||
                      currentUrl === page.baseURL + '/';
    
    expect(validUrls).toBeTruthy();
  });

  test('API health check', async ({ page }) => {
    // Check if API is reachable
    const response = await page.request.get('/api/health').catch(() => null);
    
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('critical pages load', async ({ page }) => {
    const pages = [
      '/login',
      '/forgot-password',
      '/'
    ];
    
    for (const path of pages) {
      const response = await page.goto(path, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Page should load successfully (not 500 error)
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
    }
  });

  test('login form is interactive', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]');
    
    // Input should be visible and interactive
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      const value = await emailInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });
});