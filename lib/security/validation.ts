import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Input validation schemas
export const userInputSchemas = {
  // User profile validation
  userName: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email is too long'),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  
  // Transaction validation
  amount: z.string()
    .regex(/^\d+\.?\d{0,2}$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .refine((val) => parseFloat(val) <= 999999999.99, 'Amount exceeds maximum'),
  
  transactionTitle: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title is too long')
    .regex(/^[a-zA-Z0-9\s\-.,!?'()]+$/, 'Title contains invalid characters'),
  
  transactionDescription: z.string()
    .max(5000, 'Description is too long')
    .optional(),
  
  // Wallet validation
  walletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  
  walletName: z.string()
    .min(1, 'Wallet name is required')
    .max(50, 'Wallet name is too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Wallet name contains invalid characters'),
  
  // Contact validation
  contactName: z.string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Contact name contains invalid characters'),
  
  contactEmail: z.string()
    .email('Invalid email address')
    .max(254, 'Email is too long'),
  
  // File validation
  fileName: z.string()
    .max(255, 'File name is too long')
    .regex(/^[a-zA-Z0-9\s\-._()]+$/, 'File name contains invalid characters'),
  
  // General text inputs
  searchQuery: z.string()
    .max(100, 'Search query is too long')
    .regex(/^[a-zA-Z0-9\s\-.,?!]+$/, 'Search contains invalid characters'),
  
  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL is too long'),
};

// XSS Protection: Sanitize HTML content
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

// XSS Protection: Escape special characters
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

// SQL Injection Protection: Parameterize queries (for reference)
export function sanitizeSqlInput(input: string): string {
  // Remove or escape potentially dangerous characters
  return input
    .replace(/['"\\;`]/g, '') // Remove quotes, backslashes, semicolons, backticks
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .trim();
}

// Path Traversal Protection
export function sanitizePath(path: string): string {
  // Remove path traversal attempts
  return path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/[<>:"|?*]/g, ''); // Remove invalid path characters
}

// JSON Injection Protection
export function sanitizeJson(obj: any): any {
  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize both key and value
        const sanitizedKey = escapeHtml(key);
        sanitized[sanitizedKey] = sanitizeJson(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Input validation helper
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

// Rate limiting helper (client-side)
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
  
  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  schemas: Record<keyof T, z.ZodSchema>
) {
  const validate = (field: keyof T, value: unknown) => {
    const schema = schemas[field];
    if (!schema) return { isValid: true, error: null };
    
    const result = validateInput(schema, value);
    return {
      isValid: result.success,
      error: result.success ? null : result.errors[0],
    };
  };
  
  const validateAll = (data: Partial<T>) => {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;
    
    for (const field in schemas) {
      const result = validate(field, data[field]);
      if (!result.isValid) {
        errors[field] = result.error!;
        isValid = false;
      }
    }
    
    return { isValid, errors };
  };
  
  return { validate, validateAll };
}

// Content Security Policy violation reporter
export function setupCSPReporter() {
  if (typeof window !== 'undefined') {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
        columnNumber: e.columnNumber,
      });
      
      // In production, you would send this to your logging service
      // Example: sendToLoggingService('csp-violation', violationData);
    });
  }
}

// Export all validation schemas
export const validationSchemas = userInputSchemas;