'use client'

import { useState, useEffect, InputHTMLAttributes, forwardRef } from 'react'
import { sanitizeInput, validateInput } from '@/lib/security/kyc-security'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SecureInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'text' | 'email' | 'tel' | 'password' | 'date'
  validationType?: 'name' | 'email' | 'phone' | 'address' | 'documentNumber'
  sensitive?: boolean
  onValidChange?: (isValid: boolean) => void
  errorMessage?: string
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(({
  validationType,
  sensitive = false,
  onValidChange,
  errorMessage,
  className,
  value,
  onChange,
  onBlur,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value || '')
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  
  // Clear clipboard after paste for sensitive fields
  useEffect(() => {
    if (!sensitive) return
    
    const handlePaste = (e: ClipboardEvent) => {
      setTimeout(() => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {
            // Fail silently
          })
        }
      }, 100)
    }
    
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [sensitive])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value
    
    // Apply sanitization if validation type is specified
    if (validationType) {
      newValue = sanitizeInput(newValue, validationType)
    }
    
    setInternalValue(newValue)
    
    // Validate on change for immediate feedback
    if (validationType && touched) {
      const validation = validateInput(newValue, validationType)
      setError(validation.valid ? null : validation.error || null)
      onValidChange?.(validation.valid)
    }
    
    // Call original onChange with sanitized value
    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: newValue }
      }
      onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>)
    }
  }
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true)
    
    // Validate on blur
    if (validationType) {
      const validation = validateInput(e.target.value, validationType)
      setError(validation.valid ? null : validation.error || null)
      onValidChange?.(validation.valid)
    }
    
    onBlur?.(e)
  }
  
  // Additional security attributes
  const securityProps = sensitive ? {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'data-sensitive': true,
  } : {}
  
  return (
    <div className="relative">
      <Input
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'secure-input',
          error && touched && 'border-red-500',
          sensitive && 'select-none',
          className
        )}
        {...securityProps}
        {...props}
      />
      
      {/* Error message */}
      {error && touched && (
        <p className="text-xs text-red-500 mt-1">
          {errorMessage || error}
        </p>
      )}
      
      {/* Security indicator for sensitive fields */}
      {sensitive && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}
    </div>
  )
})

SecureInput.displayName = 'SecureInput'