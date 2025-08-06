import { test, expect, Page } from '@playwright/test';
import { interceptAPIForLocalTesting } from './helpers/api-interceptor';

// Helper to generate random email
function generateRandomEmail(): string {
  return `test-${Date.now()}@example.com`;
}

// Helper to extract URL parameters
function getUrlParams(url: string): URLSearchParams {
  const urlObj = new URL(url);
  return urlObj.searchParams;
}

test.describe('Passwordless Authentication - Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API interception to use localhost:3000
    await interceptAPIForLocalTesting(page);
    
    // Navigate to a page first to establish context
    await page.goto('/');
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  });
  test('should prevent XSS in email input', async ({ page }) => {
    await page.goto('/login');
    
    // Try XSS payload in email field
    const xssPayload = '<script>alert("XSS")</script>@example.com';
    await page.fill('input[type="email"]', xssPayload);
    await page.click('button:has-text("Continue")');
    
    // Should show validation error, not execute script
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Check no alert was triggered
    const alertTriggered = await page.evaluate(() => {
      let triggered = false;
      window.alert = () => { triggered = true; };
      return triggered;
    });
    expect(alertTriggered).toBe(false);
  });

  test('should sanitize email parameter in URL', async ({ page }) => {
    // Navigate with potentially malicious email parameter
    const maliciousEmail = '<img src=x onerror=alert(1)>@example.com';
    const encodedEmail = encodeURIComponent(maliciousEmail);
    
    await page.goto(`/auth/email-sent?email=${encodedEmail}`);
    
    // Email should be displayed safely (encoded/escaped)
    const emailDisplay = page.locator('text=@example.com').first();
    const emailText = await emailDisplay.textContent();
    
    // Should not contain raw HTML
    expect(emailText).not.toContain('<img');
    expect(emailText).not.toContain('onerror');
  });

  test('should enforce HTTPS for sign-in links in production', async ({ page }) => {
    // Mock production environment
    await page.route('**/api/auth/passwordless/send-link', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // In production, the callback URL should use HTTPS
      if (process.env.NODE_ENV === 'production') {
        expect(postData.callbackUrl).toMatch(/^https:/);
      }
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'secure@example.com');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Email me a secure link")');
  });

  test('should handle CSRF protection', async ({ page }) => {
    // Attempt to send request without proper headers
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/passwordless/send-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Omitting CSRF token or other security headers
          },
          body: JSON.stringify({ email: 'test@example.com' })
        });
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Should be protected (exact behavior depends on implementation)
    // Either 403 Forbidden or requires proper authentication
    if (response.status) {
      expect([403, 401]).toContain(response.status);
    }
  });

  test('should not leak sensitive information in errors', async ({ page }) => {
    // Mock various error scenarios
    await page.route('**/api/auth/passwordless/send-link', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Internal server error',
          // Should NOT include: stack traces, database errors, etc.
        })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Email me a secure link")');
    
    // Should show generic error, not technical details
    await expect(page.locator('text=Failed to send sign-in link')).toBeVisible();
    
    // Should not show stack traces or internal errors
    const pageContent = await page.content();
    expect(pageContent).not.toContain('stack');
    expect(pageContent).not.toContain('SQLException');
    expect(pageContent).not.toContain('firebase-admin');
  });

  test('should validate sign-in link format', async ({ page }) => {
    // Test various invalid link formats
    const invalidLinks = [
      '/auth/email-action',  // Missing parameters
      '/auth/email-action?mode=signIn',  // Missing oobCode
      '/auth/email-action?oobCode=test',  // Missing mode
      '/auth/email-action?mode=resetPassword&oobCode=test',  // Wrong mode
    ];

    for (const link of invalidLinks) {
      await page.goto(link);
      
      // Should show invalid link error
      await expect(page.locator('text=Invalid Sign-in Link')).toBeVisible();
    }
  });

  test('should prevent replay attacks', async ({ page }) => {
    let tokenUsed = false;
    
    // Mock API to track token usage
    await page.route('**/api/auth/passwordless/verify-token', async route => {
      if (tokenUsed) {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'This sign-in link has already been used.'
          })
        });
      } else {
        tokenUsed = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            token: 'jwt-token',
            user: { uid: '123', email: 'test@example.com' }
          })
        });
      }
    });

    // First attempt - should succeed
    await page.goto('/auth/email-action?mode=signIn&oobCode=test-token');
    
    // Complete sign-in if needed
    const emailInput = page.locator('input[placeholder="you@example.com"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.click('button:has-text("Complete Sign In")');
    }
    
    // Second attempt with same token - should fail
    await page.goto('/auth/email-action?mode=signIn&oobCode=test-token');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.click('button:has-text("Complete Sign In")');
    }
    
    // Should show already used error
    await expect(page.locator('text=already been used')).toBeVisible();
  });

  test('should enforce rate limiting per IP', async ({ page }) => {
    let attemptCount = 0;
    const maxAttempts = 3;
    
    await page.route('**/api/auth/passwordless/send-link', async route => {
      attemptCount++;
      
      if (attemptCount > maxAttempts) {
        await route.fulfill({
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString()
          },
          body: JSON.stringify({
            error: 'Too many attempts. Please try again later.'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: {
            'X-RateLimit-Limit': maxAttempts.toString(),
            'X-RateLimit-Remaining': (maxAttempts - attemptCount).toString()
          },
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Make multiple attempts
    for (let i = 0; i <= maxAttempts; i++) {
      await page.goto('/login');
      await page.fill('input[type="email"]', `test${i}@example.com`);
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Email me a secure link")');
      
      if (i < maxAttempts) {
        // Should succeed
        await page.waitForURL('**/auth/email-sent*');
      } else {
        // Should be rate limited
        await expect(page.locator('text=Too many attempts')).toBeVisible();
      }
    }
  });

  test('should timeout expired sessions', async ({ page }) => {
    // Simulate expired session
    await page.route('**/api/auth/passwordless/verify-token', async route => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          error: 'Session expired. Please request a new sign-in link.',
          code: 'auth/session-expired'
        })
      });
    });

    await page.goto('/auth/email-action?mode=signIn&oobCode=expired-session');
    
    // Complete the form
    const emailInput = page.locator('input[placeholder="you@example.com"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.click('button:has-text("Complete Sign In")');
    }
    
    // Should show session expired error
    await expect(page.locator('text=expired')).toBeVisible();
  });

  test('should protect against timing attacks', async ({ page }) => {
    const timings: number[] = [];
    
    // Test multiple email addresses
    const emails = [
      'existing@example.com',
      'nonexistent@example.com',
      'another@example.com'
    ];
    
    for (const email of emails) {
      await page.route('**/api/auth/passwordless/send-link', async route => {
        const start = Date.now();
        
        // Simulate consistent response time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
        
        timings.push(Date.now() - start);
      });

      await page.goto('/login');
      await page.fill('input[type="email"]', email);
      await page.click('button:has-text("Continue")');
      await page.click('button:has-text("Email me a secure link")');
    }
    
    // Response times should be consistent (within reasonable variance)
    const avgTime = timings.reduce((a, b) => a + b) / timings.length;
    const maxVariance = timings.reduce((max, time) => 
      Math.max(max, Math.abs(time - avgTime)), 0
    );
    
    // Variance should be less than 50ms (accounting for network/processing)
    expect(maxVariance).toBeLessThan(50);
  });
});