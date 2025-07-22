// Enhanced API Client with all features

import { API_CONFIG } from '../api-config';
import { 
  ApiResponse, 
  RequestOptions, 
  ApiException, 
  ApiClientConfig 
} from './types';
import { apiLogger } from './logger';
import { errorHandler } from './error-handler';
import { retryHandler } from './retry-logic';
import { requestQueue } from './request-queue';
import { 
  InterceptorManager, 
  defaultRequestInterceptor,
  authTokenInterceptor,
  errorNormalizationInterceptor 
} from './interceptors';

export class ApiClient {
  private static instance: ApiClient;
  private abortControllers = new Map<string, AbortController>();
  private interceptors = new InterceptorManager();
  private config: ApiClientConfig;

  private constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseUrl: API_CONFIG.baseUrl,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      debug: process.env.NODE_ENV === 'development',
      ...config
    };

    // Setup default interceptors
    this.setupDefaultInterceptors();
    
    // Configure error handler
    errorHandler.configure({
      showToasts: true,
      logErrors: true,
      onUnauthorized: this.config.onTokenExpired ? 
        async () => { await this.config.onTokenExpired!(); } : 
        undefined
    });

    // Set logger debug mode
    apiLogger.setDebug(this.config.debug || false);
  }

  static getInstance(config?: Partial<ApiClientConfig>): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(config);
    }
    return ApiClient.instance;
  }

  private setupDefaultInterceptors(): void {
    // Add default request interceptor
    this.interceptors.addRequestInterceptor(defaultRequestInterceptor);

    // Add auth token interceptor
    this.interceptors.addRequestInterceptor(
      authTokenInterceptor(async () => {
        return this.getAuthToken();
      })
    );

    // Add response error normalization
    this.interceptors.addResponseInterceptor(errorNormalizationInterceptor);
  }

  private async getAuthToken(): Promise<string | null> {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? 
      localStorage.getItem('clearhold_auth_token') : null;

    if (!token) return null;

    // Validate token format (should be JWT with 3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Invalid token format, removing from localStorage');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('clearhold_auth_token');
      }
      return null;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Validate payload has exp field
      if (!payload.exp || typeof payload.exp !== 'number') {
        console.warn('Invalid token payload, removing from localStorage');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('clearhold_auth_token');
        }
        return null;
      }

      const expirationTime = payload.exp * 1000;

      // If token expires in less than 5 minutes, try to refresh
      if (Date.now() >= expirationTime - 5 * 60 * 1000) {
        if (this.config.onTokenExpired) {
          const newToken = await this.config.onTokenExpired();
          return newToken;
        }
      }

      return token;
    } catch (error) {
      console.error('Error parsing token:', error);
      // Remove invalid token from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('clearhold_auth_token');
      }
      return null;
    }
  }

  async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    // Check if we should queue this request (offline mode)
    if (!navigator.onLine && !options.skipQueue) {
      const queueId = await requestQueue.addToQueue(method, endpoint, data, options);
      return {
        success: false,
        message: 'Request queued for offline processing',
        data: { queueId } as any
      };
    }

    const {
      skipAuth = false,
      retryable = true,
      timeout = this.config.timeout,
      skipLogging = false,
      ...fetchOptions
    } = options;

    // Create unique request ID
    const requestId = `${method}-${endpoint}-${Date.now()}`;
    const timer = apiLogger.startTimer();

    try {
      // Execute request with retry logic if enabled
      const executeRequest = async () => {
        const abortController = new AbortController();
        this.abortControllers.set(requestId, abortController);

        // Set up timeout
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, timeout);

        try {
          // Prepare request configuration
          let config: RequestInit = {
            method,
            body: data ? JSON.stringify(data) : undefined,
            credentials: 'include',
            signal: abortController.signal,
            ...fetchOptions
          };

          // Apply request interceptors
          if (!skipAuth) {
            config = await this.interceptors.applyRequestInterceptors(config);
          }

          // Make the request
          const url = `${this.config.baseUrl}${endpoint}`;
          let response: Response;
          
          try {
            response = await fetch(url, config);
          } catch (fetchError: any) {
            // Handle network errors (CORS, connection refused, etc.)
            if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
              throw new ApiException(
                'NETWORK_ERROR',
                0,
                'Network error: Unable to connect to the server. Please check your internet connection.',
                fetchError
              );
            }
            throw fetchError;
          }

          // Apply response interceptors
          response = await this.interceptors.applyResponseInterceptors(response);

          // Handle non-OK responses
          if (!response.ok) {
            const errorData = (response as any).__errorData || 
              await response.json().catch(() => ({ message: response.statusText }));

            throw new ApiException(
              errorData.code || 'API_ERROR',
              response.status,
              errorData.message || `Request failed with status ${response.status}`,
              errorData.details
            );
          }

          // Parse successful response
          const responseData = await response.json();
          const duration = timer();

          if (!skipLogging) {
            apiLogger.logSuccess(method, endpoint, response.status, duration, responseData);
          }

          return {
            success: true,
            data: responseData.data !== undefined ? responseData.data : responseData,
            message: responseData.message
          } as ApiResponse<T>;

        } finally {
          clearTimeout(timeoutId);
          this.abortControllers.delete(requestId);
        }
      };

      // Execute with retry if enabled
      if (retryable) {
        return await retryHandler.executeWithRetry(
          executeRequest,
          { method, endpoint }
        );
      } else {
        return await executeRequest();
      }

    } catch (error) {
      const duration = timer();

      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiException(
          'TIMEOUT',
          408,
          'Request timed out'
        );
        if (!skipLogging) {
          apiLogger.logError(method, endpoint, timeoutError, duration);
        }
        throw timeoutError;
      }

      // Log error
      if (!skipLogging) {
        apiLogger.logError(method, endpoint, error, duration);
      }

      // Handle error through error handler
      errorHandler.handleError(error, `${method} ${endpoint}`);

      // Re-throw for caller to handle
      throw error;
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

  async patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    apiLogger.log({
      method: 'SYSTEM',
      endpoint: 'CANCEL_ALL',
      message: 'All pending requests cancelled'
    });
  }

  // Cancel specific endpoint requests
  cancelRequestsForEndpoint(endpoint: string): void {
    this.abortControllers.forEach((controller, key) => {
      if (key.includes(endpoint)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    });
  }

  // Add custom interceptors
  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit | Promise<RequestInit>) {
    return this.interceptors.addRequestInterceptor(interceptor);
  }

  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>) {
    return this.interceptors.addResponseInterceptor(interceptor);
  }

  // Get API logs for debugging
  getApiLogs() {
    return apiLogger.getLogs();
  }

  // Export logs
  exportLogs(): string {
    return apiLogger.exportLogs();
  }

  // Configure client
  configure(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
    apiLogger.setDebug(config.debug || false);
  }

  // Get offline queue status
  getQueueStatus() {
    return {
      isOnline: navigator.onLine,
      queueLength: requestQueue.getQueueLength(),
      queuedRequests: requestQueue.getQueuedRequests()
    };
  }

  // Process offline queue manually
  async processOfflineQueue(): Promise<void> {
    await requestQueue.processQueue();
  }

  // Clear offline queue
  clearOfflineQueue(): void {
    requestQueue.clearQueue();
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();