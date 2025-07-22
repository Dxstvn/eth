interface ErrorLogEntry {
  message: string
  stack?: string
  timestamp: string
  url: string
  userAgent: string
  userId?: string
  level: 'error' | 'warning' | 'info'
  context?: Record<string, any>
  componentStack?: string
}

interface ErrorServiceConfig {
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  apiEndpoint?: string
  apiKey?: string
  maxRetries: number
  batchSize: number
  flushInterval: number // milliseconds
}

class ErrorService {
  private config: ErrorServiceConfig
  private errorQueue: ErrorLogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<ErrorServiceConfig> = {}) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      maxRetries: 3,
      batchSize: 10,
      flushInterval: 5000,
      ...config
    }

    // Set up periodic flushing
    if (this.config.enableRemoteLogging) {
      this.setupPeriodicFlush()
    }

    // Handle page unload to flush remaining errors
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })

      // Handle uncaught errors and promise rejections
      window.addEventListener('error', this.handleGlobalError)
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    }
  }

  private handleGlobalError = (event: ErrorEvent) => {
    this.logError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'window.error'
    })
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    
    this.logError(error, {
      source: 'unhandledrejection'
    })
  }

  logError(
    error: Error | string,
    context: Record<string, any> = {},
    level: 'error' | 'warning' | 'info' = 'error'
  ) {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = error instanceof Error ? error.stack : undefined

    const entry: ErrorLogEntry = {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      level,
      context
    }

    // Add user ID if available (from auth context)
    if (typeof window !== 'undefined' && (window as any).clearhold_user_id) {
      entry.userId = (window as any).clearhold_user_id
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'
      console[consoleMethod]('ErrorService:', entry)
    }

    // Queue for remote logging
    if (this.config.enableRemoteLogging) {
      this.errorQueue.push(entry)
      
      // Flush immediately for critical errors
      if (level === 'error' || this.errorQueue.length >= this.config.batchSize) {
        this.flush()
      }
    }
  }

  logApiError(
    error: Error | string,
    endpoint: string,
    method: string,
    statusCode?: number,
    responseData?: any
  ) {
    this.logError(error, {
      type: 'api_error',
      endpoint,
      method,
      statusCode,
      responseData,
      source: 'api_client'
    })
  }

  logUserAction(
    action: string,
    details: Record<string, any> = {},
    level: 'info' | 'warning' = 'info'
  ) {
    this.logError(`User action: ${action}`, {
      type: 'user_action',
      action,
      ...details,
      source: 'user_interaction'
    }, level)
  }

  logPerformance(
    metric: string,
    value: number,
    context: Record<string, any> = {}
  ) {
    this.logError(`Performance metric: ${metric} = ${value}`, {
      type: 'performance',
      metric,
      value,
      ...context,
      source: 'performance'
    }, 'info')
  }

  private async flush() {
    if (this.errorQueue.length === 0) return

    const errors = this.errorQueue.splice(0, this.config.batchSize)
    
    try {
      await this.sendErrors(errors)
    } catch (error) {
      // Put errors back in queue for retry
      this.errorQueue.unshift(...errors)
      console.error('Failed to send errors to remote service:', error)
    }
  }

  private async sendErrors(errors: ErrorLogEntry[], retryCount = 0): Promise<void> {
    if (!this.config.apiEndpoint) {
      console.warn('No API endpoint configured for error logging')
      return
    }

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          errors,
          source: 'clearhold-frontend',
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        // Exponential backoff for retries
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.sendErrors(errors, retryCount + 1)
      }
      throw error
    }
  }

  private setupPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  // Clean up resources
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError)
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    }

    // Flush any remaining errors
    this.flush()
  }

  // Get error statistics
  getStats() {
    return {
      queueLength: this.errorQueue.length,
      config: this.config
    }
  }
}

// Create singleton instance
const errorService = new ErrorService({
  apiEndpoint: process.env.NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_ERROR_LOGGING_API_KEY
})

// React hook for error handling
export function useErrorHandler() {
  const logError = (error: Error | string, context?: Record<string, any>) => {
    errorService.logError(error, context)
  }

  const logApiError = (error: Error | string, endpoint: string, method: string, statusCode?: number) => {
    errorService.logApiError(error, endpoint, method, statusCode)
  }

  const logUserAction = (action: string, details?: Record<string, any>) => {
    errorService.logUserAction(action, details)
  }

  return {
    logError,
    logApiError,
    logUserAction
  }
}

// Error boundary integration
export function logErrorBoundaryError(error: Error, errorInfo: any) {
  errorService.logError(error, {
    type: 'react_error_boundary',
    componentStack: errorInfo.componentStack,
    source: 'error_boundary'
  })
}

// API client integration helper
export function createErrorLogger(service: string) {
  return {
    logError: (error: Error | string, context?: Record<string, any>) => {
      errorService.logError(error, { ...context, service })
    },
    logApiError: (error: Error | string, endpoint: string, method: string, statusCode?: number) => {
      errorService.logApiError(error, endpoint, method, statusCode)
    }
  }
}

export default errorService