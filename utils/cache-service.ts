/**
 * Frontend caching service for ClearHold
 * Implements multiple caching strategies for optimal performance
 */

// Cache configuration
const CACHE_CONFIG = {
  // Cache durations in milliseconds
  durations: {
    short: 5 * 60 * 1000,      // 5 minutes
    medium: 30 * 60 * 1000,    // 30 minutes
    long: 24 * 60 * 60 * 1000, // 24 hours
    persistent: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  // Maximum cache sizes
  limits: {
    memory: 100,    // 100 items in memory cache
    storage: 50,    // 50 items in localStorage
    api: 200        // 200 API responses
  },
  // Cache keys
  keys: {
    api: 'clearhold_api_cache',
    user: 'clearhold_user_cache',
    static: 'clearhold_static_cache',
    transactions: 'clearhold_transactions_cache'
  }
}

interface CacheItem<T = any> {
  data: T
  timestamp: number
  expiry: number
  key: string
  version?: string
}

interface CacheOptions {
  duration?: number
  persistent?: boolean
  version?: string
  compress?: boolean
}

class CacheService {
  private memoryCache = new Map<string, CacheItem>()
  private compressionSupported = false

  constructor() {
    this.init()
  }

  private async init() {
    // Check compression support
    this.compressionSupported = 'CompressionStream' in window
    
    // Clean up expired cache on startup
    this.cleanup()
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 10 * 60 * 1000) // Every 10 minutes
  }

  /**
   * Store data in cache with specified duration and options
   */
  async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      duration = CACHE_CONFIG.durations.medium,
      persistent = false,
      version = '1',
      compress = false
    } = options

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
      key,
      version
    }

    // Store in memory cache
    this.memoryCache.set(key, cacheItem)
    this.enforceSizeLimit(this.memoryCache, CACHE_CONFIG.limits.memory)

    // Store in persistent cache if requested
    if (persistent && typeof window !== 'undefined') {
      try {
        let serializedData = JSON.stringify(cacheItem)
        
        // Compress if supported and requested
        if (compress && this.compressionSupported) {
          serializedData = await this.compress(serializedData)
        }
        
        localStorage.setItem(`${CACHE_CONFIG.keys.static}_${key}`, serializedData)
      } catch (error) {
        console.warn('Failed to store in persistent cache:', error)
      }
    }
  }

  /**
   * Retrieve data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data
    }

    // Check persistent cache
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${CACHE_CONFIG.keys.static}_${key}`)
        if (stored) {
          let parsedItem: CacheItem<T>
          
          // Try to decompress if needed
          try {
            parsedItem = JSON.parse(stored)
          } catch {
            // Might be compressed
            const decompressed = await this.decompress(stored)
            parsedItem = JSON.parse(decompressed)
          }
          
          if (!this.isExpired(parsedItem)) {
            // Restore to memory cache
            this.memoryCache.set(key, parsedItem)
            return parsedItem.data
          } else {
            // Remove expired item
            localStorage.removeItem(`${CACHE_CONFIG.keys.static}_${key}`)
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve from persistent cache:', error)
      }
    }

    return null
  }

  /**
   * Check if cached data exists and is valid
   */
  has(key: string): boolean {
    const memoryItem = this.memoryCache.get(key)
    if (memoryItem && !this.isExpired(memoryItem)) {
      return true
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${CACHE_CONFIG.keys.static}_${key}`)
      if (stored) {
        try {
          const parsedItem: CacheItem = JSON.parse(stored)
          return !this.isExpired(parsedItem)
        } catch {
          return false
        }
      }
    }

    return false
  }

  /**
   * Remove item from cache
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${CACHE_CONFIG.keys.static}_${key}`)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear()
    if (typeof window !== 'undefined') {
      Object.values(CACHE_CONFIG.keys).forEach(prefix => {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
        keys.forEach(key => localStorage.removeItem(key))
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size
    let persistentSize = 0
    
    if (typeof window !== 'undefined') {
      persistentSize = Object.keys(localStorage)
        .filter(key => Object.values(CACHE_CONFIG.keys).some(prefix => key.startsWith(prefix)))
        .length
    }

    return {
      memory: {
        size: memorySize,
        limit: CACHE_CONFIG.limits.memory,
        utilization: (memorySize / CACHE_CONFIG.limits.memory) * 100
      },
      persistent: {
        size: persistentSize,
        limit: CACHE_CONFIG.limits.storage,
        utilization: (persistentSize / CACHE_CONFIG.limits.storage) * 100
      }
    }
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiry
  }

  private enforceSizeLimit(cache: Map<string, CacheItem>, limit: number): void {
    if (cache.size <= limit) return

    // Remove oldest items first (LRU-like behavior)
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toRemove = entries.slice(0, cache.size - limit)
    toRemove.forEach(([key]) => cache.delete(key))
  }

  private cleanup(): void {
    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key)
      }
    }

    // Clean persistent cache
    if (typeof window !== 'undefined') {
      Object.values(CACHE_CONFIG.keys).forEach(prefix => {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
        keys.forEach(key => {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const item: CacheItem = JSON.parse(stored)
              if (this.isExpired(item)) {
                localStorage.removeItem(key)
              }
            }
          } catch {
            // Remove corrupted entries
            localStorage.removeItem(key)
          }
        })
      })
    }
  }

  private async compress(data: string): Promise<string> {
    if (!this.compressionSupported) return data
    
    try {
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      writer.write(new TextEncoder().encode(data))
      writer.close()
      
      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }
      
      return btoa(String.fromCharCode(...compressed))
    } catch {
      return data
    }
  }

  private async decompress(data: string): Promise<string> {
    if (!this.compressionSupported) return data
    
    try {
      const compressed = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)))
      const stream = new DecompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      writer.write(compressed)
      writer.close()
      
      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }
      
      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }
      
      return new TextDecoder().decode(decompressed)
    } catch {
      return data
    }
  }
}

// API Response Cache
class ApiCache {
  private cache = new Map<string, CacheItem>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (item && !this.isExpired(item)) {
      return item.data
    }
    if (item) {
      this.cache.delete(key)
    }
    return null
  }

  set<T>(key: string, data: T, duration: number = CACHE_CONFIG.durations.medium): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
      key
    }
    
    this.cache.set(key, item)
    this.enforceSizeLimit()
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiry
  }

  private enforceSizeLimit(): void {
    if (this.cache.size <= CACHE_CONFIG.limits.api) return

    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const toRemove = entries.slice(0, this.cache.size - CACHE_CONFIG.limits.api)
    toRemove.forEach(([key]) => this.cache.delete(key))
  }

  clear(): void {
    this.cache.clear()
  }
}

// Export instances
export const cacheService = new CacheService()
export const apiCache = new ApiCache()

// Cache utilities
export const cacheUtils = {
  // Generate cache key for API calls
  generateApiKey: (endpoint: string, params?: Record<string, any>): string => {
    const paramString = params ? JSON.stringify(params) : ''
    return `api_${endpoint.replace(/\//g, '_')}_${btoa(paramString)}`
  },

  // Generate cache key for user data
  generateUserKey: (userId: string, dataType: string): string => {
    return `user_${userId}_${dataType}`
  },

  // Cache durations
  durations: CACHE_CONFIG.durations,

  // Cache with automatic key generation
  cacheApiResponse: async <T>(
    endpoint: string, 
    data: T, 
    params?: Record<string, any>,
    duration?: number
  ): Promise<void> => {
    const key = cacheUtils.generateApiKey(endpoint, params)
    await cacheService.set(key, data, { duration })
  },

  // Get cached API response
  getCachedApiResponse: async <T>(
    endpoint: string, 
    params?: Record<string, any>
  ): Promise<T | null> => {
    const key = cacheUtils.generateApiKey(endpoint, params)
    return await cacheService.get<T>(key)
  }
}

// Hook for React components
export function useCache() {
  return {
    set: cacheService.set.bind(cacheService),
    get: cacheService.get.bind(cacheService),
    has: cacheService.has.bind(cacheService),
    delete: cacheService.delete.bind(cacheService),
    clear: cacheService.clear.bind(cacheService),
    stats: cacheService.getStats.bind(cacheService)
  }
}