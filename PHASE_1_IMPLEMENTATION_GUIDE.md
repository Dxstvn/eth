# Phase 1 Implementation Guide: Core Infrastructure

This guide provides detailed step-by-step instructions for implementing Phase 1 of the backend integration plan.

## Overview

Phase 1 focuses on establishing the core infrastructure needed for all subsequent integration work:
1. Centralized API configuration
2. Enhanced API client with proper error handling
3. Environment setup
4. Base service architecture

## Step 1: Environment Configuration

### 1.1 Create/Update `.env.local`
```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=https://api.clearhold.app
NEXT_PUBLIC_API_VERSION=v1

# Firebase Configuration (from backend project)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Feature Flags
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true
```

### 1.2 Update `.gitignore`
```gitignore
# Environment files
.env.local
.env.production
```

## Step 2: Core API Configuration

### 2.1 Create `services/api/config.ts`
```typescript
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.clearhold.app',
  version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
  
  endpoints: {
    // Authentication
    auth: {
      signUp: '/auth/signUpEmailPass',
      signIn: '/auth/signInEmailPass',
      signInGoogle: '/auth/signInGoogle',
      signOut: '/auth/signOut',
      profile: '/auth/profile',
      refreshToken: '/auth/refresh',
    },
    
    // Wallet Management
    wallet: {
      register: '/wallet/register',
      list: '/wallet',
      remove: (address: string) => `/wallet/${address}`,
      setPrimary: '/wallet/primary',
      syncBalance: '/wallet/balance',
      preferences: '/wallet/preferences',
      detection: '/wallet/detection',
    },
    
    // Transaction Management
    transaction: {
      create: '/deals/create',
      list: '/deals',
      get: (id: string) => `/deals/${id}`,
      updateCondition: (dealId: string, condId: string) => 
        `/deals/${dealId}/conditions/${condId}/buyer-review`,
      syncStatus: (id: string) => `/deals/${id}/sync-status`,
      startApproval: (id: string) => `/deals/${id}/sc/start-final-approval`,
      raiseDispute: (id: string) => `/deals/${id}/sc/raise-dispute`,
      resolveDispute: (id: string) => `/deals/${id}/sc/resolve-dispute`,
      releaseEscrow: (id: string) => `/deals/${id}/sc/release-escrow`,
    },
    
    // Contact Management
    contact: {
      invite: '/contact/invite',
      pending: '/contact/pending',
      respond: '/contact/response',
      list: '/contact/contacts',
    },
    
    // File Management
    files: {
      upload: '/files/upload',
      download: (id: string) => `/files/${id}`,
      delete: (id: string) => `/files/${id}`,
    },
  },
  
  // Feature flags
  features: {
    useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
    enableRealTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES === 'true',
  },
};
```

## Step 3: Enhanced API Client

### 3.1 Create `services/api/types.ts`
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryable?: boolean;
  timeout?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  version: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  onTokenExpired?: () => Promise<string | null>;
  onError?: (error: ApiError) => void;
}

export class ApiException extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
```

### 3.2 Create `services/api/client.ts`
```typescript
import { API_CONFIG } from './config';
import { ApiResponse, RequestOptions, ApiException } from './types';

export class ApiClient {
  private static instance: ApiClient;
  private abortControllers = new Map<string, AbortController>();
  
  private constructor(
    private baseUrl: string = API_CONFIG.baseUrl,
    private config = API_CONFIG
  ) {}
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  private async getAuthToken(): Promise<string | null> {
    // Get token from localStorage or context
    const token = localStorage.getItem('clearhold_auth_token');
    
    if (!token) return null;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      
      if (Date.now() >= expirationTime - 5 * 60 * 1000) {
        // Token expires in less than 5 minutes, refresh it
        if (this.config.onTokenExpired) {
          return await this.config.onTokenExpired();
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async retryRequest<T>(
    fn: () => Promise<T>,
    attempts = this.config.retryAttempts,
    delay = this.config.retryDelay
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      
      // Check if error is retryable
      if (error instanceof ApiException) {
        const retryableCodes = [408, 429, 500, 502, 503, 504];
        if (!retryableCodes.includes(error.statusCode)) {
          throw error;
        }
      }
      
      await this.delay(delay);
      return this.retryRequest(fn, attempts - 1, delay * 2);
    }
  }
  
  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      skipAuth = false,
      retryable = true,
      timeout = this.config.timeout,
      ...fetchOptions
    } = options;
    
    // Create abort controller for this request
    const requestId = `${method}-${endpoint}-${Date.now()}`;
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);
    
    try {
      const executeRequest = async () => {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        };
        
        // Add auth token if not skipped
        if (!skipAuth) {
          const token = await this.getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: 'include',
          signal: abortController.signal,
          ...fetchOptions,
        });
        
        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: response.statusText,
          }));
          
          throw new ApiException(
            errorData.code || 'API_ERROR',
            response.status,
            errorData.message || `Request failed with status ${response.status}`,
            errorData.details
          );
        }
        
        // Parse response
        const responseData = await response.json();
        
        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData.message,
        } as ApiResponse<T>;
      };
      
      // Execute with retry logic if enabled
      if (retryable) {
        return await this.retryRequest(executeRequest);
      } else {
        return await executeRequest();
      }
    } catch (error) {
      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiException(
          'REQUEST_TIMEOUT',
          408,
          'Request timed out'
        );
      }
      
      // Re-throw ApiException
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Handle other errors
      throw new ApiException(
        'NETWORK_ERROR',
        0,
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
    }
  }
  
  // Convenience methods
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }
  
  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }
  
  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }
  
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
  
  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
  
  // Cancel specific request types
  cancelRequestsForEndpoint(endpoint: string): void {
    this.abortControllers.forEach((controller, key) => {
      if (key.includes(endpoint)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    });
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
```

## Step 4: Base Service Architecture

### 4.1 Create `services/api/base-service.ts`
```typescript
import { apiClient } from './client';
import { ApiResponse, RequestOptions } from './types';
import { API_CONFIG } from './config';

export abstract class BaseService {
  protected client = apiClient;
  protected config = API_CONFIG;
  
  constructor(protected serviceName: string) {}
  
  protected async handleRequest<T>(
    request: Promise<ApiResponse<T>>,
    fallbackData?: T
  ): Promise<T> {
    try {
      const response = await request;
      
      if (response.success && response.data !== undefined) {
        return response.data;
      }
      
      throw new Error(response.message || 'Request failed');
    } catch (error) {
      // Log error
      console.error(`[${this.serviceName}] Error:`, error);
      
      // Use fallback data in development if available
      if (this.config.features.useMockData && fallbackData !== undefined) {
        console.warn(`[${this.serviceName}] Using fallback data`);
        return fallbackData;
      }
      
      throw error;
    }
  }
  
  protected buildEndpoint(template: string, params: Record<string, string>): string {
    let endpoint = template;
    
    Object.entries(params).forEach(([key, value]) => {
      endpoint = endpoint.replace(`:${key}`, value);
    });
    
    return endpoint;
  }
}
```

## Step 5: Error Handling and Logging

### 5.1 Create `services/api/error-handler.ts`
```typescript
import { ApiException } from './types';
import { toast } from 'sonner';

export class ErrorHandler {
  private static instance: ErrorHandler;
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  handleError(error: unknown, context?: string): void {
    console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]:`, error);
    
    if (error instanceof ApiException) {
      this.handleApiException(error);
    } else if (error instanceof Error) {
      this.handleGenericError(error);
    } else {
      this.handleUnknownError(error);
    }
  }
  
  private handleApiException(error: ApiException): void {
    switch (error.statusCode) {
      case 401:
        toast.error('Session expired. Please sign in again.');
        // Trigger logout
        window.location.href = '/login';
        break;
        
      case 403:
        toast.error('You don\'t have permission to perform this action.');
        break;
        
      case 404:
        toast.error('The requested resource was not found.');
        break;
        
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
        
      case 500:
        toast.error('Server error. Please try again later.');
        break;
        
      default:
        toast.error(error.message || 'An error occurred. Please try again.');
    }
  }
  
  private handleGenericError(error: Error): void {
    if (error.message.includes('Network')) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error(error.message || 'An unexpected error occurred.');
    }
  }
  
  private handleUnknownError(error: unknown): void {
    toast.error('An unexpected error occurred. Please try again.');
  }
}

export const errorHandler = ErrorHandler.getInstance();
```

## Step 6: Request Queue for Offline Support

### 6.1 Create `services/api/request-queue.ts`
```typescript
interface QueuedRequest {
  id: string;
  method: string;
  endpoint: string;
  data?: any;
  options?: RequestOptions;
  timestamp: number;
  retries: number;
}

export class RequestQueue {
  private static instance: RequestQueue;
  private queue: QueuedRequest[] = [];
  private isOnline = navigator.onLine;
  private isProcessing = false;
  
  private constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }
  
  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }
  
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('clearhold_request_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load request queue:', error);
    }
  }
  
  private saveQueue(): void {
    try {
      localStorage.setItem('clearhold_request_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save request queue:', error);
    }
  }
  
  async addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.queue.push(queuedRequest);
    this.saveQueue();
    
    if (this.isOnline) {
      await this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0 && this.isOnline) {
        const request = this.queue[0];
        
        try {
          await apiClient.request(
            request.method,
            request.endpoint,
            request.data,
            request.options
          );
          
          // Remove successful request from queue
          this.queue.shift();
          this.saveQueue();
        } catch (error) {
          // Increment retry count
          request.retries++;
          
          // Remove if max retries exceeded
          if (request.retries >= 3) {
            this.queue.shift();
            console.error('Request failed after max retries:', request);
          }
          
          this.saveQueue();
          
          // Stop processing on error
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
  
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const requestQueue = RequestQueue.getInstance();
```

## Step 7: Update Existing Services

### 7.1 Create Migration Helper
```typescript
// services/api/migration.ts
import { API_CONFIG } from './config';

export function shouldUseMockData(feature: string): boolean {
  if (API_CONFIG.features.useMockData) {
    console.warn(`Using mock data for ${feature}`);
    return true;
  }
  return false;
}

export function getMockDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
}
```

## Step 8: Testing Setup

### 8.1 Create `__tests__/services/api/client.test.ts`
```typescript
import { ApiClient } from '@/services/api/client';
import { ApiException } from '@/services/api/types';

describe('ApiClient', () => {
  let client: ApiClient;
  
  beforeEach(() => {
    client = ApiClient.getInstance();
    global.fetch = jest.fn();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('request', () => {
    it('should make successful request', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      const result = await client.get('/test');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
    
    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 'BAD_REQUEST', message: 'Invalid data' }),
      });
      
      await expect(client.post('/test', {})).rejects.toThrow(ApiException);
    });
    
    it('should retry on retryable errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ message: 'Service unavailable' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'Success' }),
        });
      
      const result = await client.get('/test');
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });
});
```

## Step 9: Integration with Existing Code

### 9.1 Update `services/api.ts` to use new client
```typescript
import { apiClient } from './api/client';
import { errorHandler } from './api/error-handler';

// Deprecated - use apiClient directly
export const postRequest = async (url: string, data: any) => {
  try {
    const response = await apiClient.post(url, data);
    return response.data;
  } catch (error) {
    errorHandler.handleError(error, 'postRequest');
    throw error;
  }
};

// Deprecated - use apiClient directly
export const getRequest = async (url: string) => {
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    errorHandler.handleError(error, 'getRequest');
    throw error;
  }
};
```

## Step 10: Documentation

### 10.1 Update CLAUDE.md with new API client usage
```markdown
### API Client Usage

The application now uses a centralized API client with automatic retry, error handling, and offline support.

```typescript
import { apiClient } from '@/services/api/client';

// Make API requests
const response = await apiClient.get('/endpoint');
const data = await apiClient.post('/endpoint', { key: 'value' });

// Handle errors
import { errorHandler } from '@/services/api/error-handler';
try {
  const data = await apiClient.get('/endpoint');
} catch (error) {
  errorHandler.handleError(error, 'ComponentName');
}
```
```

## Next Steps

1. **Test the new API client** with existing endpoints
2. **Gradually migrate** services to use the new client
3. **Monitor error rates** and adjust retry logic
4. **Implement feature flags** for gradual rollout
5. **Set up monitoring** for API performance

## Checklist

- [ ] Environment variables configured
- [ ] API client implemented and tested
- [ ] Error handling integrated
- [ ] Request queue for offline support
- [ ] Base service architecture established
- [ ] Existing services updated to use new client
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Team briefed on new architecture

## Common Issues and Solutions

### Issue: CORS errors
**Solution**: Ensure backend allows frontend origin and credentials

### Issue: Token refresh loops
**Solution**: Check token expiry calculation and refresh endpoint

### Issue: Offline requests not queuing
**Solution**: Verify RequestQueue initialization and event listeners

### Issue: Mock data not working
**Solution**: Check NEXT_PUBLIC_USE_MOCK_DATA environment variable

## Conclusion

This completes Phase 1 of the backend integration. The core infrastructure is now in place to support all subsequent integration work. The next phase will focus on updating the authentication system to fully utilize the backend API.