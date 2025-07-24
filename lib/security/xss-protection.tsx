'use client';

import React, { ReactNode, useEffect } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { sanitizeHtml, escapeHtml } from './validation';

// Safe HTML rendering component
interface SafeHtmlProps {
  html: string;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export function SafeHtml({ 
  html, 
  className,
  allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes = ['href', 'target', 'rel']
}: SafeHtmlProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

// Safe text component that escapes HTML
interface SafeTextProps {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function SafeText({ text, as: Component = 'span', className }: SafeTextProps) {
  const escaped = escapeHtml(text);
  
  return React.createElement(Component, {
    className,
    dangerouslySetInnerHTML: { __html: escaped }
  });
}

// XSS Protection Provider
interface XSSProtectionProviderProps {
  children: ReactNode;
}

export function XSSProtectionProvider({ children }: XSSProtectionProviderProps) {
  useEffect(() => {
    // Override native methods to add XSS protection
    const originalCreateElement = document.createElement.bind(document);
    
    // Patch createElement to sanitize attributes
    document.createElement = function(tagName: any) {
      const element = originalCreateElement(tagName);
      
      // Override setAttribute to sanitize values
      const originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function(name: string, value: string) {
        // Sanitize event handlers
        if (name.toLowerCase().startsWith('on')) {
          console.warn(`Blocked potentially unsafe attribute: ${name}`);
          return;
        }
        
        // Sanitize javascript: URLs
        if (name.toLowerCase() === 'href' || name.toLowerCase() === 'src') {
          if (value.toLowerCase().includes('javascript:')) {
            console.warn(`Blocked potentially unsafe URL: ${value}`);
            return;
          }
        }
        
        originalSetAttribute(name, value);
      };
      
      return element;
    };
    
    // Cleanup on unmount
    return () => {
      document.createElement = originalCreateElement;
    };
  }, []);
  
  return <>{children}</>;
}

// Hook to sanitize user input
export function useSanitizedInput(initialValue: string = '') {
  const [value, setValue] = React.useState(initialValue);
  
  const handleChange = (newValue: string) => {
    // Basic XSS prevention: remove script tags and event handlers
    const sanitized = newValue
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    setValue(sanitized);
  };
  
  return [value, handleChange] as const;
}

// Secure link component
interface SecureLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  external?: boolean;
}

export function SecureLink({ href, children, external = false, ...props }: SecureLinkProps) {
  // Validate and sanitize URL
  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url, window.location.href);
      // Block javascript: and data: protocols
      return !['javascript:', 'data:', 'vbscript:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };
  
  if (!isValidUrl(href)) {
    console.warn(`Blocked potentially unsafe URL: ${href}`);
    return <span {...props}>{children}</span>;
  }
  
  const secureProps = external ? {
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
  } : {};
  
  return (
    <a href={href} {...secureProps} {...props}>
      {children}
    </a>
  );
}

// Secure form component with built-in XSS protection
interface SecureFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  onSecureSubmit?: (data: FormData) => void;
}

export function SecureForm({ children, onSecureSubmit, onSubmit, ...props }: SecureFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    // Sanitize all form inputs
    const sanitizedData = new FormData();
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        sanitizedData.append(key, escapeHtml(value));
      } else {
        sanitizedData.append(key, value);
      }
    }
    
    if (onSecureSubmit) {
      onSecureSubmit(sanitizedData);
    }
    
    if (onSubmit) {
      onSubmit(e);
    }
  };
  
  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}

// XSS-safe JSON display component
interface SafeJsonDisplayProps {
  data: any;
  className?: string;
}

export function SafeJsonDisplay({ data, className }: SafeJsonDisplayProps) {
  const sanitized = JSON.stringify(data, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  
  return (
    <pre className={className}>
      <code>{sanitized}</code>
    </pre>
  );
}