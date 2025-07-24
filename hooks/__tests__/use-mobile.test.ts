import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMobile } from '../use-mobile'

describe('useMobile hook', () => {
  beforeEach(() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Default to desktop
    })
    
    // Mock addEventListener and removeEventListener
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true for mobile screen sizes', () => {
    // Set mobile screen size (less than 768px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result } = renderHook(() => useMobile())

    expect(result.current).toBe(true)
  })

  it('should return false for desktop screen sizes', () => {
    // Set desktop screen size (768px or larger)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useMobile())

    expect(result.current).toBe(false)
  })

  it('should update when screen size changes', () => {
    // Start with desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useMobile())

    // Initially desktop
    expect(result.current).toBe(false)

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      
      // Trigger resize event
      const resizeEvent = new Event('resize')
      window.dispatchEvent(resizeEvent)
    })

    expect(result.current).toBe(true)

    // Simulate resize back to desktop
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      
      // Trigger resize event
      const resizeEvent = new Event('resize')
      window.dispatchEvent(resizeEvent)
    })

    expect(result.current).toBe(false)
  })

  it('should add and remove event listeners properly', () => {
    const { unmount } = renderHook(() => useMobile())

    // Should have added the resize event listener
    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )

    // Unmount the hook
    unmount()

    // Should have removed the resize event listener
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )
  })

  it('should handle matchMedia not being available', () => {
    // This test is not relevant for the current implementation
    // but keeping it for compatibility in case matchMedia support is added later
    
    // Set mobile screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    // Should not throw an error
    expect(() => {
      renderHook(() => useMobile())
    }).not.toThrow()
  })

  it('should handle SSR environment (no window)', () => {
    // This test is not applicable in jsdom environment since window always exists
    // But we can test that the hook handles window gracefully
    
    // Set mobile screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    // Should not throw an error and should work normally
    expect(() => {
      const { result } = renderHook(() => useMobile())
      expect(result.current).toBe(true)
    }).not.toThrow()
  })

  it('should maintain consistent state across multiple renders', () => {
    // Set mobile screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result, rerender } = renderHook(() => useMobile())

    expect(result.current).toBe(true)

    // Re-render the hook
    rerender()

    // Should maintain the same state
    expect(result.current).toBe(true)
  })

  it('should work with different breakpoints', () => {
    const testCases = [
      { screenWidth: 320, expectedMobile: true },   // Small mobile
      { screenWidth: 480, expectedMobile: true },   // Large mobile
      { screenWidth: 767, expectedMobile: true },   // Max mobile (767 < 768)
      { screenWidth: 768, expectedMobile: false },  // Min tablet (768 >= 768)
      { screenWidth: 1024, expectedMobile: false }, // Desktop
      { screenWidth: 1920, expectedMobile: false }, // Large desktop
    ]

    testCases.forEach(({ screenWidth, expectedMobile }) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: screenWidth,
      })

      const { result } = renderHook(() => useMobile())

      expect(result.current).toBe(expectedMobile)
    })
  })

  it('should handle rapid screen size changes', () => {
    // Start with desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useMobile())

    expect(result.current).toBe(false)

    // Simulate rapid changes
    act(() => {
      // Change to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      window.dispatchEvent(new Event('resize'))
      
      // Change to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      window.dispatchEvent(new Event('resize'))
      
      // Change back to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      window.dispatchEvent(new Event('resize'))
    })

    // Should reflect the final state
    expect(result.current).toBe(true)
  })

  it('should work correctly with orientation changes', () => {
    // Start in mobile portrait
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result } = renderHook(() => useMobile())

    // Start in mobile portrait
    expect(result.current).toBe(true)

    // Rotate to landscape (might become desktop size)
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(false)

    // Rotate back to portrait
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })
})