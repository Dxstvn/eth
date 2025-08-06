import { describe, it, expect } from 'vitest';

/**
 * Security Unit Tests - Input Validation
 * Tests input sanitization and validation without requiring backend
 */

// Input validation utilities
const validateEmail = (email: string): boolean => {
  // Check for XSS attempts first
  if (email.includes('<') || email.includes('>') || email.includes('script')) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeInput = (input: string): string => {
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '')
    .replace(/<img/gi, '');
};

const validatePhoneNumber = (phone: string): boolean => {
  // International phone number format
  if (!phone || phone.trim() === '') return false;
  
  // Remove spaces, hyphens, and parentheses for validation
  const cleanPhone = phone.replace(/[\s-()]/g, '');
  
  // Check for invalid patterns
  if (cleanPhone.includes('++')) return false;
  if (cleanPhone.startsWith('+0')) return false;
  if (!/^\d+$/.test(cleanPhone.replace('+', '')) && cleanPhone !== '') return false; // Not all digits
  if (cleanPhone.replace('+', '').length < 4) return false; // Too short for valid phone
  
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
};

const validateSSN = (ssn: string): boolean => {
  // US SSN format (XXX-XX-XXXX)
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  
  // Additional validation: reject invalid SSNs
  if (!ssnRegex.test(ssn)) return false;
  
  // Remove hyphens for validation
  const cleanSSN = ssn.replace(/-/g, '');
  
  // Reject SSNs with all zeros in any group
  if (cleanSSN.substr(0, 3) === '000') return false;
  if (cleanSSN.substr(3, 2) === '00') return false;
  if (cleanSSN.substr(5, 4) === '0000') return false;
  
  return true;
};

const validateAmount = (amount: string | number): boolean => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount > 0 && numAmount < 1000000000;
};

describe('Security: Input Validation', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.org',
        'user_123@test-domain.com'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '<script>alert("xss")</script>@example.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script src="evil.js"></script>',
        'Hello <script>evil()</script> World'
      ];
      
      xssPayloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('</script>');
      });
    });

    it('should remove javascript: protocol', () => {
      const payloads = [
        'javascript:alert("XSS")',
        'JAVASCRIPT:void(0)',
        '<a href="javascript:alert(1)">Click</a>'
      ];
      
      payloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized.toLowerCase()).not.toContain('javascript:');
      });
    });

    it('should remove event handlers', () => {
      const payloads = [
        '<div onclick="alert(1)">Click</div>',
        '<input onchange="steal()" />',
        '<body onload="evil()">',
        'onerror=alert(1)'
      ];
      
      payloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toMatch(/on\w+\s*=/);
      });
    });

    it('should remove dangerous HTML elements', () => {
      const payloads = [
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<img src="x" onerror="alert(1)">'
      ];
      
      payloads.forEach(payload => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).not.toContain('<embed');
        expect(sanitized).not.toContain('<img');
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'user@example.com',
        '123 Main Street',
        'Price: $100.00'
      ];
      
      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(input);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '+14155552671',
        '14155552671',
        '+1 415 555 2671',
        '415-555-2671',
        '(415) 555-2671'
      ];
      
      validPhones.forEach(phone => {
        expect(validatePhoneNumber(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        'notaphone',
        '+0123456789',
        '++14155552671',
        ''
      ];
      
      invalidPhones.forEach(phone => {
        const result = validatePhoneNumber(phone);
        if (result !== false) {
          console.log(`Failed on: "${phone}" returned ${result}`);
        }
        expect(result).toBe(false);
      });
    });
  });

  describe('SSN Validation', () => {
    it('should accept valid SSN formats', () => {
      const validSSNs = [
        '123-45-6789',
        '123456789'
      ];
      
      validSSNs.forEach(ssn => {
        expect(validateSSN(ssn)).toBe(true);
      });
    });

    it('should reject invalid SSN formats', () => {
      const invalidSSNs = [
        '123-45-678',
        '123-456-789',
        'abc-de-fghi',
        '000-00-0000'
      ];
      
      invalidSSNs.forEach(ssn => {
        expect(validateSSN(ssn)).toBe(false);
      });
    });
  });

  describe('Amount Validation', () => {
    it('should accept valid amounts', () => {
      const validAmounts = [
        100,
        '100.50',
        0.01,
        999999999
      ];
      
      validAmounts.forEach(amount => {
        expect(validateAmount(amount)).toBe(true);
      });
    });

    it('should reject invalid amounts', () => {
      const invalidAmounts = [
        -100,
        0,
        'not a number',
        1000000000,
        NaN,
        Infinity
      ];
      
      invalidAmounts.forEach(amount => {
        expect(validateAmount(amount)).toBe(false);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection attempts', () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1 UNION SELECT * FROM users"
      ];
      
      const detectSQLInjection = (input: string): boolean => {
        const sqlPatterns = [
          /(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b)/gi,
          /(--|#|\/\*|\*\/)/,
          /('\s*OR\s*'|"\s*OR\s*")/gi,
          /('\s*AND\s*'|"\s*AND\s*")/gi
        ];
        
        return sqlPatterns.some(pattern => pattern.test(input));
      };
      
      sqlPayloads.forEach(payload => {
        expect(detectSQLInjection(payload)).toBe(true);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should detect path traversal attempts', () => {
      const pathPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'file://etc/passwd',
        '....//....//etc/passwd'
      ];
      
      const detectPathTraversal = (input: string): boolean => {
        const patterns = [
          /\.\.[\/\\]/,
          /file:\/\//i,
          /\.{3,}/
        ];
        
        return patterns.some(pattern => pattern.test(input));
      };
      
      pathPayloads.forEach(payload => {
        expect(detectPathTraversal(payload)).toBe(true);
      });
    });
  });
});