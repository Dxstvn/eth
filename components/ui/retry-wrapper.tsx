"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { ErrorMessage } from './error-message'
import { Skeleton } from './design-system'
import { cn } from '@/lib/utils'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffFactor: number
  retryCondition?: (error: Error) => boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, server errors, but not on client errors
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    )
  }
}

export interface RetryWrapperProps {
  children: React.ReactNode
  onRetry: () => Promise<void> | void
  loading?: boolean
  error?: Error | string | null
  retryConfig?: Partial<RetryConfig>
  fallback?: React.ReactNode
  loadingFallback?: React.ReactNode
  className?: string
  title?: string
  description?: string
  showNetworkStatus?: boolean
}

export function RetryWrapper({
  children,
  onRetry,
  loading = false,
  error = null,
  retryConfig = {},
  fallback,
  loadingFallback,
  className,
  title,
  description,
  showNetworkStatus = false
}: RetryWrapperProps) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryDelay, setRetryDelay] = useState(config.baseDelay)
  const [isOnline, setIsOnline] = useState(true)

  // Network status monitoring
  useEffect(() => {
    if (!showNetworkStatus) return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showNetworkStatus])

  // Calculate next retry delay with exponential backoff
  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, attempt),
      config.maxDelay
    )
    return delay + Math.random() * 1000 // Add jitter
  }, [config])

  // Handle retry logic
  const handleRetry = useCallback(async () => {
    if (retryCount >= config.maxAttempts) {
      return
    }

    // Check if we should retry this error
    const errorObj = typeof error === 'string' ? new Error(error) : error
    if (errorObj && config.retryCondition && !config.retryCondition(errorObj)) {
      return
    }

    setIsRetrying(true)
    
    try {
      // Add delay for exponential backoff
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }

      await onRetry()
      
      // Reset retry state on success
      setRetryCount(0)
      setRetryDelay(config.baseDelay)
    } catch (retryError) {
      const newRetryCount = retryCount + 1
      setRetryCount(newRetryCount)
      setRetryDelay(calculateDelay(newRetryCount))
    } finally {
      setIsRetrying(false)
    }
  }, [retryCount, retryDelay, error, onRetry, config, calculateDelay])

  // Auto-retry logic
  useEffect(() => {
    if (error && retryCount < config.maxAttempts && !isRetrying) {
      const errorObj = typeof error === 'string' ? new Error(error) : error
      if (errorObj && config.retryCondition?.(errorObj)) {
        const timer = setTimeout(() => {
          handleRetry()
        }, retryCount === 0 ? 0 : retryDelay)

        return () => clearTimeout(timer)
      }
    }
  }, [error, retryCount, isRetrying, handleRetry, retryDelay, config])

  // Reset retry count when error clears
  useEffect(() => {
    if (!error) {
      setRetryCount(0)
      setRetryDelay(config.baseDelay)
    }
  }, [error, config.baseDelay])

  // Show loading state
  if (loading || isRetrying) {
    if (loadingFallback) {
      return <div className={className}>{loadingFallback}</div>
    }

    return (
      <div className={cn("space-y-4", className)}>
        {isRetrying && retryCount > 0 && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin mr-2" />
            <span className="text-sm text-blue-800">
              Retrying... (attempt {retryCount + 1} of {config.maxAttempts})
            </span>
          </div>
        )}
        <Skeleton.Card />
      </div>
    )
  }

  // Show error state
  if (error) {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const canRetry = retryCount < config.maxAttempts && 
                    (!config.retryCondition || config.retryCondition(errorObj))
    const hasExceededMaxAttempts = retryCount >= config.maxAttempts

    if (fallback) {
      return <div className={className}>{fallback}</div>
    }

    return (
      <div className={cn("space-y-4", className)}>
        {/* Network status indicator */}
        {showNetworkStatus && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOnline 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          )}>
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span>
              {isOnline ? 'Connected to internet' : 'No internet connection'}
            </span>
          </div>
        )}

        <Card className="shadow-soft">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title || (hasExceededMaxAttempts ? 'Failed to Load' : 'Loading Failed')}
            </h3>

            <p className="text-gray-600 mb-4">
              {description || 
               (hasExceededMaxAttempts 
                 ? `Failed to load after ${config.maxAttempts} attempts. Please check your connection and try again.`
                 : 'Something went wrong while loading this content.')}
            </p>

            {/* Error details */}
            <ErrorMessage
              message={typeof error === 'string' ? error : error.message}
              variant="inline"
              size="sm"
              className="mb-4"
            />

            {/* Retry information */}
            {retryCount > 0 && (
              <div className="text-sm text-gray-500 mb-4">
                Attempted {retryCount} of {config.maxAttempts} times
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <Button 
                  onClick={handleRetry}
                  disabled={isRetrying || !isOnline}
                  size="lg"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
              )}

              {hasExceededMaxAttempts && (
                <Button 
                  onClick={() => {
                    setRetryCount(0)
                    setRetryDelay(config.baseDelay)
                    handleRetry()
                  }}
                  variant="secondary"
                  size="lg"
                  disabled={!isOnline}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                size="lg"
              >
                Refresh Page
              </Button>
            </div>

            {/* Offline notice */}
            {!isOnline && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  You appear to be offline. Please check your internet connection and try again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success state
  return <div className={className}>{children}</div>
}

// Hook for managing retry state
export function useRetry(
  operation: () => Promise<void> | void,
  config: Partial<RetryConfig> = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await operation()
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [operation])

  const retry = useCallback(async () => {
    await execute()
  }, [execute])

  return {
    loading,
    error,
    execute,
    retry,
    canRetry: error && (!retryConfig.retryCondition || retryConfig.retryCondition(error))
  }
}

// Higher-order component for adding retry functionality
export function withRetry<P extends object>(
  Component: React.ComponentType<P>,
  retryProps?: Partial<RetryWrapperProps>
) {
  const WrappedComponent = (props: P & { retryWrapperProps?: Partial<RetryWrapperProps> }) => {
    const { retryWrapperProps, ...componentProps } = props
    const [error, setError] = useState<Error | null>(null)
    const [loading, setLoading] = useState(false)

    const handleRetry = useCallback(async () => {
      setError(null)
      setLoading(true)
      
      try {
        // This would trigger a re-render of the component
        // In practice, you'd want to trigger a data refetch or component reload
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }, [])

    return (
      <RetryWrapper
        onRetry={handleRetry}
        loading={loading}
        error={error}
        {...retryProps}
        {...retryWrapperProps}
      >
        <Component {...(componentProps as P)} />
      </RetryWrapper>
    )
  }

  WrappedComponent.displayName = `withRetry(${Component.displayName || Component.name})`
  
  return WrappedComponent
}