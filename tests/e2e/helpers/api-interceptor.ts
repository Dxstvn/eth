import { Page } from '@playwright/test';

/**
 * Intercepts API calls and redirects them to localhost:3000 for E2E testing
 * This allows us to test the production frontend while using the local backend
 */
export async function interceptAPIForLocalTesting(page: Page) {
  // Intercept all API calls to the ngrok URL and redirect to localhost
  await page.route('**/1f2561dafffa.ngrok-free.app/**', async (route) => {
    // Get the original URL
    const url = new URL(route.request().url());
    
    // Replace the ngrok domain with localhost:3000
    const localUrl = url.href.replace('https://1f2561dafffa.ngrok-free.app', 'http://localhost:3000');
    
    // Fetch from localhost instead
    const response = await fetch(localUrl, {
      method: route.request().method(),
      headers: {
        ...Object.fromEntries(route.request().headers()),
        // Remove ngrok-specific headers
        'ngrok-skip-browser-warning': undefined,
        'x-ngrok-skip-browser-warning': undefined,
      },
      body: route.request().postData(),
    });
    
    // Get response body
    const body = await response.text();
    
    // Fulfill the request with the local backend response
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: body,
    });
  });
  
  // Also intercept any requests to the production API URL if it's different
  await page.route('**/api.clearhold.app/**', async (route) => {
    const url = new URL(route.request().url());
    const localUrl = url.href.replace(/https?:\/\/api\.clearhold\.app/, 'http://localhost:3000');
    
    const response = await fetch(localUrl, {
      method: route.request().method(),
      headers: Object.fromEntries(route.request().headers()),
      body: route.request().postData(),
    });
    
    const body = await response.text();
    
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: body,
    });
  });
}

/**
 * Mock specific API endpoints for testing
 */
export async function mockPasswordlessAPI(page: Page) {
  // First set up API interception to use localhost
  await interceptAPIForLocalTesting(page);
  
  // Then you can add specific mocks if needed
  // For example, to mock email sending without actually sending emails:
  await page.route('**/localhost:3000/api/auth/passwordless/send-link', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Sign-in link sent successfully'
      })
    });
  });
}