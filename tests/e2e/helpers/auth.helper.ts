import { Page, BrowserContext } from '@playwright/test';
import jwt from 'jsonwebtoken';

/**
 * E2E test authentication helper
 * Provides utilities for authenticating in E2E tests
 */
export class AuthHelper {
  constructor(
    private page: Page,
    private context: BrowserContext,
    private apiUrl: string = 'http://localhost:3000'
  ) {}

  /**
   * Generate a test JWT token for E2E testing
   */
  generateTestToken(userId: string, email: string): string {
    const payload = {
      uid: userId,
      email,
      emailVerified: true,
      authMethod: 'e2e-test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

    // Use a test secret (should match backend E2E configuration)
    return jwt.sign(payload, process.env.JWT_SECRET || 'e2e-test-secret');
  }

  /**
   * Set authentication token in localStorage and cookies
   */
  async setAuthToken(token: string): Promise<void> {
    // Set in localStorage
    await this.page.evaluate((token) => {
      localStorage.setItem('clearhold_auth_token', token);
    }, token);

    // Set as cookie for API requests
    await this.context.addCookies([{
      name: 'auth-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }]);

    // Set authorization header for all requests
    await this.context.setExtraHTTPHeaders({
      'Authorization': `Bearer ${token}`,
      'x-e2e-test': 'true'
    });
  }

  /**
   * Authenticate as a test user
   */
  async authenticateAsTestUser(userId: string = 'test-user-1', email: string = 'test@example.com'): Promise<void> {
    const token = this.generateTestToken(userId, email);
    await this.setAuthToken(token);
  }

  /**
   * Clear authentication
   */
  async clearAuth(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('clearhold_auth_token');
      sessionStorage.clear();
    });

    await this.context.clearCookies();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const token = localStorage.getItem('clearhold_auth_token');
      return !!token;
    });
  }

  /**
   * Wait for authentication redirect
   */
  async waitForAuthRedirect(expectedUrl: string | RegExp, timeout: number = 30000): Promise<void> {
    await this.page.waitForURL(expectedUrl, { timeout });
  }

  /**
   * Perform passwordless login flow
   */
  async performPasswordlessLogin(email: string): Promise<void> {
    // Navigate to login
    await this.page.goto('/login', { waitUntil: 'networkidle' });

    // Enter email
    await this.page.fill('input[type="email"]', email);
    await this.page.click('button[type="submit"]:has-text("Continue")');

    // Wait for password form
    await this.page.waitForSelector('button:has-text("Email me a sign-in link")', {
      state: 'visible'
    });

    // Click passwordless option
    await this.page.click('button:has-text("Email me a sign-in link")');

    // Wait for redirect to email sent page
    await this.page.waitForURL('**/auth/email-sent**');
  }

  /**
   * Simulate clicking email link (for E2E testing)
   */
  async simulateEmailLinkClick(token: string): Promise<void> {
    // Navigate directly to the email action handler with token
    await this.page.goto(`/auth/email-action?mode=signIn&oobCode=${token}&apiKey=demo-api-key`);
  }

  /**
   * Get current auth token from localStorage
   */
  async getCurrentToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('clearhold_auth_token');
    });
  }
}