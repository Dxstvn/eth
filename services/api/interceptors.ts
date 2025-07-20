// Request and Response Interceptors

import { RequestInterceptor, ResponseInterceptor } from './types';

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    // Return function to remove interceptor
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    // Return function to remove interceptor
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  // Apply all request interceptors
  async applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }
    
    return modifiedConfig;
  }

  // Apply all response interceptors
  async applyResponseInterceptors(response: Response): Promise<Response> {
    let modifiedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor(modifiedResponse);
    }
    
    return modifiedResponse;
  }

  // Clear all interceptors
  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }
}

// Default interceptors
export const defaultRequestInterceptor: RequestInterceptor = (config) => {
  // Add default headers
  const headers = new Headers(config.headers);
  
  // Ensure content type is set for JSON requests
  if (config.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add request ID for tracing
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }
  
  return {
    ...config,
    headers
  };
};

export const authTokenInterceptor = (getToken: () => Promise<string | null>): RequestInterceptor => {
  return async (config) => {
    const token = await getToken();
    if (token) {
      const headers = new Headers(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return { ...config, headers };
    }
    return config;
  };
};

// Response interceptor for error normalization
export const errorNormalizationInterceptor: ResponseInterceptor = async (response) => {
  // Clone response to avoid consuming the body
  const clonedResponse = response.clone();
  
  if (!response.ok) {
    try {
      const errorData = await clonedResponse.json();
      // Attach error data to response for easier access
      (response as any).__errorData = errorData;
    } catch {
      // If parsing fails, continue with original response
    }
  }
  
  return response;
};