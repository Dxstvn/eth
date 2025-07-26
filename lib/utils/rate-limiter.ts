import { EventEmitter } from 'events';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  onRateLimited?: (info: RateLimitInfo) => void;
  onRecovered?: () => void;
}

export interface RateLimitHeaders {
  'x-ratelimit-limit'?: string;
  'x-ratelimit-remaining'?: string;
  'x-ratelimit-reset'?: string;
  'retry-after'?: string;
}

class RateLimitEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

/**
 * Client-side rate limiter with exponential backoff and visual feedback support
 */
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private backoffTimers: Map<string, NodeJS.Timeout> = new Map();
  private backoffDurations: Map<string, number> = new Map();
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();
  private eventEmitter = new RateLimitEventEmitter();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request is allowed
   */
  public async checkLimit(endpoint: string): Promise<boolean> {
    const now = Date.now();
    const key = this.getKey(endpoint);

    // Check if we're in backoff period
    if (this.backoffTimers.has(key)) {
      const info = this.rateLimitInfo.get(key);
      if (info) {
        this.config.onRateLimited?.(info);
        this.eventEmitter.emit('rate-limited', { endpoint, info });
      }
      return false;
    }

    // Get or initialize request timestamps
    const timestamps = this.requests.get(key) || [];
    
    // Remove expired timestamps
    const validTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    // Check if limit exceeded
    if (validTimestamps.length >= this.config.maxRequests) {
      const oldestTimestamp = validTimestamps[0];
      const resetTime = new Date(oldestTimestamp + this.config.windowMs);
      const info: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining: 0,
        reset: resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now) / 1000)
      };
      
      this.rateLimitInfo.set(key, info);
      this.startBackoff(key, info.retryAfter! * 1000);
      this.config.onRateLimited?.(info);
      this.eventEmitter.emit('rate-limited', { endpoint, info });
      return false;
    }

    // Add current request timestamp
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    // Update rate limit info
    const info: RateLimitInfo = {
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - validTimestamps.length,
      reset: new Date(now + this.config.windowMs)
    };
    this.rateLimitInfo.set(key, info);
    this.eventEmitter.emit('request-allowed', { endpoint, info });

    return true;
  }

  /**
   * Record a request and update rate limit info from response headers
   */
  public recordRequest(endpoint: string, headers: RateLimitHeaders) {
    const key = this.getKey(endpoint);
    
    // Parse rate limit headers
    const limit = headers['x-ratelimit-limit'] ? 
      parseInt(headers['x-ratelimit-limit']) : this.config.maxRequests;
    const remaining = headers['x-ratelimit-remaining'] ? 
      parseInt(headers['x-ratelimit-remaining']) : undefined;
    const reset = headers['x-ratelimit-reset'] ? 
      new Date(headers['x-ratelimit-reset']) : undefined;
    const retryAfter = headers['retry-after'] ? 
      parseInt(headers['retry-after']) : undefined;

    // Update rate limit info
    const info: RateLimitInfo = {
      limit,
      remaining: remaining ?? this.getRemainingRequests(endpoint),
      reset: reset ?? new Date(Date.now() + this.config.windowMs),
      retryAfter
    };

    this.rateLimitInfo.set(key, info);
    this.eventEmitter.emit('headers-updated', { endpoint, info });

    // If rate limited, start backoff
    if (remaining === 0 && retryAfter) {
      this.startBackoff(key, retryAfter * 1000);
      this.config.onRateLimited?.(info);
      this.eventEmitter.emit('rate-limited', { endpoint, info });
    }
  }

  /**
   * Handle rate limit error (429 response)
   */
  public handleRateLimitError(endpoint: string, retryAfter?: number) {
    const key = this.getKey(endpoint);
    const backoffMs = this.calculateBackoff(key, retryAfter);
    
    const info: RateLimitInfo = {
      limit: this.config.maxRequests,
      remaining: 0,
      reset: new Date(Date.now() + backoffMs),
      retryAfter: Math.ceil(backoffMs / 1000)
    };

    this.rateLimitInfo.set(key, info);
    this.startBackoff(key, backoffMs);
    this.config.onRateLimited?.(info);
    this.eventEmitter.emit('rate-limited', { endpoint, info });
  }

  /**
   * Get remaining requests for an endpoint
   */
  public getRemainingRequests(endpoint: string): number {
    const key = this.getKey(endpoint);
    const info = this.rateLimitInfo.get(key);
    
    if (info) {
      return info.remaining;
    }

    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.config.windowMs
    );

    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  /**
   * Get rate limit info for an endpoint
   */
  public getRateLimitInfo(endpoint: string): RateLimitInfo | null {
    const key = this.getKey(endpoint);
    return this.rateLimitInfo.get(key) || null;
  }

  /**
   * Check if endpoint is currently rate limited
   */
  public isRateLimited(endpoint: string): boolean {
    const key = this.getKey(endpoint);
    return this.backoffTimers.has(key);
  }

  /**
   * Reset rate limit for an endpoint
   */
  public reset(endpoint: string) {
    const key = this.getKey(endpoint);
    this.requests.delete(key);
    this.rateLimitInfo.delete(key);
    this.clearBackoff(key);
    this.eventEmitter.emit('reset', { endpoint });
  }

  /**
   * Subscribe to rate limit events
   */
  public on(event: 'rate-limited' | 'request-allowed' | 'headers-updated' | 'reset' | 'recovered', 
    listener: (data: any) => void) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from rate limit events
   */
  public off(event: string, listener: (data: any) => void) {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Get statistics for monitoring
   */
  public getStats() {
    const stats: Record<string, any> = {};
    
    for (const [key, timestamps] of this.requests.entries()) {
      const endpoint = key.replace(/-.*$/, '');
      const validTimestamps = timestamps.filter(
        timestamp => Date.now() - timestamp < this.config.windowMs
      );
      
      stats[endpoint] = {
        requests: validTimestamps.length,
        remaining: Math.max(0, this.config.maxRequests - validTimestamps.length),
        isRateLimited: this.backoffTimers.has(key),
        rateLimitInfo: this.rateLimitInfo.get(key)
      };
    }

    return stats;
  }

  private getKey(endpoint: string): string {
    // Include a timestamp component for sliding window
    const windowStart = Math.floor(Date.now() / this.config.windowMs);
    return `${endpoint}-${windowStart}`;
  }

  private startBackoff(key: string, duration: number) {
    // Clear existing timer
    this.clearBackoff(key);

    // Set backoff timer
    const timer = setTimeout(() => {
      this.clearBackoff(key);
      this.config.onRecovered?.();
      this.eventEmitter.emit('recovered', { endpoint: key.replace(/-.*$/, '') });
    }, duration);

    this.backoffTimers.set(key, timer);
    this.backoffDurations.set(key, duration);
  }

  private clearBackoff(key: string) {
    const timer = this.backoffTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.backoffTimers.delete(key);
      this.backoffDurations.delete(key);
    }
  }

  private calculateBackoff(key: string, suggestedRetryAfter?: number): number {
    if (suggestedRetryAfter) {
      return suggestedRetryAfter * 1000;
    }

    const multiplier = this.config.backoffMultiplier || 2;
    const maxBackoff = this.config.maxBackoffMs || 60000;
    const lastBackoff = this.backoffDurations.get(key) || 1000;
    
    return Math.min(lastBackoff * multiplier, maxBackoff);
  }
}

/**
 * React hook for rate limiting
 */
export function useClientRateLimit(endpoint: string, config: RateLimitConfig) {
  const [rateLimitInfo, setRateLimitInfo] = React.useState<RateLimitInfo | null>(null);
  const [isRateLimited, setIsRateLimited] = React.useState(false);
  const rateLimiterRef = React.useRef<ClientRateLimiter>();

  React.useEffect(() => {
    if (!rateLimiterRef.current) {
      rateLimiterRef.current = new ClientRateLimiter({
        ...config,
        onRateLimited: (info) => {
          setRateLimitInfo(info);
          setIsRateLimited(true);
          config.onRateLimited?.(info);
        },
        onRecovered: () => {
          setIsRateLimited(false);
          config.onRecovered?.();
        }
      });
    }

    const limiter = rateLimiterRef.current;

    const handleRateLimited = ({ info }: any) => {
      setRateLimitInfo(info);
      setIsRateLimited(true);
    };

    const handleRecovered = () => {
      setIsRateLimited(false);
    };

    const handleHeadersUpdated = ({ info }: any) => {
      setRateLimitInfo(info);
    };

    limiter.on('rate-limited', handleRateLimited);
    limiter.on('recovered', handleRecovered);
    limiter.on('headers-updated', handleHeadersUpdated);

    return () => {
      limiter.off('rate-limited', handleRateLimited);
      limiter.off('recovered', handleRecovered);
      limiter.off('headers-updated', handleHeadersUpdated);
    };
  }, [config]);

  const checkLimit = React.useCallback(async () => {
    if (!rateLimiterRef.current) return true;
    return rateLimiterRef.current.checkLimit(endpoint);
  }, [endpoint]);

  const recordRequest = React.useCallback((headers: RateLimitHeaders) => {
    if (!rateLimiterRef.current) return;
    rateLimiterRef.current.recordRequest(endpoint, headers);
  }, [endpoint]);

  const handleError = React.useCallback((retryAfter?: number) => {
    if (!rateLimiterRef.current) return;
    rateLimiterRef.current.handleRateLimitError(endpoint, retryAfter);
  }, [endpoint]);

  const reset = React.useCallback(() => {
    if (!rateLimiterRef.current) return;
    rateLimiterRef.current.reset(endpoint);
    setIsRateLimited(false);
    setRateLimitInfo(null);
  }, [endpoint]);

  const getRemainingRequests = React.useCallback(() => {
    if (!rateLimiterRef.current) return 0;
    return rateLimiterRef.current.getRemainingRequests(endpoint);
  }, [endpoint]);

  return {
    isRateLimited,
    rateLimitInfo,
    checkLimit,
    recordRequest,
    handleError,
    reset,
    getRemainingRequests
  };
}

/**
 * Create a rate-limited API client wrapper
 */
export function createRateLimitedClient(
  baseClient: any,
  defaultConfig: RateLimitConfig
) {
  const rateLimiters = new Map<string, ClientRateLimiter>();

  const getRateLimiter = (endpoint: string): ClientRateLimiter => {
    if (!rateLimiters.has(endpoint)) {
      rateLimiters.set(endpoint, new ClientRateLimiter(defaultConfig));
    }
    return rateLimiters.get(endpoint)!;
  };

  const wrapMethod = (method: string) => {
    return async (endpoint: string, ...args: any[]) => {
      const limiter = getRateLimiter(endpoint);
      
      // Check rate limit
      const allowed = await limiter.checkLimit(endpoint);
      if (!allowed) {
        const info = limiter.getRateLimitInfo(endpoint);
        const error = new Error(`Rate limit exceeded. Retry after ${info?.retryAfter} seconds`);
        (error as any).code = 'RATE_LIMITED';
        (error as any).rateLimitInfo = info;
        throw error;
      }

      try {
        // Make request
        const response = await baseClient[method](endpoint, ...args);
        
        // Record request and update from headers
        if (response.headers) {
          limiter.recordRequest(endpoint, response.headers);
        }

        return response;
      } catch (error: any) {
        // Handle 429 responses
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers?.['retry-after'];
          limiter.handleRateLimitError(endpoint, retryAfter);
        }
        throw error;
      }
    };
  };

  return {
    get: wrapMethod('get'),
    post: wrapMethod('post'),
    put: wrapMethod('put'),
    patch: wrapMethod('patch'),
    delete: wrapMethod('delete'),
    getRateLimiter,
    getStats: () => {
      const stats: Record<string, any> = {};
      for (const [endpoint, limiter] of rateLimiters.entries()) {
        stats[endpoint] = limiter.getStats();
      }
      return stats;
    }
  };
}

// Import React for hooks
import React from 'react';