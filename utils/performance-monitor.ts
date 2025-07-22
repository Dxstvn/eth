/**
 * Performance monitoring utilities for ClearHold
 * Tracks and reports various performance metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  context?: Record<string, any>
}

interface PageLoadMetrics {
  loadTime: number
  domContentLoaded: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
  timeToInteractive?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private isInitialized = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  private init() {
    if (this.isInitialized) return
    this.isInitialized = true

    // Monitor Core Web Vitals
    this.observeWebVitals()
    
    // Monitor resource loading
    this.observeResourceTiming()
    
    // Monitor navigation timing
    this.observeNavigationTiming()
    
    // Monitor component render times
    this.observeComponentRender()

    // Report metrics periodically
    setInterval(() => this.reportMetrics(), 30000) // Every 30 seconds
  }

  /**
   * Start timing a custom metric
   */
  startTiming(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(name, duration)
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context
    }
    
    this.metrics.push(metric)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`, context)
    }
    
    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500)
    }
  }

  /**
   * Get page load metrics
   */
  getPageLoadMetrics(): PageLoadMetrics | null {
    if (typeof window === 'undefined') return null

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navigation) return null

    return {
      loadTime: navigation.loadEventEnd - navigation.navigationStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      firstContentfulPaint: this.getWebVitalMetric('first-contentful-paint'),
      largestContentfulPaint: this.getWebVitalMetric('largest-contentful-paint'),
      firstInputDelay: this.getWebVitalMetric('first-input-delay'),
      cumulativeLayoutShift: this.getWebVitalMetric('cumulative-layout-shift'),
      timeToInteractive: this.getWebVitalMetric('time-to-interactive')
    }
  }

  /**
   * Get resource loading metrics
   */
  getResourceMetrics() {
    if (typeof window === 'undefined') return []

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      size: resource.transferSize || 0,
      duration: resource.duration,
      startTime: resource.startTime
    }))
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const pageLoad = this.getPageLoadMetrics()
    const resources = this.getResourceMetrics()
    
    // Calculate resource stats
    const totalResourceSize = resources.reduce((sum, r) => sum + r.size, 0)
    const avgResourceTime = resources.length > 0 
      ? resources.reduce((sum, r) => sum + r.duration, 0) / resources.length 
      : 0

    // Group custom metrics
    const customMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.value)
      return acc
    }, {} as Record<string, number[]>)

    // Calculate averages for custom metrics
    const customAverages = Object.entries(customMetrics).reduce((acc, [name, values]) => {
      acc[name] = {
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      }
      return acc
    }, {} as Record<string, { avg: number; min: number; max: number; count: number }>)

    return {
      pageLoad,
      resources: {
        count: resources.length,
        totalSize: totalResourceSize,
        avgLoadTime: avgResourceTime
      },
      customMetrics: customAverages,
      timestamp: Date.now()
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  private observeWebVitals() {
    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric(entry.name, entry.startTime, {
              type: 'web-vital'
            })
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)

        // Observe LCP
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('largest-contentful-paint', entry.startTime, {
              type: 'web-vital',
              element: (entry as any).element?.tagName
            })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)

        // Observe layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          if (clsValue > 0) {
            this.recordMetric('cumulative-layout-shift', clsValue, {
              type: 'web-vital'
            })
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (error) {
        console.warn('Failed to set up performance observers:', error)
      }
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming
            this.recordMetric(`resource-${resource.initiatorType}`, resource.duration, {
              type: 'resource',
              name: resource.name,
              size: resource.transferSize
            })
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (error) {
        console.warn('Failed to observe resource timing:', error)
      }
    }
  }

  private observeNavigationTiming() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            this.recordMetric('page-load-time', navigation.loadEventEnd - navigation.navigationStart)
            this.recordMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart)
            this.recordMetric('time-to-first-byte', navigation.responseStart - navigation.navigationStart)
          }
        }, 0)
      })
    }
  }

  private observeComponentRender() {
    // This will be integrated with React DevTools or custom component timing
    // For now, we'll set up the infrastructure
  }

  private getWebVitalMetric(name: string): number | undefined {
    const metric = this.metrics
      .filter(m => m.name === name && m.context?.type === 'web-vital')
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    
    return metric?.value
  }

  private async reportMetrics() {
    if (this.metrics.length === 0) return

    const summary = this.getMetricsSummary()
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Performance Summary')
      console.table(summary.customMetrics)
      console.log('Page Load:', summary.pageLoad)
      console.log('Resources:', summary.resources)
      console.groupEnd()
    }

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      try {
        // This would integrate with your analytics service
        // await analytics.track('performance_metrics', summary)
      } catch (error) {
        console.warn('Failed to report performance metrics:', error)
      }
    }
  }

  /**
   * Clean up observers
   */
  destroy() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('Error disconnecting performance observer:', error)
      }
    })
    this.observers = []
  }
}

// React hooks for performance monitoring
export function usePerformanceTimer(metricName: string) {
  const [startTime] = useState(() => performance.now())
  
  const stopTimer = () => {
    const duration = performance.now() - startTime
    performanceMonitor.recordMetric(metricName, duration)
    return duration
  }

  return stopTimer
}

export function useComponentPerformance(componentName: string) {
  const startTime = performance.now()
  
  useEffect(() => {
    const renderTime = performance.now() - startTime
    performanceMonitor.recordMetric(`component-render-${componentName}`, renderTime, {
      type: 'component',
      component: componentName
    })
  }, [componentName, startTime])
}

// Higher-order component for measuring component performance
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || Component.displayName || Component.name || 'Component'
  
  const WrappedComponent = (props: P) => {
    useComponentPerformance(displayName)
    return <Component {...props} />
  }
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${displayName})`
  return WrappedComponent
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Utility functions
export const performanceUtils = {
  // Measure function execution time
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const startTime = performance.now()
      const result = fn(...args)
      const duration = performance.now() - startTime
      
      performanceMonitor.recordMetric(
        name || fn.name || 'anonymous-function',
        duration,
        { type: 'function' }
      )
      
      return result
    }) as T
  },

  // Measure async function execution time
  measureAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name?: string
  ): T => {
    return (async (...args: Parameters<T>) => {
      const startTime = performance.now()
      try {
        const result = await fn(...args)
        const duration = performance.now() - startTime
        
        performanceMonitor.recordMetric(
          name || fn.name || 'anonymous-async-function',
          duration,
          { type: 'async-function', status: 'success' }
        )
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        
        performanceMonitor.recordMetric(
          name || fn.name || 'anonymous-async-function',
          duration,
          { type: 'async-function', status: 'error' }
        )
        
        throw error
      }
    }) as T
  }
}