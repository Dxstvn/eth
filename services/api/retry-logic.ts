// Retry Logic with Exponential Backoff

import { ApiException } from './types';
import { apiLogger } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']
};

export class RetryHandler {
  constructor(private config: RetryConfig = defaultRetryConfig) {}

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context?: { method?: string; endpoint?: string }
  ): Promise<T> {
    let lastError: any;
    let delay = this.config.initialDelay;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const currentDelay = Math.min(
          delay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = currentDelay * (0.5 + Math.random() * 0.5);

        apiLogger.log({
          method: context?.method || 'RETRY',
          endpoint: context?.endpoint || 'unknown',
          status: 0,
          message: `Retry attempt ${attempt}/${this.config.maxAttempts} after ${Math.round(jitteredDelay)}ms`,
          error: {
            message: error.message,
            code: error.code
          }
        });

        await this.delay(jitteredDelay);
      }
    }

    throw lastError;
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    // Check if error is an ApiException with retryable status code
    if (error instanceof ApiException) {
      return this.config.retryableStatusCodes.includes(error.statusCode);
    }

    // Check if error code is retryable
    if (error.code && this.config.retryableErrorCodes.includes(error.code)) {
      return true;
    }

    // Check for network errors
    if (error.message && error.message.toLowerCase().includes('network')) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update configuration
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// Singleton instance with default configuration
export const retryHandler = new RetryHandler();

// Helper function for custom retry logic
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryConfig>
): Promise<T> {
  const handler = options ? new RetryHandler({ ...defaultRetryConfig, ...options }) : retryHandler;
  return handler.executeWithRetry(fn);
}