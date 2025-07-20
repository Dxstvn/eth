// API Types and Interfaces

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
  skipLogging?: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  onTokenExpired?: () => Promise<string | null>;
  onError?: (error: ApiError) => void;
  debug?: boolean;
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

// Request/Response interceptor types
export type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

// Offline queue types
export interface QueuedRequest {
  id: string;
  method: string;
  endpoint: string;
  data?: any;
  options?: RequestOptions;
  timestamp: number;
  retries: number;
}

// Logging types
export interface ApiLogEntry {
  timestamp: string;
  method: string;
  endpoint: string;
  status?: number;
  duration?: number;
  error?: any;
  requestBody?: any;
  responseBody?: any;
}