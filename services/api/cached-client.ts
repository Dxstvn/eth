/**
 * Cached API Client for ClearHold
 * Extends the existing API client with intelligent caching capabilities
 */

import { apiClient } from './client'
import { cacheService, cacheUtils } from '@/utils/cache-service'
import { performanceMonitor } from '@/utils/performance-monitor'
import { ApiResponse, RequestOptions } from './types'

interface CacheConfig {
  enabled: boolean
  duration: number
  key?: string
  skipParams?: string[]
  validateCache?: (cached: any, fresh: any) => boolean
}

interface CachedRequestOptions extends RequestOptions {
  cache?: CacheConfig | boolean
}

class CachedApiClient {
  private static instance: CachedApiClient
  private defaultCacheConfig: CacheConfig = {
    enabled: true,
    duration: cacheUtils.durations.medium, // 30 minutes
    skipParams: ['timestamp', '_t', 'cache_bust']
  }

  public static getInstance(): CachedApiClient {
    if (!CachedApiClient.instance) {
      CachedApiClient.instance = new CachedApiClient()
    }
    return CachedApiClient.instance
  }

  /**
   * GET request with intelligent caching
   */
  async get<T>(
    endpoint: string, 
    options: CachedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { cache, ...apiOptions } = options
    const cacheConfig = this.resolveCacheConfig(cache)
    
    // Generate cache key
    const cacheKey = this.generateCacheKey('GET', endpoint, apiOptions.params, cacheConfig)
    
    // Try to get from cache first
    if (cacheConfig.enabled) {
      const stopTimer = performanceMonitor.startTiming('cache-lookup')
      const cached = await cacheService.get<ApiResponse<T>>(cacheKey)
      stopTimer()
      
      if (cached) {
        performanceMonitor.recordMetric('cache-hit', 1, { endpoint, method: 'GET' })
        return cached
      }
    }

    // Cache miss - fetch from API
    performanceMonitor.recordMetric('cache-miss', 1, { endpoint, method: 'GET' })
    const stopApiTimer = performanceMonitor.startTiming(`api-request-${endpoint}`)
    
    try {
      const response = await apiClient.get<T>(endpoint, apiOptions)
      stopApiTimer()
      
      // Cache successful responses
      if (cacheConfig.enabled && response.success) {
        await cacheService.set(cacheKey, response, {
          duration: cacheConfig.duration,
          persistent: this.shouldPersist(endpoint),
          version: this.getApiVersion()
        })
      }
      
      return response
    } catch (error) {
      stopApiTimer()
      throw error
    }
  }

  /**
   * POST request with selective caching
   */
  async post<T>(
    endpoint: string, 
    data?: any, 
    options: CachedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { cache, ...apiOptions } = options
    const cacheConfig = this.resolveCacheConfig(cache, false) // POST requests rarely cached by default
    
    const stopTimer = performanceMonitor.startTiming(`api-request-${endpoint}`)
    
    try {
      const response = await apiClient.post<T>(endpoint, data, apiOptions)
      stopTimer()
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(endpoint, 'POST')
      
      // Cache response if configured
      if (cacheConfig.enabled && response.success) {
        const cacheKey = this.generateCacheKey('POST', endpoint, { ...apiOptions.params, ...data }, cacheConfig)
        await cacheService.set(cacheKey, response, {
          duration: cacheConfig.duration,
          persistent: false, // POST responses rarely persisted
          version: this.getApiVersion()
        })
      }
      
      return response
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * PUT request with cache invalidation
   */
  async put<T>(
    endpoint: string, 
    data?: any, 
    options: CachedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const stopTimer = performanceMonitor.startTiming(`api-request-${endpoint}`)
    
    try {
      const response = await apiClient.put<T>(endpoint, data, options)
      stopTimer()
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(endpoint, 'PUT')
      
      return response
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * DELETE request with cache invalidation
   */
  async delete<T>(
    endpoint: string, 
    options: CachedRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const stopTimer = performanceMonitor.startTiming(`api-request-${endpoint}`)
    
    try {
      const response = await apiClient.delete<T>(endpoint, options)
      stopTimer()
      
      // Invalidate related cache entries
      this.invalidateRelatedCache(endpoint, 'DELETE')
      
      return response
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * Preload data into cache
   */
  async preload<T>(
    endpoint: string, 
    options: CachedRequestOptions = {}
  ): Promise<void> {
    try {
      await this.get<T>(endpoint, {
        ...options,
        cache: {
          enabled: true,
          duration: cacheUtils.durations.long,
          ...this.resolveCacheConfig(options.cache)
        }
      })
    } catch (error) {
      // Silently fail preloading
      console.warn('Failed to preload data:', endpoint, error)
    }
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidateCache(pattern: string | RegExp): Promise<void> {
    // This would require implementing pattern matching in cache service
    if (typeof pattern === 'string') {
      const keys = await this.getCacheKeys()
      const matchingKeys = keys.filter(key => key.includes(pattern))
      matchingKeys.forEach(key => cacheService.delete(key))
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats()
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    cacheService.clear()
  }

  private resolveCacheConfig(
    cache: CacheConfig | boolean | undefined, 
    defaultEnabled = true
  ): CacheConfig {
    if (cache === false) {
      return { ...this.defaultCacheConfig, enabled: false }
    }
    
    if (cache === true || cache === undefined) {
      return { ...this.defaultCacheConfig, enabled: defaultEnabled }
    }
    
    return { ...this.defaultCacheConfig, ...cache }
  }

  private generateCacheKey(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    cacheConfig?: CacheConfig
  ): string {
    // Use custom key if provided
    if (cacheConfig?.key) {
      return cacheConfig.key
    }

    // Filter out skip params
    const filteredParams = params ? { ...params } : {}
    if (cacheConfig?.skipParams) {
      cacheConfig.skipParams.forEach(param => {
        delete filteredParams[param]
      })
    }

    return cacheUtils.generateApiKey(`${method}:${endpoint}`, filteredParams)
  }

  private shouldPersist(endpoint: string): boolean {
    // Persist certain types of data
    const persistentEndpoints = [
      '/user/profile',
      '/transactions',
      '/contacts',
      '/settings'
    ]
    
    return persistentEndpoints.some(pattern => endpoint.includes(pattern))
  }

  private getApiVersion(): string {
    return process.env.NEXT_PUBLIC_API_VERSION || '1.0'
  }

  private invalidateRelatedCache(endpoint: string, method: string): void {
    // Intelligent cache invalidation based on endpoint patterns
    const invalidationRules = this.getInvalidationRules()
    
    for (const rule of invalidationRules) {
      if (rule.trigger.test(`${method}:${endpoint}`)) {
        rule.invalidate.forEach(pattern => {
          // This would require implementing pattern-based cache invalidation
          console.log(`Invalidating cache pattern: ${pattern}`)
        })
      }
    }
  }

  private getInvalidationRules() {
    return [
      {
        trigger: /POST:\/transactions/,
        invalidate: ['GET:/transactions', 'GET:/dashboard/stats']
      },
      {
        trigger: /PUT:\/transactions\/[^/]+/,
        invalidate: ['GET:/transactions', 'GET:/transactions/']
      },
      {
        trigger: /DELETE:\/transactions\/[^/]+/,
        invalidate: ['GET:/transactions']
      },
      {
        trigger: /POST:\/contacts/,
        invalidate: ['GET:/contacts']
      },
      {
        trigger: /PUT:\/user\/profile/,
        invalidate: ['GET:/user/profile']
      }
    ]
  }

  private async getCacheKeys(): Promise<string[]> {
    // This would require implementing key enumeration in cache service
    return []
  }
}

// Create and export singleton instance
export const cachedApiClient = CachedApiClient.getInstance()

// Re-export all methods from original API client for compatibility
export const {
  configure,
  interceptors,
  cancelRequest,
  cancelAllRequests
} = apiClient

// Export types
export type { CachedRequestOptions, CacheConfig }

// Utility functions for cache management
export const cacheApi = {
  // Preload common data
  preloadCommonData: async () => {
    const commonEndpoints = [
      '/user/profile',
      '/dashboard/stats',
      '/transactions?limit=10'
    ]

    await Promise.allSettled(
      commonEndpoints.map(endpoint => 
        cachedApiClient.preload(endpoint, {
          cache: {
            enabled: true,
            duration: cacheUtils.durations.long
          }
        })
      )
    )
  },

  // Invalidate user-specific cache on logout
  invalidateUserCache: () => {
    cachedApiClient.invalidateCache('user_')
    cachedApiClient.invalidateCache('transactions_')
    cachedApiClient.invalidateCache('contacts_')
  },

  // Warm up cache for specific user
  warmUpUserCache: async (userId: string) => {
    const userEndpoints = [
      `/user/${userId}/profile`,
      `/user/${userId}/transactions`,
      `/user/${userId}/contacts`
    ]

    await Promise.allSettled(
      userEndpoints.map(endpoint => 
        cachedApiClient.preload(endpoint, {
          cache: {
            enabled: true,
            duration: cacheUtils.durations.medium
          }
        })
      )
    )
  }
}