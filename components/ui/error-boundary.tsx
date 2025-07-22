"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { logErrorBoundaryError } from '@/services/error-service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'section'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Send error to monitoring service
    logErrorBoundaryError(error, errorInfo)
    this.logErrorToService(error, errorInfo)
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This would integrate with your error tracking service (Sentry, LogRocket, etc.)
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        level: this.props.level || 'component'
      }
      
      // In a real implementation, send this to your error tracking service
      console.warn('Error logged:', errorData)
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      // Max retries reached, reload the page
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }))
  }

  private getErrorTitle = (): string => {
    const { level } = this.props
    switch (level) {
      case 'page':
        return 'Page Error'
      case 'section':
        return 'Section Error'
      default:
        return 'Something went wrong'
    }
  }

  private getErrorMessage = (): string => {
    const { error } = this.state
    const { level } = this.props

    if (error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')) {
      return 'The application has been updated. Please refresh the page to get the latest version.'
    }

    if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    }

    switch (level) {
      case 'page':
        return 'This page encountered an unexpected error. You can try refreshing the page or return to the homepage.'
      case 'section':
        return 'This section failed to load properly. You can try refreshing the content or continue using other parts of the application.'
      default:
        return 'A component on this page encountered an error. You can try refreshing or continue using the application.'
    }
  }

  private renderErrorFallback = () => {
    const { level } = this.props
    const { retryCount, showDetails, error, errorInfo } = this.state
    const canRetry = retryCount < this.maxRetries
    const isChunkError = error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')

    if (level === 'component') {
      // Minimal error display for component-level errors
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 mb-2">
                This component failed to load properly.
              </p>
              {canRetry && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={this.handleRetry}
                  className="mr-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Full error display for page/section level errors
    return (
      <Card className="max-w-2xl mx-auto mt-8 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-900">
            {this.getErrorTitle()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600 leading-relaxed">
            {this.getErrorMessage()}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry ? (
              <Button onClick={this.handleRetry} size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                {isChunkError ? 'Refresh Page' : `Try Again (${this.maxRetries - retryCount} attempts left)`}
              </Button>
            ) : (
              <Button onClick={() => window.location.reload()} size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            )}
            
            <Button variant="secondary" onClick={this.handleGoHome} size="lg">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Error Details (Development/Debug) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="border-t pt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={this.toggleDetails}
                className="mb-4"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Error Details
                  </>
                )}
              </Button>

              {showDetails && (
                <div className="text-left bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Error Message:</h4>
                    <code className="text-sm text-red-600 break-all">
                      {error.message}
                    </code>
                  </div>
                  
                  {error.stack && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Stack Trace:</h4>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Component Stack:</h4>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return this.renderErrorFallback()
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for manually triggering error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // This will trigger the nearest error boundary
    throw error
  }
}

export default ErrorBoundary