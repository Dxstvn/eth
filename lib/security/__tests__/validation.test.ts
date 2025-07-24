import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  userInputSchemas,
  sanitizeHtml,
  validateInput,
  escapeHtml,
  sanitizeSqlInput,
  sanitizePath,
  sanitizeJson,
  RateLimiter,
  useFormValidation,
  setupCSPReporter,
  validationSchemas
} from '../validation'

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: vi.fn()
  }
}))

describe('security/validation', () => {
  let mockSanitize: ReturnType<typeof vi.fn>
  
  beforeEach(async () => {
    vi.clearAllMocks()
    // Get the mocked DOMPurify
    const DOMPurify = await import('isomorphic-dompurify')
    mockSanitize = vi.mocked(DOMPurify.default.sanitize)
    mockSanitize.mockImplementation((input: string) => input.replace(/<[^>]*>/g, ''))
  })

  describe('userInputSchemas', () => {
    describe('userName', () => {
      it('should validate correct user name', () => {
        const validName = 'John Doe'
        const result = userInputSchemas.userName.safeParse(validName)
        expect(result.success).toBe(true)
      })

      it('should reject invalid characters in name', () => {
        const invalidName = 'John123'
        const result = userInputSchemas.userName.safeParse(invalidName)
        expect(result.success).toBe(false)
      })

      it('should reject empty name', () => {
        const emptyName = ''
        const result = userInputSchemas.userName.safeParse(emptyName)
        expect(result.success).toBe(false)
      })
    })

    describe('email', () => {
      it('should validate correct email addresses', () => {
        const validEmail = 'test@example.com'
        const result = userInputSchemas.email.safeParse(validEmail)
        expect(result.success).toBe(true)
      })

      it('should reject invalid email addresses', () => {
        const invalidEmail = 'invalid-email'
        const result = userInputSchemas.email.safeParse(invalidEmail)
        expect(result.success).toBe(false)
      })
    })

    describe('walletAddress', () => {
      it('should validate correct Ethereum addresses', () => {
        const validAddress = '0x742d35Cc6131b12c4c0C7b65ED5c81F42C65Aa9B'
        const result = userInputSchemas.walletAddress.safeParse(validAddress)
        expect(result.success).toBe(true)
      })

      it('should reject invalid wallet addresses', () => {
        const invalidAddress = 'invalid-address'
        const result = userInputSchemas.walletAddress.safeParse(invalidAddress)
        expect(result.success).toBe(false)
      })
    })

    describe('amount', () => {
      it('should validate correct amounts', () => {
        const validAmount = '100.50'
        const result = userInputSchemas.amount.safeParse(validAmount)
        expect(result.success).toBe(true)
      })

      it('should reject negative amounts', () => {
        const negativeAmount = '-100'
        const result = userInputSchemas.amount.safeParse(negativeAmount)
        expect(result.success).toBe(false)
      })

      it('should reject zero amounts', () => {
        const zeroAmount = '0'
        const result = userInputSchemas.amount.safeParse(zeroAmount)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('sanitizeHtml', () => {
    it('should sanitize HTML tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello'
      mockSanitize.mockReturnValue('Hello')

      const result = sanitizeHtml(maliciousInput)

      expect(mockSanitize).toHaveBeenCalledWith(maliciousInput, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
      })
      expect(result).toBe('Hello')
    })

    it('should handle empty input', () => {
      mockSanitize.mockReturnValue('')
      const result = sanitizeHtml('')
      expect(result).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      const result = escapeHtml(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should handle empty input', () => {
      const result = escapeHtml('')
      expect(result).toBe('')
    })
  })

  describe('sanitizeSqlInput', () => {
    it('should remove dangerous SQL characters', () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const result = sanitizeSqlInput(maliciousInput)
      expect(result).not.toContain("'")
      expect(result).not.toContain(';')
      expect(result).not.toContain('--')
    })

    it('should handle normal input', () => {
      const normalInput = 'John Doe'
      const result = sanitizeSqlInput(normalInput)
      expect(result).toBe('John Doe')
    })
  })

  describe('sanitizePath', () => {
    it('should remove path traversal attempts', () => {
      const maliciousPath = '../../../etc/passwd'
      const result = sanitizePath(maliciousPath)
      expect(result).not.toContain('..')
      expect(result).toBe('etc/passwd')
    })

    it('should handle normal paths', () => {
      const normalPath = 'documents/file.txt'
      const result = sanitizePath(normalPath)
      expect(result).toBe('documents/file.txt')
    })
  })

  describe('sanitizeJson', () => {
    it('should sanitize string values in objects', () => {
      const input = { name: '<script>alert("xss")</script>John' }
      const result = sanitizeJson(input)
      expect(result.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;John')
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>John</script>',
          profile: {
            bio: '<img src=x onerror=alert(1)>Bio'
          }
        }
      }
      const result = sanitizeJson(input)
      expect(result.user.name).toBe('&lt;script&gt;John&lt;&#x2F;script&gt;')
      expect(result.user.profile.bio).toBe('&lt;img src=x onerror=alert(1)&gt;Bio')
    })

    it('should handle arrays', () => {
      const input = ['<script>item1</script>', 'item2', '<b>item3</b>']
      const result = sanitizeJson(input)
      expect(result[0]).toBe('&lt;script&gt;item1&lt;&#x2F;script&gt;')
      expect(result[1]).toBe('item2')
      expect(result[2]).toBe('&lt;b&gt;item3&lt;&#x2F;b&gt;')
    })

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        items: [1, 2, 3],
        nested: { value: 123 }
      }
      const result = sanitizeJson(input)
      expect(result.name).toBe('John')
      expect(result.age).toBe(30)
      expect(result.active).toBe(true)
      expect(result.items).toEqual([1, 2, 3])
      expect(result.nested.value).toBe(123)
    })
  })

  describe('validateInput', () => {
    it('should validate and return successful input', () => {
      const schema = userInputSchemas.email
      const input = 'test@example.com'

      const result = validateInput(schema, input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(input)
      }
    })

    it('should return validation errors for invalid input', () => {
      const schema = userInputSchemas.email
      const input = 'invalid-email'

      const result = validateInput(schema, input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toBeDefined()
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter

    beforeEach(() => {
      rateLimiter = new RateLimiter(3, 60000) // 3 attempts per minute
    })

    it('should allow requests within rate limit', () => {
      const key = 'test-key-1'
      
      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
    })

    it('should block requests exceeding rate limit', () => {
      const key = 'test-key-2'
      
      // First three requests should pass
      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
      
      // Fourth request should be blocked
      expect(rateLimiter.isAllowed(key)).toBe(false)
    })

    it('should reset rate limit for specific key', () => {
      const key = 'test-key-3'
      
      // Exhaust rate limit
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.isAllowed(key)).toBe(false)
      
      // Reset and try again
      rateLimiter.reset(key)
      expect(rateLimiter.isAllowed(key)).toBe(true)
    })

    it('should return remaining attempts', () => {
      const key = 'test-key-4'
      
      expect(rateLimiter.getRemainingAttempts(key)).toBe(3)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.getRemainingAttempts(key)).toBe(2)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.getRemainingAttempts(key)).toBe(1)
    })
  })

  describe('useFormValidation', () => {
    it('should validate individual fields', () => {
      const schemas = {
        name: userInputSchemas.userName,
        email: userInputSchemas.email
      }
      
      const { validate } = useFormValidation(schemas)
      
      const nameResult = validate('name', 'John Doe')
      expect(nameResult.isValid).toBe(true)
      expect(nameResult.error).toBe(null)
      
      const emailResult = validate('email', 'invalid-email')
      expect(emailResult.isValid).toBe(false)
      expect(emailResult.error).toBeTruthy()
    })

    it('should validate all fields', () => {
      const schemas = {
        name: userInputSchemas.userName,
        email: userInputSchemas.email
      }
      
      const { validateAll } = useFormValidation(schemas)
      
      const validData = {
        name: 'John Doe',
        email: 'john@example.com'
      }
      
      const validResult = validateAll(validData)
      expect(validResult.isValid).toBe(true)
      expect(Object.keys(validResult.errors)).toHaveLength(0)
      
      const invalidData = {
        name: '',
        email: 'invalid-email'
      }
      
      const invalidResult = validateAll(invalidData)
      expect(invalidResult.isValid).toBe(false)
      expect(Object.keys(invalidResult.errors).length).toBeGreaterThan(0)
    })
  })

  describe('setupCSPReporter', () => {
    it('should setup CSP violation listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      
      setupCSPReporter()
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      )
    })
  })

  describe('validationSchemas export', () => {
    it('should export validation schemas', () => {
      expect(validationSchemas).toBeDefined()
      expect(validationSchemas.userName).toBeDefined()
      expect(validationSchemas.email).toBeDefined()
      expect(validationSchemas.walletAddress).toBeDefined()
    })
  })
})