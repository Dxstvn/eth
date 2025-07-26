/**
 * Mobile-specific utilities for KYC forms
 * Provides haptic feedback, keyboard optimization, and touch enhancements
 */

// Device detection utilities
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  
  return mobileRegex.test(userAgent) || window.ontouchstart !== undefined
}

export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && 
         !(window as any).MSStream
}

export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  
  return /Android/i.test(window.navigator.userAgent)
}

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      hasTouch: false,
      supportsHaptic: false
    }
  }

  const isMobile = isMobileDevice()
  const isIOS = isIOSDevice()
  const isAndroid = isAndroidDevice()
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const supportsHaptic = 'vibrate' in navigator || 'hapticFeedback' in navigator

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasTouch,
    supportsHaptic,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    userAgent: window.navigator.userAgent
  }
}

// Haptic feedback utilities
export class HapticFeedback {
  private static isSupported(): boolean {
    return 'vibrate' in navigator || 'hapticFeedback' in navigator
  }

  static light(): void {
    if (!this.isSupported()) return

    try {
      // Use Haptic API if available (iOS Safari)
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.impact('light')
        return
      }

      // Fallback to vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }

  static medium(): void {
    if (!this.isSupported()) return

    try {
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.impact('medium')
        return
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(20)
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }

  static heavy(): void {
    if (!this.isSupported()) return

    try {
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.impact('heavy')
        return
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }

  static success(): void {
    if (!this.isSupported()) return

    try {
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.notification('success')
        return
      }

      if ('vibrate' in navigator) {
        // Two quick pulses for success
        navigator.vibrate([15, 10, 15])
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }

  static error(): void {
    if (!this.isSupported()) return

    try {
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.notification('error')
        return
      }

      if ('vibrate' in navigator) {
        // Three sharp pulses for error
        navigator.vibrate([30, 10, 30, 10, 30])
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }

  static warning(): void {
    if (!this.isSupported()) return

    try {
      if ('hapticFeedback' in navigator) {
        // @ts-ignore - experimental API
        navigator.hapticFeedback.notification('warning')
        return
      }

      if ('vibrate' in navigator) {
        // Long pulse for warning
        navigator.vibrate(100)
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error)
    }
  }
}

// Keyboard optimization utilities
export class KeyboardUtils {
  static getOptimalInputMode(fieldType: string): string {
    const inputModes: Record<string, string> = {
      email: 'email',
      phone: 'tel',
      ssn: 'numeric',
      postalCode: 'numeric',
      dateOfBirth: 'numeric',
      currency: 'decimal',
      number: 'numeric'
    }

    return inputModes[fieldType] || 'text'
  }

  static getOptimalAutocomplete(fieldType: string): string {
    const autocompleteMap: Record<string, string> = {
      firstName: 'given-name',
      lastName: 'family-name',
      middleName: 'additional-name',
      email: 'email',
      phone: 'tel',
      dateOfBirth: 'bday',
      address: 'street-address',
      city: 'address-level2',
      state: 'address-level1',
      postalCode: 'postal-code',
      country: 'country-name',
      occupation: 'organization-title',
      employer: 'organization'
    }

    return autocompleteMap[fieldType] || 'off'
  }

  // Prevent zoom on iOS input focus
  static preventIOSZoom(element: HTMLInputElement): void {
    if (!isIOSDevice()) return

    const fontSize = parseFloat(window.getComputedStyle(element).fontSize)
    if (fontSize < 16) {
      element.style.fontSize = '16px'
      element.style.transformOrigin = 'left top'
      element.style.transform = `scale(${fontSize / 16})`
    }
  }

  // Handle keyboard visibility changes
  static onKeyboardVisibilityChange(callback: (visible: boolean) => void): () => void {
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight
    
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight
      const heightDifference = initialViewportHeight - currentHeight
      const keyboardVisible = heightDifference > 150 // Threshold for keyboard detection
      
      callback(keyboardVisible)
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      return () => window.visualViewport?.removeEventListener('resize', handleResize)
    } else {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }
}

// Touch interaction utilities
export class TouchUtils {
  // Add active state for better touch feedback
  static addTouchFeedback(element: HTMLElement): void {
    if (!element) return

    let touchActive = false

    const addClass = () => {
      if (!touchActive) {
        element.classList.add('touch-active')
        touchActive = true
        HapticFeedback.light()
      }
    }

    const removeClass = () => {
      if (touchActive) {
        element.classList.remove('touch-active')
        touchActive = false
      }
    }

    // Touch events
    element.addEventListener('touchstart', addClass, { passive: true })
    element.addEventListener('touchend', removeClass, { passive: true })
    element.addEventListener('touchcancel', removeClass, { passive: true })

    // Mouse events for desktop testing
    element.addEventListener('mousedown', addClass)
    element.addEventListener('mouseup', removeClass)
    element.addEventListener('mouseleave', removeClass)
  }

  // Optimize scroll performance
  static optimizeScrolling(element: HTMLElement): void {
    if (!element) return

    element.style.webkitOverflowScrolling = 'touch'
    element.style.overscrollBehavior = 'contain'
  }

  // Add pull-to-refresh functionality
  static addPullToRefresh(
    element: HTMLElement,
    onRefresh: () => Promise<void>,
    threshold: number = 60
  ): () => void {
    let startY = 0
    let currentY = 0
    let isRefreshing = false
    let isPulling = false

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY = e.touches[0].clientY
        isPulling = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return

      currentY = e.touches[0].clientY
      const pullDistance = currentY - startY

      if (pullDistance > 0 && element.scrollTop === 0) {
        e.preventDefault()
        
        // Visual feedback for pull distance
        const opacity = Math.min(pullDistance / threshold, 1)
        element.style.transform = `translateY(${Math.min(pullDistance / 3, threshold / 3)}px)`
        element.style.opacity = (1 - opacity * 0.3).toString()

        if (pullDistance > threshold) {
          HapticFeedback.medium()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling) return

      const pullDistance = currentY - startY

      if (pullDistance > threshold && !isRefreshing) {
        isRefreshing = true
        HapticFeedback.success()
        
        try {
          await onRefresh()
        } finally {
          isRefreshing = false
        }
      }

      // Reset visual state
      element.style.transform = ''
      element.style.opacity = ''
      isPulling = false
      startY = 0
      currentY = 0
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)  
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }
}

// Performance optimization utilities
export class MobilePerformance {
  // Lazy load images with intersection observer
  static lazyLoadImages(selector: string = 'img[data-src]'): void {
    if (!('IntersectionObserver' in window)) {
      // Fallback for older browsers
      document.querySelectorAll(selector).forEach((img: any) => {
        img.src = img.dataset.src
      })
      return
    }

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          img.src = img.dataset.src!
          img.classList.remove('lazy')
          imageObserver.unobserve(img)
        }
      })
    }, {
      rootMargin: '50px 0px'
    })

    document.querySelectorAll(selector).forEach((img) => {
      imageObserver.observe(img)
    })
  }

  // Reduce image quality for slower connections
  static adaptImageQuality(): 'high' | 'medium' | 'low' {
    if (!('connection' in navigator)) return 'high'

    const connection = (navigator as any).connection
    const effectiveType = connection.effectiveType

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low'
      case '3g':
        return 'medium'
      case '4g':
      default:
        return 'high'
    }
  }

  // Preload critical resources
  static preloadCriticalResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      
      if (resource.endsWith('.js')) {
        link.as = 'script'
      } else if (resource.endsWith('.css')) {
        link.as = 'style'
      } else if (resource.match(/\.(jpg|jpeg|png|webp)$/)) {
        link.as = 'image'
      }
      
      document.head.appendChild(link)
    })
  }
}

// Accessibility enhancements for mobile
export class MobileAccessibility {
  // Improve touch target sizes
  static improveTouchTargets(minSize: number = 44): void {
    const elements = document.querySelectorAll('button, input, select, a, [role="button"]')
    
    elements.forEach((element: any) => {
      const rect = element.getBoundingClientRect()
      
      if (rect.width < minSize || rect.height < minSize) {
        element.style.minWidth = `${minSize}px`
        element.style.minHeight = `${minSize}px`
        element.style.padding = element.style.padding || '8px'
      }
    })
  }

  // Add focus management for keyboard navigation
  static manageFocus(): void {
    let isUsingKeyboard = false

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true
        document.body.classList.add('keyboard-navigation')
      }
    })

    document.addEventListener('mousedown', () => {
      isUsingKeyboard = false
      document.body.classList.remove('keyboard-navigation')
    })

    document.addEventListener('touchstart', () => {
      isUsingKeyboard = false
      document.body.classList.remove('keyboard-navigation')
    })
  }

  // Announce status changes to screen readers
  static announceStatus(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
}

// Combined mobile optimization hook
export const useMobileOptimizations = () => {
  const deviceInfo = getDeviceInfo()

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
    HapticFeedback[type]()
  }

  const optimizeInput = (element: HTMLInputElement, fieldType: string) => {
    element.inputMode = KeyboardUtils.getOptimalInputMode(fieldType)
    element.autocomplete = KeyboardUtils.getOptimalAutocomplete(fieldType)
    
    if (deviceInfo.isIOS) {
      KeyboardUtils.preventIOSZoom(element)
    }
  }

  const addTouchFeedback = (element: HTMLElement) => {
    TouchUtils.addTouchFeedback(element)
  }

  return {
    deviceInfo,
    triggerHaptic,
    optimizeInput,
    addTouchFeedback,
    HapticFeedback,
    KeyboardUtils,
    TouchUtils,
    MobilePerformance,
    MobileAccessibility
  }
}

export default {
  isMobileDevice,
  isIOSDevice,
  isAndroidDevice,
  getDeviceInfo,
  HapticFeedback,
  KeyboardUtils,
  TouchUtils,
  MobilePerformance,
  MobileAccessibility,
  useMobileOptimizations
}