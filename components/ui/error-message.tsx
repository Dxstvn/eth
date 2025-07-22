"use client"

import React from 'react'
import { AlertTriangle, XCircle, AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

export interface ErrorMessageProps {
  title?: string
  message: string
  error?: Error | string
  type?: 'error' | 'warning' | 'network' | 'validation'
  size?: 'sm' | 'default' | 'lg'
  variant?: 'inline' | 'card' | 'banner'
  showIcon?: boolean
  dismissible?: boolean
  retryable?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  children?: React.ReactNode
}

const errorTypes = {
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-900',
    messageColor: 'text-red-800'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-900',
    messageColor: 'text-amber-800'
  },
  network: {
    icon: AlertCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-800'
  },
  validation: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-500',
    titleColor: 'text-orange-900',
    messageColor: 'text-orange-800'
  }
}

const sizeClasses = {
  sm: {
    padding: 'p-3',
    iconSize: 'h-4 w-4',
    titleSize: 'text-sm font-medium',
    messageSize: 'text-xs',
    buttonSize: 'sm' as const
  },
  default: {
    padding: 'p-4',
    iconSize: 'h-5 w-5',
    titleSize: 'text-base font-medium',
    messageSize: 'text-sm',
    buttonSize: 'sm' as const
  },
  lg: {
    padding: 'p-6',
    iconSize: 'h-6 w-6',
    titleSize: 'text-lg font-semibold',
    messageSize: 'text-base',
    buttonSize: 'default' as const
  }
}

export function ErrorMessage({
  title,
  message,
  error,
  type = 'error',
  size = 'default',
  variant = 'inline',
  showIcon = true,
  dismissible = false,
  retryable = false,
  onRetry,
  onDismiss,
  className,
  children
}: ErrorMessageProps) {
  const typeConfig = errorTypes[type]
  const sizeConfig = sizeClasses[size]
  const IconComponent = typeConfig.icon

  // Extract meaningful error message
  const getErrorMessage = () => {
    if (typeof error === 'string') {
      return error
    }
    if (error instanceof Error) {
      return error.message
    }
    return message
  }

  // Determine error title if not provided
  const getErrorTitle = () => {
    if (title) return title

    if (typeof error === 'string' || error instanceof Error) {
      const errorMsg = getErrorMessage().toLowerCase()
      
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
        return 'Network Error'
      }
      if (errorMsg.includes('validation') || errorMsg.includes('invalid') || errorMsg.includes('required')) {
        return 'Validation Error'
      }
      if (errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
        return 'Access Denied'
      }
      if (errorMsg.includes('timeout')) {
        return 'Request Timeout'
      }
    }

    switch (type) {
      case 'network':
        return 'Connection Issue'
      case 'validation':
        return 'Invalid Input'
      case 'warning':
        return 'Warning'
      default:
        return 'Error'
    }
  }

  const renderContent = () => (
    <div className="flex items-start">
      {showIcon && (
        <div className="flex-shrink-0 mr-3">
          <IconComponent className={cn(sizeConfig.iconSize, typeConfig.iconColor)} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {(title || error) && (
          <h3 className={cn(sizeConfig.titleSize, typeConfig.titleColor, 'mb-1')}>
            {getErrorTitle()}
          </h3>
        )}
        
        <div className={cn(sizeConfig.messageSize, typeConfig.messageColor, 'leading-relaxed')}>
          {getErrorMessage()}
        </div>

        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}

        {(retryable || dismissible) && (
          <div className="flex items-center gap-2 mt-3">
            {retryable && onRetry && (
              <Button
                size={sizeConfig.buttonSize}
                variant="secondary"
                onClick={onRetry}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            
            {dismissible && onDismiss && (
              <Button
                size={sizeConfig.buttonSize}
                variant="ghost"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>

      {dismissible && onDismiss && (
        <div className="flex-shrink-0 ml-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-auto p-1"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      )}
    </div>
  )

  const baseClasses = cn(
    typeConfig.bgColor,
    typeConfig.borderColor,
    sizeConfig.padding,
    className
  )

  switch (variant) {
    case 'card':
      return (
        <Card className={cn('border-0 shadow-soft', baseClasses)}>
          <CardContent className="p-0">
            {renderContent()}
          </CardContent>
        </Card>
      )
    
    case 'banner':
      return (
        <div className={cn('border-l-4 border-r rounded-r-lg', baseClasses)}>
          {renderContent()}
        </div>
      )
    
    default: // inline
      return (
        <div className={cn('border rounded-lg', baseClasses)}>
          {renderContent()}
        </div>
      )
  }
}

// Specialized error message components
export function NetworkError({ 
  onRetry, 
  ...props 
}: Omit<ErrorMessageProps, 'type'>) {
  return (
    <ErrorMessage
      type="network"
      title="Connection Problem"
      message="Unable to connect to the server. Please check your internet connection."
      retryable={!!onRetry}
      onRetry={onRetry}
      {...props}
    />
  )
}

export function ValidationError({ 
  field,
  ...props 
}: Omit<ErrorMessageProps, 'type'> & { field?: string }) {
  const message = field 
    ? `Please check the ${field} field and try again.`
    : props.message || "Please check your input and try again."
    
  return (
    <ErrorMessage
      type="validation"
      title="Invalid Input"
      message={message}
      size="sm"
      {...props}
    />
  )
}

export function ApiError({ 
  statusCode,
  onRetry,
  ...props 
}: Omit<ErrorMessageProps, 'type'> & { statusCode?: number }) {
  let title = "API Error"
  let defaultMessage = "An error occurred while processing your request."
  
  if (statusCode) {
    switch (statusCode) {
      case 400:
        title = "Bad Request"
        defaultMessage = "The request could not be processed. Please check your input."
        break
      case 401:
        title = "Unauthorized"
        defaultMessage = "You need to be signed in to perform this action."
        break
      case 403:
        title = "Access Denied"
        defaultMessage = "You don't have permission to perform this action."
        break
      case 404:
        title = "Not Found"
        defaultMessage = "The requested resource could not be found."
        break
      case 500:
        title = "Server Error"
        defaultMessage = "A server error occurred. Please try again later."
        break
      case 503:
        title = "Service Unavailable"
        defaultMessage = "The service is temporarily unavailable. Please try again later."
        break
    }
  }

  return (
    <ErrorMessage
      type="error"
      title={title}
      message={props.message || defaultMessage}
      retryable={!!onRetry && (statusCode === 500 || statusCode === 503)}
      onRetry={onRetry}
      {...props}
    />
  )
}

// Hook for creating error handlers
export function useErrorMessage() {
  const [error, setError] = React.useState<ErrorMessageProps | null>(null)

  const showError = React.useCallback((errorProps: ErrorMessageProps) => {
    setError(errorProps)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error | string, options?: Partial<ErrorMessageProps>) => {
    showError({
      message: typeof error === 'string' ? error : error.message,
      error,
      dismissible: true,
      onDismiss: clearError,
      ...options
    })
  }, [showError, clearError])

  return {
    error,
    showError,
    clearError,
    handleError,
    ErrorDisplay: error ? <ErrorMessage {...error} /> : null
  }
}