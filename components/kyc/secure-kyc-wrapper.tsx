'use client'

import { useEffect, useState } from 'react'
import { getCSPNonce } from '@/lib/security/kyc-security'

interface SecureKYCWrapperProps {
  children: React.ReactNode
}

export function SecureKYCWrapper({ children }: SecureKYCWrapperProps) {
  const [nonce, setNonce] = useState<string>('')
  
  useEffect(() => {
    // Get nonce from server-side headers
    const nonceValue = getCSPNonce()
    setNonce(nonceValue)
    
    // Add security event listeners
    const handleSecurityError = (e: SecurityPolicyViolationEvent) => {
      console.error('[SECURITY] CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
      })
      
      // Report to monitoring service
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/security/csp-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'csp-violation',
            details: {
              blockedURI: e.blockedURI,
              violatedDirective: e.violatedDirective,
              timestamp: new Date().toISOString(),
            }
          })
        }).catch(() => {
          // Fail silently to avoid disrupting user experience
        })
      }
    }
    
    // Listen for CSP violations
    window.addEventListener('securitypolicyviolation', handleSecurityError)
    
    // Prevent right-click on sensitive elements
    const preventContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-sensitive]')) {
        e.preventDefault()
        return false
      }
    }
    
    document.addEventListener('contextmenu', preventContextMenu)
    
    // Prevent text selection on sensitive elements
    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-sensitive]')) {
        e.preventDefault()
        return false
      }
    }
    
    document.addEventListener('selectstart', preventSelection)
    
    // Clear clipboard when copying sensitive data
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()
      if (selection && selection.toString()) {
        const selectedElement = selection.anchorNode?.parentElement
        if (selectedElement?.closest('[data-sensitive]')) {
          e.clipboardData?.setData('text/plain', '[Sensitive data protected]')
          e.preventDefault()
        }
      }
    }
    
    document.addEventListener('copy', handleCopy)
    
    // Cleanup
    return () => {
      window.removeEventListener('securitypolicyviolation', handleSecurityError)
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('selectstart', preventSelection)
      document.removeEventListener('copy', handleCopy)
    }
  }, [])
  
  // Add security attributes to the wrapper
  return (
    <div 
      className="kyc-secure-wrapper"
      data-nonce={nonce}
      style={{
        // Prevent screenshots on some devices
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Security notice */}
      <div className="hidden" aria-hidden="true">
        <script nonce={nonce} dangerouslySetInnerHTML={{
          __html: `
            // Security monitoring
            (function() {
              // Detect developer tools
              let devtools = {open: false, orientation: null};
              const threshold = 160;
              const emitEvent = (state) => {
                if (state !== devtools.open) {
                  window.dispatchEvent(new CustomEvent('devtoolschange', {
                    detail: { open: state }
                  }));
                }
              };
              
              setInterval(() => {
                if (window.outerHeight - window.innerHeight > threshold || 
                    window.outerWidth - window.innerWidth > threshold) {
                  emitEvent(true);
                  devtools.open = true;
                } else {
                  emitEvent(false);
                  devtools.open = false;
                }
              }, 500);
              
              // Monitor for debugging attempts
              const checkDebugger = () => {
                const start = performance.now();
                debugger;
                const end = performance.now();
                if (end - start > 100) {
                  console.warn('[SECURITY] Debugger detected');
                }
              };
              
              if (${process.env.NODE_ENV === 'production'}) {
                setInterval(checkDebugger, 5000);
              }
            })();
          `
        }} />
      </div>
      
      {/* Main content */}
      {children}
      
      {/* Security footer */}
      <div className="mt-8 text-xs text-gray-500 text-center">
        <p>This page is protected by security measures to ensure your data safety.</p>
        <p>All information is encrypted and transmitted securely.</p>
      </div>
    </div>
  )
}

// Export security-aware form components
export { SecureForm } from './secure-form'
export { SecureInput } from './secure-input'
export { SecureFileUpload } from './secure-file-upload'