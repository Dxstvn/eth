/**
 * Performance optimization hooks for ClearHold
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { performanceMonitor, useComponentPerformance } from '@/utils/performance-monitor'
import { cacheService, useCache } from '@/utils/cache-service'
import { setupPreloading } from '@/utils/dynamic-imports'

/**
 * Hook for component performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  useComponentPerformance(componentName)
  
  return {
    startTimer: (metricName: string) => performanceMonitor.startTiming(metricName),
    recordMetric: (name: string, value: number, context?: Record<string, any>) => 
      performanceMonitor.recordMetric(name, value, context)
  }
}

/**
 * Hook for lazy loading and intersection observer
 */
export function useLazyLoading(options: {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
} = {}) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options

  useEffect(() => {
    const element = elementRef.current
    if (!element || (triggerOnce && hasLoaded)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          setHasLoaded(true)
          
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, hasLoaded])

  return {
    elementRef,
    isInView,
    hasLoaded
  }
}

/**
 * Hook for resource preloading
 */
export function usePreload() {
  const preloadedResources = useRef(new Set<string>())

  const preloadImage = useCallback((src: string) => {
    if (preloadedResources.current.has(src)) return

    const img = new Image()
    img.src = src
    preloadedResources.current.add(src)
  }, [])

  const preloadScript = useCallback((src: string) => {
    if (preloadedResources.current.has(src)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'script'
    link.href = src
    document.head.appendChild(link)
    preloadedResources.current.add(src)
  }, [])

  const preloadStyle = useCallback((href: string) => {
    if (preloadedResources.current.has(href)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    document.head.appendChild(link)
    preloadedResources.current.add(href)
  }, [])

  const preloadFont = useCallback((href: string, type = 'font/woff2') => {
    if (preloadedResources.current.has(href)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = type
    link.href = href
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
    preloadedResources.current.add(href)
  }, [])

  return {
    preloadImage,
    preloadScript,
    preloadStyle,
    preloadFont
  }
}

/**
 * Hook for debounced values (performance optimization for search, etc.)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttled callbacks (performance optimization for scroll, resize, etc.)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

/**
 * Hook for optimized API calls with caching
 */
export function useOptimizedApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  cacheKey?: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const cache = useCache()

  const optimizedCall = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Try cache first if key provided
      if (cacheKey) {
        const cached = await cache.get<T>(cacheKey)
        if (cached) {
          setData(cached)
          setLoading(false)
          return cached
        }
      }

      // Make API call
      const result = await apiCall()
      setData(result)

      // Cache result if key provided
      if (cacheKey && result) {
        await cache.set(cacheKey, result, { duration: 5 * 60 * 1000 }) // 5 minutes
      }

      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      return null
    } finally {
      setLoading(false)
    }
  }, [apiCall, cacheKey, cache])

  useEffect(() => {
    optimizedCall()
  }, dependencies)

  const refetch = useCallback(() => {
    return optimizedCall()
  }, [optimizedCall])

  return {
    data,
    loading,
    error,
    refetch
  }
}

/**
 * Hook for virtual scrolling (performance optimization for large lists)
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, 16) // ~60fps

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY
  }
}

/**
 * Hook for image optimization
 */
export function useImageOptimization() {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null)
  const [supportsAVIF, setSupportsAVIF] = useState<boolean | null>(null)

  useEffect(() => {
    // Check WebP support
    const webp = new Image()
    webp.onload = webp.onerror = () => {
      setSupportsWebP(webp.height === 2)
    }
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'

    // Check AVIF support
    const avif = new Image()
    avif.onload = avif.onerror = () => {
      setSupportsAVIF(avif.height === 2)
    }
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
  }, [])

  const getOptimalFormat = useCallback((originalSrc: string) => {
    if (!originalSrc) return originalSrc

    const url = new URL(originalSrc, window.location.origin)
    
    // Add format parameter based on support
    if (supportsAVIF) {
      url.searchParams.set('format', 'avif')
    } else if (supportsWebP) {
      url.searchParams.set('format', 'webp')
    }

    return url.toString()
  }, [supportsWebP, supportsAVIF])

  const getResponsiveSizes = useCallback((breakpoints: Record<string, string>) => {
    return Object.entries(breakpoints)
      .map(([breakpoint, size]) => `(max-width: ${breakpoint}) ${size}`)
      .join(', ')
  }, [])

  return {
    supportsWebP,
    supportsAVIF,
    getOptimalFormat,
    getResponsiveSizes
  }
}

/**
 * Hook for setting up performance optimizations on mount
 */
export function usePerformanceSetup() {
  useEffect(() => {
    // Set up component preloading
    setupPreloading()

    // Warm up cache with common data
    const warmUpCache = async () => {
      try {
        // Preload critical data that's likely to be needed
        await Promise.allSettled([
          cacheService.get('user_profile'),
          cacheService.get('dashboard_stats')
        ])
      } catch (error) {
        console.warn('Failed to warm up cache:', error)
      }
    }

    warmUpCache()

    // Set up performance observer if available
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navigation = entry as PerformanceNavigationTiming
            performanceMonitor.recordMetric('page-load-time', navigation.loadEventEnd - navigation.navigationStart)
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['navigation'] })
      } catch (error) {
        console.warn('Failed to set up performance observer:', error)
      }

      return () => observer.disconnect()
    }
  }, [])
}

/**
 * Hook for bundle analysis in development
 */
export function useBundleAnalysis() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && process.env.PERFORMANCE_MONITORING === 'true') {
      // Log bundle information
      console.group('📦 Bundle Analysis')
      console.log('Page:', window.location.pathname)
      console.log('Loaded scripts:', document.querySelectorAll('script[src]').length)
      console.log('Loaded stylesheets:', document.querySelectorAll('link[rel="stylesheet"]').length)
      console.groupEnd()
    }
  }, [])
}