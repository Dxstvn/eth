/**
 * Performance Monitoring Utilities
 * Real-time performance tracking and analysis for KYC system
 */

import { EventEmitter } from 'events'

// Performance metric types
export interface PerformanceEntry {
  name: string
  startTime: number
  duration: number
  entryType: string
  timestamp: number
}

export interface MemoryUsage {
  used: number
  total: number
  limit: number
  timestamp: number
}

export interface NetworkMetrics {
  requests: number
  responses: number
  totalSize: number
  averageLatency: number
  failureRate: number
  timestamp: number
}

export interface RenderMetrics {
  componentName: string
  renderTime: number
  renderCount: number
  reRenderReason?: string
  timestamp: number
}

export interface UserInteractionMetrics {
  eventType: string
  target: string
  responseTime: number
  timestamp: number
}

export interface PerformanceSnapshot {
  memory: MemoryUsage
  network: NetworkMetrics
  renders: RenderMetrics[]
  interactions: UserInteractionMetrics[]
  timestamp: number
  url: string
  userAgent: string
}

export interface PerformanceAlert {
  type: 'memory' | 'response_time' | 'error_rate' | 'render_time' | 'bundle_size'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: number
  context?: Record<string, any>
}

export interface BundleAnalysis {
  totalSize: number
  chunks: Array<{
    name: string
    size: number
    percentage: number
  }>
  duplicates: Array<{
    module: string
    instances: number
    totalSize: number
  }>
  unusedExports: string[]
  timestamp: number
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
  MEMORY_CRITICAL: 100 * 1024 * 1024, // 100MB
  RESPONSE_TIME_WARNING: 1000, // 1s
  RESPONSE_TIME_CRITICAL: 3000, // 3s
  RENDER_TIME_WARNING: 16, // 16ms (60fps)
  RENDER_TIME_CRITICAL: 33, // 33ms (30fps)
  ERROR_RATE_WARNING: 0.05, // 5%
  ERROR_RATE_CRITICAL: 0.10, // 10%
  BUNDLE_SIZE_WARNING: 1024 * 1024, // 1MB
  BUNDLE_SIZE_CRITICAL: 5 * 1024 * 1024, // 5MB
  INTERACTION_DELAY_WARNING: 100, // 100ms
  INTERACTION_DELAY_CRITICAL: 300 // 300ms
}

/**
 * Real-time Performance Monitor
 * Tracks various performance metrics in real-time
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor | null = null
  private isActive = false
  private metricsBuffer: PerformanceSnapshot[] = []
  private alerts: PerformanceAlert[] = []
  private observers: PerformanceObserver[] = []
  private timers: NodeJS.Timeout[] = []
  private networkRequests = new Map<string, { start: number; size: number }>()
  private renderMetrics: RenderMetrics[] = []
  private interactionMetrics: UserInteractionMetrics[] = []

  private constructor() {
    super()
    this.setMaxListeners(100) // Allow many listeners
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start performance monitoring
   */
  start(options: {
    captureInterval?: number
    maxBufferSize?: number
    enableAlerts?: boolean
  } = {}) {
    if (this.isActive) return

    const {
      captureInterval = 5000, // 5 seconds
      maxBufferSize = 100,
      enableAlerts = true
    } = options

    this.isActive = true
    console.log('[PerformanceMonitor] Starting performance monitoring...')

    // Setup performance observers if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceObservers()
    }

    // Setup network monitoring
    this.setupNetworkMonitoring()

    // Setup interaction monitoring
    this.setupInteractionMonitoring()

    // Start periodic data capture
    const captureTimer = setInterval(() => {
      this.captureSnapshot()
      
      // Maintain buffer size
      if (this.metricsBuffer.length > maxBufferSize) {
        this.metricsBuffer = this.metricsBuffer.slice(-maxBufferSize)
      }
      
      // Check for performance issues
      if (enableAlerts) {
        this.checkPerformanceAlerts()
      }
    }, captureInterval)

    this.timers.push(captureTimer)

    // Setup memory leak detection
    this.setupMemoryLeakDetection()

    this.emit('started')
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isActive) return

    console.log('[PerformanceMonitor] Stopping performance monitoring...')
    this.isActive = false

    // Clear timers
    this.timers.forEach(timer => clearInterval(timer))
    this.timers = []

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []

    // Clean up event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handlePageUnload)
    }

    this.emit('stopped')
  }

  /**
   * Setup performance observers for Web Vitals and other metrics
   */
  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return

    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        
        if (lastEntry) {
          this.emit('lcp', {
            value: lastEntry.startTime,
            timestamp: Date.now()
          })
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.emit('fid', {
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now()
          })
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        
        this.emit('cls', {
          value: clsValue,
          timestamp: Date.now()
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // Long Tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          this.emit('long-task', {
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          })
          
          // Alert for very long tasks
          if (entry.duration > PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL) {
            this.addAlert({
              type: 'render_time',
              severity: 'high',
              message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
              value: entry.duration,
              threshold: PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL,
              timestamp: Date.now()
            })
          }
        })
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)

      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.emit('navigation', {
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            responseTime: entry.responseEnd - entry.requestStart,
            timestamp: Date.now()
          })
        })
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)

    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to setup observers:', error)
    }
  }

  /**
   * Setup network request monitoring
   */
  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') return

    // Monkey patch fetch
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'unknown'
      const requestId = `${Date.now()}-${Math.random()}`
      const startTime = performance.now()
      
      this.networkRequests.set(requestId, { start: startTime, size: 0 })
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Estimate response size
        const contentLength = response.headers.get('content-length')
        const size = contentLength ? parseInt(contentLength) : 1000 // Estimate
        
        this.networkRequests.set(requestId, { start: startTime, size })
        
        this.emit('network-request', {
          url,
          duration,
          status: response.status,
          size,
          timestamp: Date.now()
        })
        
        // Alert for slow requests
        if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME_WARNING) {
          this.addAlert({
            type: 'response_time',
            severity: duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME_CRITICAL ? 'critical' : 'medium',
            message: `Slow network request: ${url} took ${duration.toFixed(2)}ms`,
            value: duration,
            threshold: PERFORMANCE_THRESHOLDS.RESPONSE_TIME_WARNING,
            timestamp: Date.now(),
            context: { url, status: response.status }
          })
        }
        
        return response
      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        this.emit('network-error', {
          url,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        })
        
        throw error
      } finally {
        this.networkRequests.delete(requestId)
      }
    }

    // Monkey patch XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      (this as any)._performanceUrl = url
      (this as any)._performanceStartTime = performance.now()
      return originalXHROpen.call(this, method, url, ...args)
    }
    
    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this
      const startTime = (this as any)._performanceStartTime || performance.now()
      
      xhr.addEventListener('loadend', () => {
        const endTime = performance.now()
        const duration = endTime - startTime
        const url = (xhr as any)._performanceUrl || 'unknown'
        
        const monitor = PerformanceMonitor.getInstance()
        monitor.emit('xhr-request', {
          url,
          duration,
          status: xhr.status,
          timestamp: Date.now()
        })
      })
      
      return originalXHRSend.call(this, ...args)
    }
  }

  /**
   * Setup user interaction monitoring
   */
  private setupInteractionMonitoring() {
    if (typeof window === 'undefined') return

    const events = ['click', 'keydown', 'input', 'scroll', 'focus', 'blur']
    
    events.forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        const startTime = performance.now()
        
        // Use requestAnimationFrame to measure response time
        requestAnimationFrame(() => {
          const responseTime = performance.now() - startTime
          const target = (event.target as HTMLElement)?.tagName || 'unknown'
          
          const metric: UserInteractionMetrics = {
            eventType,
            target,
            responseTime,
            timestamp: Date.now()
          }
          
          this.interactionMetrics.push(metric)
          this.emit('interaction', metric)
          
          // Alert for slow interactions
          if (responseTime > PERFORMANCE_THRESHOLDS.INTERACTION_DELAY_WARNING) {
            this.addAlert({
              type: 'response_time',
              severity: responseTime > PERFORMANCE_THRESHOLDS.INTERACTION_DELAY_CRITICAL ? 'high' : 'medium',
              message: `Slow interaction: ${eventType} on ${target} took ${responseTime.toFixed(2)}ms`,
              value: responseTime,
              threshold: PERFORMANCE_THRESHOLDS.INTERACTION_DELAY_WARNING,
              timestamp: Date.now(),
              context: { eventType, target }
            })
          }
        })
      }, { passive: true })
    })
  }

  /**
   * Setup memory leak detection
   */
  private setupMemoryLeakDetection() {
    if (typeof window === 'undefined') return

    let previousMemory = 0
    let memoryIncreaseCount = 0
    
    const memoryCheckTimer = setInterval(() => {
      const memory = this.getMemoryUsage()
      if (!memory) return
      
      // Check for consistent memory increases
      if (memory.used > previousMemory * 1.1) { // 10% increase
        memoryIncreaseCount++
        
        if (memoryIncreaseCount >= 5) { // 5 consecutive increases
          this.addAlert({
            type: 'memory',
            severity: 'high',
            message: `Potential memory leak detected: ${(memory.used / 1024 / 1024).toFixed(2)}MB`,
            value: memory.used,
            threshold: PERFORMANCE_THRESHOLDS.MEMORY_WARNING,
            timestamp: Date.now(),
            context: { increases: memoryIncreaseCount }
          })
          
          memoryIncreaseCount = 0 // Reset counter
        }
      } else {
        memoryIncreaseCount = 0
      }
      
      previousMemory = memory.used
    }, 30000) // Check every 30 seconds
    
    this.timers.push(memoryCheckTimer)

    // Handle page unload
    this.handlePageUnload = this.handlePageUnload.bind(this)
    window.addEventListener('beforeunload', this.handlePageUnload)
  }

  private handlePageUnload = () => {
    // Generate final report before page unload
    this.generateReport()
  }

  /**
   * Capture current performance snapshot
   */
  private captureSnapshot(): PerformanceSnapshot {
    const memory = this.getMemoryUsage()
    const network = this.getNetworkMetrics()
    
    const snapshot: PerformanceSnapshot = {
      memory: memory || {
        used: 0,
        total: 0,
        limit: 0,
        timestamp: Date.now()
      },
      network,
      renders: [...this.renderMetrics],
      interactions: [...this.interactionMetrics],
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    }
    
    this.metricsBuffer.push(snapshot)
    this.emit('snapshot', snapshot)
    
    // Clear old metrics to prevent memory buildup
    this.renderMetrics = this.renderMetrics.slice(-10)
    this.interactionMetrics = this.interactionMetrics.slice(-50)
    
    return snapshot
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): MemoryUsage | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null
    }
    
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }
  }

  /**
   * Get network performance metrics
   */
  private getNetworkMetrics(): NetworkMetrics {
    const activeRequests = Array.from(this.networkRequests.values())
    
    return {
      requests: activeRequests.length,
      responses: 0, // Would track completed responses
      totalSize: activeRequests.reduce((sum, req) => sum + req.size, 0),
      averageLatency: 0, // Would calculate from completed requests
      failureRate: 0, // Would track failed requests
      timestamp: Date.now()
    }
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts() {
    const latestSnapshot = this.metricsBuffer[this.metricsBuffer.length - 1]
    if (!latestSnapshot) return

    // Check memory usage
    if (latestSnapshot.memory.used > PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL) {
      this.addAlert({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${(latestSnapshot.memory.used / 1024 / 1024).toFixed(2)}MB`,
        value: latestSnapshot.memory.used,
        threshold: PERFORMANCE_THRESHOLDS.MEMORY_CRITICAL,
        timestamp: Date.now()
      })
    } else if (latestSnapshot.memory.used > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      this.addAlert({
        type: 'memory',
        severity: 'medium',
        message: `High memory usage: ${(latestSnapshot.memory.used / 1024 / 1024).toFixed(2)}MB`,
        value: latestSnapshot.memory.used,
        threshold: PERFORMANCE_THRESHOLDS.MEMORY_WARNING,
        timestamp: Date.now()
      })
    }

    // Check render performance
    const recentRenders = latestSnapshot.renders.filter(
      r => Date.now() - r.timestamp < 30000 // Last 30 seconds
    )
    
    const slowRenders = recentRenders.filter(
      r => r.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING
    )
    
    if (slowRenders.length > 0) {
      const avgRenderTime = slowRenders.reduce((sum, r) => sum + r.renderTime, 0) / slowRenders.length
      
      this.addAlert({
        type: 'render_time',
        severity: avgRenderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL ? 'high' : 'medium',
        message: `Slow renders detected: ${slowRenders.length} components averaging ${avgRenderTime.toFixed(2)}ms`,
        value: avgRenderTime,
        threshold: PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING,
        timestamp: Date.now(),
        context: { slowRenderCount: slowRenders.length }
      })
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert) {
    // Prevent duplicate alerts within a short time window
    const recentSimilarAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.severity === alert.severity &&
      Date.now() - a.timestamp < 60000 // Within 1 minute
    )
    
    if (recentSimilarAlert) return
    
    this.alerts.push(alert)
    this.emit('alert', alert)
    
    // Log alert
    console.warn(`[PerformanceAlert] ${alert.severity.toUpperCase()}: ${alert.message}`)
    
    // Keep only recent alerts
    this.alerts = this.alerts.filter(a => Date.now() - a.timestamp < 300000) // 5 minutes
  }

  /**
   * Track React component render
   */
  trackRender(componentName: string, renderTime: number, reRenderReason?: string) {
    const metric: RenderMetrics = {
      componentName,
      renderTime,
      renderCount: 1,
      reRenderReason,
      timestamp: Date.now()
    }
    
    // Update existing metric or add new one
    const existingIndex = this.renderMetrics.findIndex(
      m => m.componentName === componentName && Date.now() - m.timestamp < 1000
    )
    
    if (existingIndex >= 0) {
      this.renderMetrics[existingIndex].renderCount++
      this.renderMetrics[existingIndex].renderTime = 
        (this.renderMetrics[existingIndex].renderTime + renderTime) / 2
    } else {
      this.renderMetrics.push(metric)
    }
    
    this.emit('render', metric)
    
    // Alert for slow renders
    if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      this.addAlert({
        type: 'render_time',
        severity: renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_CRITICAL ? 'high' : 'medium',
        message: `Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`,
        value: renderTime,
        threshold: PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING,
        timestamp: Date.now(),
        context: { componentName, reRenderReason }
      })
    }
  }

  /**
   * Analyze bundle size (static analysis)
   */
  analyzeBundleSize(bundleStats: any): BundleAnalysis {
    const chunks = bundleStats.chunks || []
    const totalSize = chunks.reduce((sum: number, chunk: any) => sum + chunk.size, 0)
    
    const chunkAnalysis = chunks.map((chunk: any) => ({
      name: chunk.name,
      size: chunk.size,
      percentage: (chunk.size / totalSize) * 100
    }))
    
    // Find duplicates (simplified)
    const modules = new Map<string, { instances: number; totalSize: number }>()
    chunks.forEach((chunk: any) => {
      if (chunk.modules) {
        chunk.modules.forEach((module: any) => {
          const existing = modules.get(module.name) || { instances: 0, totalSize: 0 }
          existing.instances++
          existing.totalSize += module.size || 0
          modules.set(module.name, existing)
        })
      }
    })
    
    const duplicates = Array.from(modules.entries())
      .filter(([_, data]) => data.instances > 1)
      .map(([module, data]) => ({
        module,
        instances: data.instances,
        totalSize: data.totalSize
      }))
    
    const analysis: BundleAnalysis = {
      totalSize,
      chunks: chunkAnalysis,
      duplicates,
      unusedExports: [], // Would require more sophisticated analysis
      timestamp: Date.now()
    }
    
    // Alert for large bundles
    if (totalSize > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_CRITICAL) {
      this.addAlert({
        type: 'bundle_size',
        severity: 'critical',
        message: `Very large bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        value: totalSize,
        threshold: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_CRITICAL,
        timestamp: Date.now()
      })
    } else if (totalSize > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_WARNING) {
      this.addAlert({
        type: 'bundle_size',
        severity: 'medium',
        message: `Large bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        value: totalSize,
        threshold: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_WARNING,
        timestamp: Date.now()
      })
    }
    
    return analysis
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): string {
    const now = new Date()
    let report = '# Real-time Performance Monitor Report\n\n'
    report += `Generated: ${now.toISOString()}\n`
    report += `Monitoring Duration: ${this.isActive ? 'Active' : 'Stopped'}\n`
    report += `Snapshots Captured: ${this.metricsBuffer.length}\n`
    report += `Alerts Generated: ${this.alerts.length}\n\n`

    // Current status
    const latestSnapshot = this.metricsBuffer[this.metricsBuffer.length - 1]
    if (latestSnapshot) {
      report += '## Current Performance Status\n\n'
      report += `- **Memory Usage**: ${(latestSnapshot.memory.used / 1024 / 1024).toFixed(2)}MB\n`
      report += `- **Active Network Requests**: ${latestSnapshot.network.requests}\n`
      report += `- **Recent Renders**: ${latestSnapshot.renders.length}\n`
      report += `- **Recent Interactions**: ${latestSnapshot.interactions.length}\n\n`
    }

    // Alerts summary
    if (this.alerts.length > 0) {
      report += '## Performance Alerts\n\n'
      
      const alertsByType = new Map<string, PerformanceAlert[]>()
      this.alerts.forEach(alert => {
        const alerts = alertsByType.get(alert.type) || []
        alerts.push(alert)
        alertsByType.set(alert.type, alerts)
      })
      
      alertsByType.forEach((alerts, type) => {
        report += `### ${type.toUpperCase()} Alerts (${alerts.length})\n\n`
        
        alerts.slice(-5).forEach(alert => { // Show last 5 alerts of each type
          const time = new Date(alert.timestamp).toLocaleTimeString()
          report += `- **${time}** [${alert.severity.toUpperCase()}] ${alert.message}\n`
        })
        report += '\n'
      })
    }

    // Performance trends
    if (this.metricsBuffer.length > 1) {
      report += '## Performance Trends\n\n'
      
      const memoryTrend = this.calculateTrend(
        this.metricsBuffer.map(s => s.memory.used)
      )
      
      report += `- **Memory Trend**: ${memoryTrend > 0 ? '📈 Increasing' : '📉 Decreasing'} (${memoryTrend.toFixed(2)}% change)\n`
      
      const renderTimes = this.metricsBuffer.flatMap(s => s.renders.map(r => r.renderTime))
      if (renderTimes.length > 0) {
        const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
        report += `- **Average Render Time**: ${avgRenderTime.toFixed(2)}ms\n`
      }
      
      const interactionTimes = this.metricsBuffer.flatMap(s => s.interactions.map(i => i.responseTime))
      if (interactionTimes.length > 0) {
        const avgInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length
        report += `- **Average Interaction Response**: ${avgInteractionTime.toFixed(2)}ms\n`
      }
      
      report += '\n'
    }

    // Recommendations
    report += '## Recommendations\n\n'
    
    const severeCriticalAlerts = this.alerts.filter(a => a.severity === 'critical')
    const memoryAlerts = this.alerts.filter(a => a.type === 'memory')
    const renderAlerts = this.alerts.filter(a => a.type === 'render_time')
    
    if (severeCriticalAlerts.length > 0) {
      report += '### Critical Issues\n\n'
      report += '- Address critical performance issues immediately\n'
      report += '- Consider implementing performance budgets\n'
      report += '- Review recent code changes for performance regressions\n\n'
    }
    
    if (memoryAlerts.length > 0) {
      report += '### Memory Optimization\n\n'
      report += '- Implement proper cleanup in React components (useEffect cleanup)\n'
      report += '- Review event listener management\n'
      report += '- Consider using React.memo() for expensive components\n'
      report += '- Implement virtual scrolling for large lists\n\n'
    }
    
    if (renderAlerts.length > 0) {
      report += '### Render Performance\n\n'
      report += '- Use React DevTools Profiler to identify slow components\n'
      report += '- Implement code splitting with React.lazy()\n'
      report += '- Consider using Web Workers for heavy computations\n'
      report += '- Optimize re-renders with useMemo() and useCallback()\n\n'
    }
    
    report += '### General Recommendations\n\n'
    report += '- Set up continuous performance monitoring\n'
    report += '- Implement performance budgets in CI/CD\n'
    report += '- Use service workers for caching strategies\n'
    report += '- Consider Progressive Web App (PWA) optimizations\n'
    report += '- Implement proper error boundaries to prevent cascading failures\n'

    return report
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const first = values[0]
    const last = values[values.length - 1]
    
    if (first === 0) return 0
    
    return ((last - first) / first) * 100
  }

  /**
   * Get current metrics
   */
  getMetrics(): {
    snapshots: PerformanceSnapshot[]
    alerts: PerformanceAlert[]
    isActive: boolean
  } {
    return {
      snapshots: [...this.metricsBuffer],
      alerts: [...this.alerts],
      isActive: this.isActive
    }
  }

  /**
   * Clear all metrics and alerts
   */
  clearMetrics() {
    this.metricsBuffer = []
    this.alerts = []
    this.renderMetrics = []
    this.interactionMetrics = []
    this.emit('cleared')
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metadata: {
        exportTime: new Date().toISOString(),
        monitoringActive: this.isActive,
        totalSnapshots: this.metricsBuffer.length,
        totalAlerts: this.alerts.length
      },
      snapshots: this.metricsBuffer,
      alerts: this.alerts
    }, null, 2)
  }
}

/**
 * React Hook for Performance Monitoring
 */
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance()
  
  return {
    startMonitoring: (options?: Parameters<typeof monitor.start>[0]) => monitor.start(options),
    stopMonitoring: () => monitor.stop(),
    trackRender: (componentName: string, renderTime: number, reason?: string) => 
      monitor.trackRender(componentName, renderTime, reason),
    getMetrics: () => monitor.getMetrics(),
    generateReport: () => monitor.generateReport(),
    clearMetrics: () => monitor.clearMetrics(),
    isActive: () => monitor.getMetrics().isActive
  }
}

/**
 * React HOC for automatic render tracking
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const monitor = PerformanceMonitor.getInstance()
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'
    
    const renderStart = performance.now()
    
    React.useEffect(() => {
      const renderTime = performance.now() - renderStart
      monitor.trackRender(name, renderTime)
    })
    
    return React.createElement(WrappedComponent, props)
  }
}

// Global instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  performanceMonitor.start({
    captureInterval: 10000, // 10 seconds in dev
    enableAlerts: true
  })
  
  console.log('[PerformanceMonitor] Auto-started in development mode')
}

export default PerformanceMonitor