import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from '@/services/api/client';
import { ApiException } from '@/services/api/types';
import { apiLogger } from '@/services/api/logger';
import { requestQueue } from '@/services/api/request-queue';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Helper function to create mock Response objects
const createMockResponse = (data: any, options: { ok?: boolean; status?: number } = {}) => {
  const response = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => data,
    clone: () => response // Necessary for response cloning
  };
  return response;
};

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = ApiClient.getInstance();
    (navigator as any).onLine = true;
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponseData = { id: 1, name: 'Test' };
      const mockResponse = { data: mockResponseData };
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.get('/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponseData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should make successful POST request with data', async () => {
      const requestData = { name: 'Test User' };
      const mockResponseData = { id: 1, ...requestData };
      const mockResponse = { data: mockResponseData };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(mockResponse, { status: 201 }));

      const result = await client.post('/users', requestData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponseData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      );
    });

    it('should handle API errors correctly', async () => {
      const errorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data'
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse(errorResponse, { ok: false, status: 400 }));

      await expect(client.post('/test', {})).rejects.toThrow(ApiException);
    });

    it('should retry on retryable errors', async () => {
      const mockResponseData = 'Success';
      const mockResponse = { data: mockResponseData };
      
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(createMockResponse({ message: 'Service unavailable' }, { ok: false, status: 503 }))
        .mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await client.get('/test');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponseData);
    });

    it('should not retry on non-retryable errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse({ message: 'Not found' }, { ok: false, status: 404 }));

      await expect(client.get('/test')).rejects.toThrow(ApiException);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        })
      );

      await expect(
        client.get('/test', { timeout: 50 })
      ).rejects.toThrow(ApiException);
    });

    it('should add auth token when available', async () => {
      const mockToken = 'test-jwt-token';
      localStorageMock.getItem.mockReturnValueOnce(mockToken);
      
      // Mock token parsing
      const mockPayload = btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }));
      vi.spyOn(window, 'atob').mockReturnValueOnce(
        JSON.stringify({ exp: Date.now() / 1000 + 3600 })
      );

      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse({ data: 'Success' }));

      await client.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
    });

    it('should queue requests when offline', async () => {
      (navigator as any).onLine = false;
      const queueSpy = vi.spyOn(requestQueue, 'addToQueue');

      const result = await client.post('/test', { data: 'test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('queued');
      expect(queueSpy).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockResolvedValue(createMockResponse({ data: 'Success' }));
    });

    it('should support GET requests', async () => {
      await client.get('/test');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support POST requests', async () => {
      await client.post('/test', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should support PUT requests', async () => {
      await client.put('/test', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should support PATCH requests', async () => {
      await client.patch('/test', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should support DELETE requests', async () => {
      await client.delete('/test');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('request cancellation', () => {
    it('should cancel all requests', () => {
      const abortSpy = vi.fn();
      (client as any).abortControllers.set('test-1', { abort: abortSpy });
      (client as any).abortControllers.set('test-2', { abort: abortSpy });

      client.cancelAllRequests();

      expect(abortSpy).toHaveBeenCalledTimes(2);
      expect((client as any).abortControllers.size).toBe(0);
    });

    it('should cancel requests for specific endpoint', () => {
      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();
      (client as any).abortControllers.set('GET-/users-123', { abort: abortSpy1 });
      (client as any).abortControllers.set('GET-/posts-456', { abort: abortSpy2 });

      client.cancelRequestsForEndpoint('/users');

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).not.toHaveBeenCalled();
    });
  });

  describe('interceptors', () => {
    it('should support custom request interceptors', async () => {
      const customHeader = 'X-Custom-Header';
      const removeInterceptor = client.addRequestInterceptor((config) => {
        const headers = new Headers(config.headers);
        headers.set(customHeader, 'test-value');
        return { ...config, headers };
      });

      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse({ data: 'Success' }));

      await client.get('/test');

      const call = vi.mocked(global.fetch).mock.calls[0];
      const headers = call[1].headers;
      expect(headers.get(customHeader)).toBe('test-value');

      // Clean up
      removeInterceptor();
    });
  });

  describe('logging and debugging', () => {
    it('should log API requests in debug mode', async () => {
      const logSpy = vi.spyOn(apiLogger, 'log');
      
      client.configure({ debug: true });
      
      vi.mocked(global.fetch).mockResolvedValueOnce(createMockResponse({ data: 'Success' }));

      await client.get('/test');

      expect(logSpy).toHaveBeenCalled();
    });

    it('should export logs', () => {
      const logs = client.exportLogs();
      expect(typeof logs).toBe('string');
      expect(() => JSON.parse(logs)).not.toThrow();
    });
  });

  describe('offline queue management', () => {
    it('should get queue status', () => {
      const status = client.getQueueStatus();
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('queuedRequests');
    });

    it('should clear offline queue', () => {
      const clearSpy = vi.spyOn(requestQueue, 'clearQueue');
      client.clearOfflineQueue();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});