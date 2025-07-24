import { v4 as uuidv4 } from 'uuid';

// CSRF Token Management
class CSRFTokenManager {
  private static instance: CSRFTokenManager;
  private tokenKey = 'clearhold_csrf_token';
  private tokenExpiry = 'clearhold_csrf_expiry';
  private tokenLifetime = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): CSRFTokenManager {
    if (!CSRFTokenManager.instance) {
      CSRFTokenManager.instance = new CSRFTokenManager();
    }
    return CSRFTokenManager.instance;
  }

  // Generate a new CSRF token
  generateToken(): string {
    const token = uuidv4();
    const expiry = Date.now() + this.tokenLifetime;
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.tokenKey, token);
      sessionStorage.setItem(this.tokenExpiry, expiry.toString());
    }
    
    return token;
  }

  // Get current CSRF token
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    const token = sessionStorage.getItem(this.tokenKey);
    const expiry = sessionStorage.getItem(this.tokenExpiry);
    
    if (!token || !expiry) {
      return this.generateToken();
    }
    
    // Check if token is expired
    if (Date.now() > parseInt(expiry)) {
      return this.generateToken();
    }
    
    return token;
  }

  // Validate CSRF token
  validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return storedToken === token;
  }

  // Clear CSRF token
  clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.tokenExpiry);
    }
  }

  // Rotate token (generate new one)
  rotateToken(): string {
    this.clearToken();
    return this.generateToken();
  }
}

export const csrfTokenManager = CSRFTokenManager.getInstance();

// CSRF Protected Fetch wrapper
interface CSRFRequestInit extends RequestInit {
  skipCSRF?: boolean;
}

export async function csrfFetch(url: string, options: CSRFRequestInit = {}): Promise<Response> {
  const { skipCSRF = false, ...fetchOptions } = options;
  
  // Skip CSRF for GET requests and when explicitly disabled
  if (fetchOptions.method === 'GET' || skipCSRF) {
    return fetch(url, fetchOptions);
  }
  
  // Get CSRF token
  const csrfToken = csrfTokenManager.getToken();
  
  if (!csrfToken) {
    throw new Error('CSRF token not available');
  }
  
  // Add CSRF token to headers
  const headers = new Headers(fetchOptions.headers);
  headers.set('X-CSRF-Token', csrfToken);
  
  // Perform the fetch
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });
  
  // If server indicates token is invalid, rotate and retry once
  if (response.status === 403 && response.headers.get('X-CSRF-Invalid') === 'true') {
    const newToken = csrfTokenManager.rotateToken();
    headers.set('X-CSRF-Token', newToken);
    
    return fetch(url, {
      ...fetchOptions,
      headers,
    });
  }
  
  return response;
}

// Hook for CSRF protection in React components
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const csrfToken = csrfTokenManager.getToken();
    setToken(csrfToken);
  }, []);
  
  const rotateToken = React.useCallback(() => {
    const newToken = csrfTokenManager.rotateToken();
    setToken(newToken);
    return newToken;
  }, []);
  
  return { token, rotateToken };
}

// CSRF Protected API Client
export class CSRFProtectedApiClient {
  constructor(private baseUrl: string) {}
  
  private async request<T>(
    endpoint: string,
    options: CSRFRequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await csrfFetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('CSRF Protected API request failed:', error);
      throw error;
    }
  }
  
  async get<T>(endpoint: string, options?: CSRFRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  async post<T>(endpoint: string, data?: any, options?: CSRFRequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async put<T>(endpoint: string, data?: any, options?: CSRFRequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  async delete<T>(endpoint: string, options?: CSRFRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// CSRF Middleware for sensitive operations
export function csrfMiddleware(
  handler: (...args: any[]) => Promise<any>
) {
  return async (...args: any[]) => {
    // Validate CSRF token before executing sensitive operation
    const token = csrfTokenManager.getToken();
    
    if (!token) {
      throw new Error('CSRF protection: No valid token found');
    }
    
    // Log sensitive operation attempt
    if (typeof window !== 'undefined') {
      console.log('[CSRF Protection] Executing sensitive operation with token:', token.substring(0, 8) + '...');
    }
    
    try {
      // Execute the original handler
      const result = await handler(...args);
      
      // Rotate token after successful sensitive operation
      csrfTokenManager.rotateToken();
      
      return result;
    } catch (error) {
      console.error('[CSRF Protection] Operation failed:', error);
      throw error;
    }
  };
}

// Double-submit cookie pattern implementation
export class DoubleSubmitCSRF {
  private cookieName = 'clearhold_csrf_cookie';
  
  setCookie(token: string): void {
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      document.cookie = `${this.cookieName}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
    }
  }
  
  getCookie(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.cookieName) {
        return value;
      }
    }
    return null;
  }
  
  validateDoubleSubmit(headerToken: string): boolean {
    const cookieToken = this.getCookie();
    return cookieToken === headerToken && cookieToken !== null;
  }
}

// Export a singleton instance
export const doubleSubmitCSRF = new DoubleSubmitCSRF();

// React component for CSRF protected forms
interface CSRFFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSecureSubmit?: (data: FormData, csrfToken: string) => void | Promise<void>;
}

export function CSRFProtectedForm({ 
  children, 
  onSecureSubmit, 
  onSubmit,
  ...props 
}: CSRFFormProps) {
  const { token } = useCSRFToken();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!token) {
      console.error('CSRF token not available');
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    if (onSecureSubmit) {
      try {
        await onSecureSubmit(formData, token);
      } catch (error) {
        console.error('Form submission failed:', error);
      }
    }
    
    if (onSubmit) {
      onSubmit(e);
    }
  };
  
  return (
    <form {...props} onSubmit={handleSubmit}>
      <input type="hidden" name="_csrf" value={token || ''} />
      {children}
    </form>
  );
}

import React from 'react';