"use client"

import { useState, useEffect, useCallback } from 'react'
import { getDeviceInfo, HapticFeedback, KeyboardUtils } from '@/lib/utils/mobile-utils'

export interface MobileLayoutState {
  isMobile: boolean
  isTablet: boolean
  isPortrait: boolean
  keyboardVisible: boolean
  safeAreaInsets: {
    top: number
    bottom: number
    left: number
    right: number
  }
  deviceInfo: ReturnType<typeof getDeviceInfo>
}

export const useMobileLayout = () => {
  const [layoutState, setLayoutState] = useState<MobileLayoutState>({
    isMobile: false,
    isTablet: false,
    isPortrait: true,
    keyboardVisible: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    deviceInfo: getDeviceInfo()
  })

  // Update device info and layout state
  const updateLayoutState = useCallback(() => {
    const deviceInfo = getDeviceInfo()
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Device classification
    const isMobile = deviceInfo.isMobile || width < 768
    const isTablet = width >= 768 && width < 1024 && deviceInfo.hasTouch
    const isPortrait = height > width

    // Safe area insets (for devices with notches, etc.)
    const safeAreaInsets = {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0')
    }

    setLayoutState(prev => ({
      ...prev,
      isMobile,
      isTablet,
      isPortrait,
      safeAreaInsets,
      deviceInfo
    }))
  }, [])

  // Handle keyboard visibility changes
  const handleKeyboardVisibility = useCallback((visible: boolean) => {
    setLayoutState(prev => ({
      ...prev,
      keyboardVisible: visible
    }))

    // Add body class for CSS adjustments
    if (visible) {
      document.body.classList.add('keyboard-visible')
    } else {
      document.body.classList.remove('keyboard-visible')
    }
  }, [])

  // Initialize and set up event listeners
  useEffect(() => {
    updateLayoutState()

    // Set up CSS custom properties for safe areas
    const updateSafeAreas = () => {
      const root = document.documentElement
      
      // Use CSS environment variables if available
      if (CSS.supports('top: env(safe-area-inset-top)')) {
        root.style.setProperty('--sat', 'env(safe-area-inset-top)')
        root.style.setProperty('--sab', 'env(safe-area-inset-bottom)')
        root.style.setProperty('--sal', 'env(safe-area-inset-left)')
        root.style.setProperty('--sar', 'env(safe-area-inset-right)')
      }
    }

    updateSafeAreas()

    // Listen for orientation and resize changes
    const handleResize = () => {
      updateLayoutState()
      updateSafeAreas()
    }

    const handleOrientationChange = () => {
      // Small delay to ensure dimensions have updated
      setTimeout(() => {
        updateLayoutState()
        updateSafeAreas()
      }, 300)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    // Set up keyboard visibility detection
    const cleanupKeyboard = KeyboardUtils.onKeyboardVisibilityChange(handleKeyboardVisibility)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      cleanupKeyboard()
      document.body.classList.remove('keyboard-visible')
    }
  }, [updateLayoutState, handleKeyboardVisibility])

  // Utility functions
  const getResponsiveClasses = useCallback((baseClasses: string, mobileClasses?: string, tabletClasses?: string) => {
    let classes = baseClasses
    
    if (layoutState.isMobile && mobileClasses) {
      classes += ` ${mobileClasses}`
    } else if (layoutState.isTablet && tabletClasses) {
      classes += ` ${tabletClasses}`
    }
    
    return classes
  }, [layoutState.isMobile, layoutState.isTablet])

  const getContainerStyles = useCallback(() => {
    const styles: React.CSSProperties = {}
    
    // Add safe area padding for mobile devices
    if (layoutState.isMobile && layoutState.deviceInfo.hasTouch) {
      styles.paddingTop = `max(1rem, ${layoutState.safeAreaInsets.top}px)`
      styles.paddingBottom = `max(1rem, ${layoutState.safeAreaInsets.bottom}px)`
      styles.paddingLeft = `max(1rem, ${layoutState.safeAreaInsets.left}px)`
      styles.paddingRight = `max(1rem, ${layoutState.safeAreaInsets.right}px)`
    }

    // Adjust for keyboard visibility
    if (layoutState.keyboardVisible) {
      styles.paddingBottom = '0.5rem'
    }

    return styles
  }, [layoutState])

  const getOptimalTouchTarget = useCallback((size: 'small' | 'medium' | 'large' = 'medium') => {
    if (!layoutState.deviceInfo.hasTouch) return undefined

    const sizes = {
      small: '44px',  // iOS minimum
      medium: '48px', // Material Design
      large: '56px'   // Large touch targets
    }

    return {
      minHeight: sizes[size],
      minWidth: sizes[size]
    }
  }, [layoutState.deviceInfo.hasTouch])

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
    if (layoutState.deviceInfo.supportsHaptic) {
      HapticFeedback[type]()
    }
  }, [layoutState.deviceInfo.supportsHaptic])

  const scrollToElement = useCallback((element: HTMLElement, offset: number = 0) => {
    if (!element) return

    const elementRect = element.getBoundingClientRect()
    const additionalOffset = layoutState.keyboardVisible ? 100 : 0
    
    window.scrollTo({
      top: window.scrollY + elementRect.top - offset - additionalOffset,
      behavior: 'smooth'
    })
  }, [layoutState.keyboardVisible])

  const isInViewport = useCallback((element: HTMLElement): boolean => {
    if (!element) return false

    const rect = element.getBoundingClientRect()
    const windowHeight = window.innerHeight || document.documentElement.clientHeight
    const windowWidth = window.innerWidth || document.documentElement.clientWidth

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    )
  }, [])

  return {
    ...layoutState,
    getResponsiveClasses,
    getContainerStyles,
    getOptimalTouchTarget,
    triggerHapticFeedback,
    scrollToElement,
    isInViewport,
    // Computed values
    isTouchDevice: layoutState.deviceInfo.hasTouch,
    isSmallScreen: layoutState.isMobile,
    isLandscape: !layoutState.isPortrait,
    hasNotch: layoutState.safeAreaInsets.top > 0 || layoutState.safeAreaInsets.bottom > 0
  }
}