import { ClientRateLimiter, createRateLimitedClient } from '../rate-limiter';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'

describe('ClientRateLimiter', () => {
  let rateLimiter: ClientRateLimiter;

  beforeEach(() => {
    rateLimiter = new ClientRateLimiter({
      maxRequests: 3,
      windowMs: 1000, // 1 second window
      backoffMultiplier: 2,
      maxBackoffMs: 5000
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      expect(await rateLimiter.checkLimit('/test')).toBe(true);
      expect(await rateLimiter.checkLimit('/test')).toBe(true);
      expect(await rateLimiter.checkLimit('/test')).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      // Use up the limit
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');

      // Should be blocked
      expect(await rateLimiter.checkLimit('/test')).toBe(false);
    });

    it('should reset after window expires', async () => {
      // Use up the limit
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');

      // Should be blocked
      expect(await rateLimiter.checkLimit('/test')).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      expect(await rateLimiter.checkLimit('/test')).toBe(true);
    });

    it('should track different endpoints separately', async () => {
      // Use up limit for /test
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      expect(await rateLimiter.checkLimit('/test')).toBe(false);

      // /other should still be allowed
      expect(await rateLimiter.checkLimit('/other')).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', async () => {
      expect(rateLimiter.getRemainingRequests('/test')).toBe(3);

      await rateLimiter.checkLimit('/test');
      expect(rateLimiter.getRemainingRequests('/test')).toBe(2);

      await rateLimiter.checkLimit('/test');
      expect(rateLimiter.getRemainingRequests('/test')).toBe(1);

      await rateLimiter.checkLimit('/test');
      expect(rateLimiter.getRemainingRequests('/test')).toBe(0);
    });
  });

  describe('recordRequest', () => {
    it('should update rate limit info from headers', () => {
      const headers = {
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': new Date(Date.now() + 60000).toISOString()
      };

      rateLimiter.recordRequest('/test', headers);
      const info = rateLimiter.getRateLimitInfo('/test');

      expect(info?.limit).toBe(10);
      expect(info?.remaining).toBe(5);
      expect(info?.reset).toBeInstanceOf(Date);
    });

    it('should trigger rate limit when remaining is 0', () => {
      const headers = {
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': new Date(Date.now() + 60000).toISOString(),
        'retry-after': '60'
      };

      rateLimiter.recordRequest('/test', headers);
      expect(rateLimiter.isRateLimited('/test')).toBe(true);
    });
  });

  describe('handleRateLimitError', () => {
    it('should set rate limited state with backoff', () => {
      rateLimiter.handleRateLimitError('/test', 30);

      expect(rateLimiter.isRateLimited('/test')).toBe(true);
      const info = rateLimiter.getRateLimitInfo('/test');
      expect(info?.retryAfter).toBe(30);
    });

    it('should apply exponential backoff', () => {
      // First rate limit
      rateLimiter.handleRateLimitError('/test');
      
      // Wait for recovery
      vi.advanceTimersByTime(2000);
      
      // Second rate limit should have longer backoff
      rateLimiter.handleRateLimitError('/test');
      const info = rateLimiter.getRateLimitInfo('/test');
      
      // Should be at least 2x the initial backoff
      expect(info?.retryAfter).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reset', () => {
    it('should clear all rate limit data', async () => {
      // Use up limit
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      
      expect(rateLimiter.getRemainingRequests('/test')).toBe(0);

      // Reset
      rateLimiter.reset('/test');

      expect(rateLimiter.getRemainingRequests('/test')).toBe(3);
      expect(rateLimiter.isRateLimited('/test')).toBe(false);
    });
  });

  describe('event emitter', () => {
    it('should emit rate-limited event', async () => {
      const listener = vi.fn();
      rateLimiter.on('rate-limited', listener);

      // Use up limit
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      
      // This should trigger rate limit
      await rateLimiter.checkLimit('/test');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/test',
          info: expect.objectContaining({
            limit: 3,
            remaining: 0
          })
        })
      );
    });

    it('should emit recovered event', (done) => {
      rateLimiter.on('recovered', (data) => {
        expect(data.endpoint).toBe('/test');
        done();
      });

      rateLimiter.handleRateLimitError('/test', 0.1); // 100ms backoff
    });
  });

  describe('getStats', () => {
    it('should return statistics for all endpoints', async () => {
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/test');
      await rateLimiter.checkLimit('/other');

      const stats = rateLimiter.getStats();

      expect(stats['/test']).toEqual({
        requests: 2,
        remaining: 1,
        isRateLimited: false,
        rateLimitInfo: expect.any(Object)
      });

      expect(stats['/other']).toEqual({
        requests: 1,
        remaining: 2,
        isRateLimited: false,
        rateLimitInfo: expect.any(Object)
      });
    });
  });
});

describe('createRateLimitedClient', () => {
  let mockClient: any;
  let rateLimitedClient: any;

  beforeEach(() => {
    mockClient = {
      get: vi.fn().mockResolvedValue({ data: 'success', headers: {} }),
      post: vi.fn().mockResolvedValue({ data: 'success', headers: {} }),
      put: vi.fn().mockResolvedValue({ data: 'success', headers: {} }),
      delete: vi.fn().mockResolvedValue({ data: 'success', headers: {} })
    };

    rateLimitedClient = createRateLimitedClient(mockClient, {
      maxRequests: 2,
      windowMs: 1000
    });
  });

  it('should allow requests within limit', async () => {
    await rateLimitedClient.get('/test');
    await rateLimitedClient.get('/test');

    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  it('should block requests exceeding limit', async () => {
    await rateLimitedClient.get('/test');
    await rateLimitedClient.get('/test');

    await expect(rateLimitedClient.get('/test')).rejects.toThrow('Rate limit exceeded');
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  it('should handle 429 responses', async () => {
    const error = new Error('Too Many Requests');
    (error as any).response = {
      status: 429,
      headers: {
        'retry-after': '60'
      }
    };
    mockClient.post.mockRejectedValueOnce(error);

    await expect(rateLimitedClient.post('/test', {})).rejects.toThrow();

    // Should be rate limited now
    await expect(rateLimitedClient.post('/test', {})).rejects.toThrow('Rate limit exceeded');
  });

  it('should update rate limit from response headers', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: 'success',
      headers: {
        'x-ratelimit-limit': '5',
        'x-ratelimit-remaining': '4',
        'x-ratelimit-reset': new Date(Date.now() + 60000).toISOString()
      }
    });

    await rateLimitedClient.get('/test');

    const limiter = rateLimitedClient.getRateLimiter('/test');
    const info = limiter.getRateLimitInfo('/test');

    expect(info?.limit).toBe(5);
    expect(info?.remaining).toBe(4);
  });

  it('should track different methods separately', async () => {
    await rateLimitedClient.get('/test');
    await rateLimitedClient.get('/test');

    // GET should be rate limited
    await expect(rateLimitedClient.get('/test')).rejects.toThrow('Rate limit exceeded');

    // POST should still work
    await expect(rateLimitedClient.post('/test', {})).resolves.toEqual({ 
      data: 'success', 
      headers: {} 
    });
  });
});