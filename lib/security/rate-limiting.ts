import { RateLimiter } from './validation';

// Rate limiting configurations for different operations
export const rateLimitConfigs = {
  // Authentication attempts
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Password reset requests
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Transaction creation
  createTransaction: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // File uploads
  fileUpload: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // API requests (general)
  apiRequest: {
    maxAttempts: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Contact invitations
  contactInvite: {
    maxAttempts: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Wallet operations
  walletOperation: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

// Create rate limiters for each operation
export const rateLimiters = {
  login: new RateLimiter(
    rateLimitConfigs.login.maxAttempts,
    rateLimitConfigs.login.windowMs
  ),
  
  passwordReset: new RateLimiter(
    rateLimitConfigs.passwordReset.maxAttempts,
    rateLimitConfigs.passwordReset.windowMs
  ),
  
  createTransaction: new RateLimiter(
    rateLimitConfigs.createTransaction.maxAttempts,
    rateLimitConfigs.createTransaction.windowMs
  ),
  
  fileUpload: new RateLimiter(
    rateLimitConfigs.fileUpload.maxAttempts,
    rateLimitConfigs.fileUpload.windowMs
  ),
  
  apiRequest: new RateLimiter(
    rateLimitConfigs.apiRequest.maxAttempts,
    rateLimitConfigs.apiRequest.windowMs
  ),
  
  contactInvite: new RateLimiter(
    rateLimitConfigs.contactInvite.maxAttempts,
    rateLimitConfigs.contactInvite.windowMs
  ),
  
  walletOperation: new RateLimiter(
    rateLimitConfigs.walletOperation.maxAttempts,
    rateLimitConfigs.walletOperation.windowMs
  ),
};

// Rate limit error class
export class RateLimitError extends Error {
  constructor(
    public operation: string,
    public remainingTime: number,
    public maxAttempts: number
  ) {
    const minutes = Math.ceil(remainingTime / (60 * 1000));
    super(
      `Rate limit exceeded for ${operation}. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
    );
    this.name = 'RateLimitError';
  }
}

// Rate limiting middleware
export function withRateLimit<T extends (...args: any[]) => any>(
  operation: keyof typeof rateLimiters,
  handler: T,
  keyExtractor?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const limiter = rateLimiters[operation];
    const key = keyExtractor ? keyExtractor(...args) : operation;
    
    if (!limiter.isAllowed(key)) {
      const config = rateLimitConfigs[operation];
      throw new RateLimitError(
        operation,
        config.windowMs,
        config.maxAttempts
      );
    }
    
    try {
      return await handler(...args);
    } catch (error) {
      // On error, reset the rate limit for this key to be more forgiving
      if (error instanceof Error && error.message.includes('401')) {
        // Don't reset for authentication failures
      } else {
        limiter.reset(key);
      }
      throw error;
    }
  }) as T;
}

// React hook for rate limiting
export function useRateLimit(operation: keyof typeof rateLimiters) {
  const [isLimited, setIsLimited] = React.useState(false);
  const [remainingAttempts, setRemainingAttempts] = React.useState(0);
  const [resetTime, setResetTime] = React.useState<Date | null>(null);
  
  const checkLimit = React.useCallback((key?: string) => {
    const limiter = rateLimiters[operation];
    const limitKey = key || operation;
    
    const allowed = limiter.isAllowed(limitKey);
    const remaining = limiter.getRemainingAttempts(limitKey);
    
    setIsLimited(!allowed);
    setRemainingAttempts(remaining);
    
    if (!allowed) {
      const config = rateLimitConfigs[operation];
      const resetDate = new Date(Date.now() + config.windowMs);
      setResetTime(resetDate);
    } else {
      setResetTime(null);
    }
    
    return allowed;
  }, [operation]);
  
  const reset = React.useCallback((key?: string) => {
    const limiter = rateLimiters[operation];
    const limitKey = key || operation;
    limiter.reset(limitKey);
    setIsLimited(false);
    setRemainingAttempts(rateLimitConfigs[operation].maxAttempts);
    setResetTime(null);
  }, [operation]);
  
  return {
    isLimited,
    remainingAttempts,
    resetTime,
    checkLimit,
    reset,
  };
}

// Rate limited API client wrapper
export class RateLimitedApiClient {
  private generalLimiter = rateLimiters.apiRequest;
  
  constructor(private baseClient: any) {}
  
  private async rateLimitedRequest<T>(
    method: string,
    endpoint: string,
    ...args: any[]
  ): Promise<T> {
    const key = `${method}:${endpoint}`;
    
    if (!this.generalLimiter.isAllowed(key)) {
      throw new RateLimitError(
        'API request',
        rateLimitConfigs.apiRequest.windowMs,
        rateLimitConfigs.apiRequest.maxAttempts
      );
    }
    
    try {
      return await this.baseClient[method](endpoint, ...args);
    } catch (error) {
      // Don't count server errors against rate limit
      if (error instanceof Error) {
        const message = error.message;
        if (message.includes('500') || message.includes('502') || message.includes('503')) {
          this.generalLimiter.reset(key);
        }
      }
      throw error;
    }
  }
  
  async get<T>(endpoint: string, options?: any): Promise<T> {
    return this.rateLimitedRequest<T>('get', endpoint, options);
  }
  
  async post<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.rateLimitedRequest<T>('post', endpoint, data, options);
  }
  
  async put<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.rateLimitedRequest<T>('put', endpoint, data, options);
  }
  
  async delete<T>(endpoint: string, options?: any): Promise<T> {
    return this.rateLimitedRequest<T>('delete', endpoint, options);
  }
}

// Component for displaying rate limit status
interface RateLimitStatusProps {
  operation: keyof typeof rateLimiters;
  className?: string;
}

export function RateLimitStatus({ operation, className }: RateLimitStatusProps) {
  const { isLimited, remainingAttempts, resetTime } = useRateLimit(operation);
  
  if (!isLimited && remainingAttempts > 3) {
    return null;
  }
  
  return (
    <div className={`text-sm ${className}`}>
      {isLimited ? (
        <p className="text-red-600">
          Rate limit exceeded. Try again at {resetTime?.toLocaleTimeString()}.
        </p>
      ) : (
        <p className="text-yellow-600">
          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining.
        </p>
      )}
    </div>
  );
}

import React from 'react';