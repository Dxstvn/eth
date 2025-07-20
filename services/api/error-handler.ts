// Unified Error Handler

import { ApiException, ApiError } from './types';
import { toast } from 'sonner';
import { apiLogger } from './logger';

export interface ErrorHandlerConfig {
  showToasts?: boolean;
  logErrors?: boolean;
  onUnauthorized?: () => void;
  onNetworkError?: () => void;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig = {
    showToasts: true,
    logErrors: true
  };

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  handleError(error: unknown, context?: string): ApiError {
    const apiError = this.normalizeError(error);
    
    if (this.config.logErrors) {
      apiLogger.logError(
        context || 'UNKNOWN',
        '',
        apiError
      );
    }

    if (this.config.showToasts) {
      this.showErrorToast(apiError);
    }

    // Handle specific error cases
    if (error instanceof ApiException) {
      this.handleApiException(error);
    }

    return apiError;
  }

  private normalizeError(error: unknown): ApiError {
    const timestamp = new Date().toISOString();

    if (error instanceof ApiException) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp
      };
    }

    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed. Please check your internet connection.',
          timestamp
        };
      }

      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        timestamp
      };
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as any;
      return {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'An unexpected error occurred',
        details: err.details || err,
        timestamp
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      timestamp
    };
  }

  private handleApiException(error: ApiException): void {
    switch (error.statusCode) {
      case 401:
        if (this.config.onUnauthorized) {
          this.config.onUnauthorized();
        } else {
          // Default unauthorized handling
          if (typeof window !== 'undefined') {
            localStorage.removeItem('clearhold_auth_token');
            window.location.href = '/login';
          }
        }
        break;

      case 403:
        // Forbidden - user doesn't have permission
        break;

      case 429:
        // Rate limited
        const retryAfter = error.details?.retryAfter;
        if (retryAfter) {
          toast.error(`Too many requests. Please try again in ${retryAfter} seconds.`);
          return;
        }
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        if (this.config.onNetworkError) {
          this.config.onNetworkError();
        }
        break;
    }
  }

  private showErrorToast(error: ApiError): void {
    const toastOptions = {
      duration: 5000,
      id: error.code // Prevent duplicate toasts for same error
    };

    switch (error.code) {
      case 'NETWORK_ERROR':
        toast.error('Network error. Please check your connection.', toastOptions);
        break;

      case 'UNAUTHORIZED':
        toast.error('Session expired. Please sign in again.', toastOptions);
        break;

      case 'FORBIDDEN':
        toast.error('You don\'t have permission to perform this action.', toastOptions);
        break;

      case 'NOT_FOUND':
        toast.error('The requested resource was not found.', toastOptions);
        break;

      case 'VALIDATION_ERROR':
        toast.error(error.message || 'Please check your input and try again.', toastOptions);
        break;

      case 'RATE_LIMITED':
        toast.error('Too many requests. Please slow down.', toastOptions);
        break;

      case 'SERVER_ERROR':
        toast.error('Server error. Please try again later.', toastOptions);
        break;

      default:
        toast.error(error.message || 'An unexpected error occurred.', toastOptions);
    }
  }

  // Helper method to check if error is retryable
  isRetryableError(error: ApiError | ApiException): boolean {
    if (error instanceof ApiException) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.statusCode);
    }

    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'];
    return retryableCodes.includes(error.code);
  }

  // Format error for display
  formatErrorMessage(error: ApiError): string {
    if (error.details?.userMessage) {
      return error.details.userMessage;
    }

    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      case 'VALIDATION_ERROR':
        if (error.details?.fields) {
          const fieldErrors = Object.entries(error.details.fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          return `Validation errors: ${fieldErrors}`;
        }
        return error.message;
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();