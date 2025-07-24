import { describe, it, expect, vi } from 'vitest'
import { cn } from '../utils'

describe('utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('bg-red-500', 'text-white')
      expect(result).toBe('bg-red-500 text-white')
    })

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
      expect(result).toBe('base-class conditional-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'visible-class')
      expect(result).toBe('base-class visible-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'visible-class')
      expect(result).toBe('base-class visible-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle object notation', () => {
      const result = cn({
        'base-class': true,
        'conditional-class': true,
        'hidden-class': false
      })
      expect(result).toBe('base-class conditional-class')
    })

    it('should merge conflicting Tailwind classes', () => {
      const result = cn('bg-red-500', 'bg-blue-500')
      // Should prioritize the last class due to tailwind-merge
      expect(result).toBe('bg-blue-500')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        {
          'conditional-1': true,
          'conditional-2': false
        },
        ['array-class-1', 'array-class-2'],
        undefined,
        'final-class'
      )
      expect(result).toBe('base-class conditional-1 array-class-1 array-class-2 final-class')
    })
  })
})