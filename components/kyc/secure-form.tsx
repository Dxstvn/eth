'use client'

import { FormEvent, useState, useRef, useEffect } from 'react'
import { generateCSRFToken } from '@/lib/security/kyc-security'

interface SecureFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSecureSubmit?: (data: FormData, csrfToken: string) => void | Promise<void>
  children: React.ReactNode
}

export function SecureForm({ 
  onSecureSubmit, 
  onSubmit,
  children, 
  ...props 
}: SecureFormProps) {
  const [csrfToken, setCSRFToken] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const submitAttempts = useRef(0)
  const lastSubmitTime = useRef(0)
  
  useEffect(() => {
    // Generate CSRF token on mount
    setCSRFToken(generateCSRFToken())
    
    // Regenerate token every 15 minutes
    const interval = setInterval(() => {
      setCSRFToken(generateCSRFToken())
    }, 15 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Rate limit form submissions
    const now = Date.now()
    if (now - lastSubmitTime.current < 1000) {
      console.warn('[SECURITY] Form submission rate limit exceeded')
      return
    }
    lastSubmitTime.current = now
    
    // Track submission attempts
    submitAttempts.current++
    if (submitAttempts.current > 5) {
      console.error('[SECURITY] Too many submission attempts')
      return
    }
    
    // Prevent double submission
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const formData = new FormData(formRef.current!)
      
      // Add CSRF token to form data
      formData.append('_csrf', csrfToken)
      
      // Add timestamp for replay attack prevention
      formData.append('_timestamp', Date.now().toString())
      
      // Call the secure submit handler
      if (onSecureSubmit) {
        await onSecureSubmit(formData, csrfToken)
      } else if (onSubmit) {
        await onSubmit(e)
      }
      
      // Reset attempts on successful submission
      submitAttempts.current = 0
    } catch (error) {
      console.error('[SECURITY] Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      autoComplete="off"
      noValidate
      {...props}
      className={`secure-form ${props.className || ''}`}
    >
      {/* Hidden CSRF token field */}
      <input type="hidden" name="_csrf" value={csrfToken} />
      
      {/* Honeypot field for bot detection */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <input
          type="text"
          name="_honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>
      
      {children}
      
      {/* Disable form while submitting */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-teal-900">Processing securely...</div>
        </div>
      )}
    </form>
  )
}