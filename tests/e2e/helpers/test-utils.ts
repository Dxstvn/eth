import { Page, expect } from '@playwright/test';

/**
 * Simple, clean test utilities without test mode hacks
 */

/**
 * Navigate to login page and wait for it to be ready
 */
export async function navigateToLogin(page: Page) {
  await page.goto('/login', { 
    waitUntil: 'networkidle',
    timeout: 15000 
  });
  
  // Wait for the email input to be visible and ready
  await page.waitForSelector('input[type="email"]', { 
    state: 'visible',
    timeout: 10000 
  });
}

/**
 * Fill in login form
 */
export async function fillLoginForm(page: Page, email: string, password?: string) {
  await page.fill('input[type="email"]', email);
  
  if (password) {
    await page.fill('input[type="password"]', password);
  }
}

/**
 * Wait for navigation after login
 */
export async function waitForAuthRedirect(page: Page) {
  // Wait for either dashboard or auth selection page
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 10000 }),
    page.waitForURL('**/auth/**', { timeout: 10000 }),
    page.waitForSelector('text=/How would you like to sign in/i', { timeout: 10000 })
  ]).catch(() => {
    // If none match, just continue
  });
}

/**
 * Clear browser storage
 */
export async function clearStorage(page: Page) {
  // Clear storage with error handling for cross-origin restrictions
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {
      // Ignore localStorage errors (may be blocked for security reasons)
    }
    try {
      sessionStorage.clear();
    } catch (e) {
      // Ignore sessionStorage errors (may be blocked for security reasons)
    }
  }).catch(() => {
    // Ignore evaluation errors - storage may be restricted
  });
  
  // Clear cookies
  await page.context().clearCookies().catch(() => {
    // Ignore cookie clearing errors
  });
}

/**
 * Setup authenticated session (for tests that need auth)
 */
export async function setupAuthenticatedSession(page: Page) {
  // This would normally set cookies or localStorage with a valid token
  // For now, we'll need to do actual login flow or mock at API level
  await page.evaluate(() => {
    // Set a mock token if backend accepts it
    localStorage.setItem('clearhold_auth_token', 'test-token');
  });
}

// Re-export expect for convenience
export { expect };