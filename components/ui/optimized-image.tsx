"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  quality?: number
  fill?: boolean
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  objectPosition?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
  lazy?: boolean
  threshold?: number
  rootMargin?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  quality = 75,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  onLoad,
  onError,
  fallback,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority, isInView, threshold, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setIsError(true)
    onError?.()
  }

  // Generate blur placeholder if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL
    
    // Generate a simple base64 blur placeholder
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#f3f4f6' // ClearHold light gray
      ctx.fillRect(0, 0, 4, 4)
      return canvas.toDataURL()
    }
    
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4='
  }

  // Default sizes for responsive images
  const defaultSizes = sizes || (
    fill 
      ? '100vw'
      : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  )

  // Container classes
  const containerClasses = cn(
    'relative overflow-hidden',
    !isLoaded && 'animate-pulse bg-gray-200',
    className
  )

  // Image classes
  const imageClasses = cn(
    'transition-opacity duration-300',
    isLoaded ? 'opacity-100' : 'opacity-0'
  )

  if (isError && fallback) {
    return <div className={containerClasses}>{fallback}</div>
  }

  if (isError) {
    return (
      <div className={cn(containerClasses, 'flex items-center justify-center bg-gray-100')}>
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">Image failed to load</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={imgRef} className={containerClasses}>
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          sizes={defaultSizes}
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : loading}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
          className={imageClasses}
          style={{
            objectFit: fill ? objectFit : undefined,
            objectPosition: fill ? objectPosition : undefined,
          }}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      
      {/* Loading skeleton */}
      {!isInView && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}
    </div>
  )
}

// Specialized image components
export function PropertyImage({ 
  src, 
  alt, 
  className,
  ...props 
}: Omit<OptimizedImageProps, 'sizes'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn('rounded-lg', className)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={80}
      placeholder="blur"
      {...props}
    />
  )
}

export function ProfileImage({ 
  src, 
  alt, 
  size = 40,
  className,
  ...props 
}: Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      sizes={`${size}px`}
      quality={90}
      placeholder="blur"
      {...props}
    />
  )
}

export function DocumentThumbnail({ 
  src, 
  alt, 
  className,
  ...props 
}: Omit<OptimizedImageProps, 'sizes'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={cn('rounded border border-gray-200', className)}
      sizes="(max-width: 768px) 50vw, 200px"
      quality={70}
      placeholder="blur"
      {...props}
    />
  )
}

export function HeroImage({ 
  src, 
  alt, 
  className,
  ...props 
}: Omit<OptimizedImageProps, 'priority' | 'sizes'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      sizes="100vw"
      quality={85}
      priority={true}
      placeholder="blur"
      {...props}
    />
  )
}