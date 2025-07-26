"use client"

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Loading component for lazy-loaded KYC components
const KYCLoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    <p className="text-sm text-gray-600">{message}</p>
  </div>
)

// Mobile-optimized loading skeleton
const MobileKYCSkeletonLoader = ({ type }: { type: 'form' | 'document' | 'camera' | 'status' }) => {
  const renderFormSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      
      {/* Form fields skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
      
      {/* Button skeleton */}
      <div className="h-14 bg-gray-200 rounded w-full"></div>
    </div>
  )

  const renderDocumentSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* Tabs skeleton */}
      <div className="flex space-x-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded flex-1"></div>
        ))}
      </div>
      
      {/* Upload area skeleton */}
      <div className="h-64 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300"></div>
      
      {/* Instructions skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )

  const renderCameraSkeleton = () => (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4">
        <div className="w-8 h-8 bg-gray-600 rounded"></div>
        <div className="w-32 h-6 bg-gray-600 rounded"></div>
        <div className="w-8 h-8 bg-gray-600 rounded"></div>
      </div>
      
      {/* Camera view skeleton */}
      <div className="flex-1 bg-gray-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4"></div>
          <div className="w-48 h-4 bg-gray-600 rounded mx-auto"></div>
        </div>
      </div>
      
      {/* Controls skeleton */}
      <div className="p-6 flex justify-center">
        <div className="w-20 h-20 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  )

  const renderStatusSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* Status card skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* Progress skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  switch (type) {
    case 'form':
      return renderFormSkeleton()
    case 'document':
      return renderDocumentSkeleton()
    case 'camera':
      return renderCameraSkeleton()
    case 'status':
      return renderStatusSkeleton()
    default:
      return <KYCLoadingSpinner />
  }
}

// Lazy-loaded KYC components with mobile optimization
export const LazyDocumentUploadStep = dynamic(
  () => import('./steps/DocumentUploadStep').then(mod => ({ default: mod.DocumentUploadStep })),
  {
    loading: () => <MobileKYCSkeletonLoader type="document" />,
    ssr: false // Disable SSR for camera-dependent components
  }
)

export const LazyMobileCameraInterface = dynamic(
  () => import('./mobile-camera-interface').then(mod => ({ default: mod.MobileCameraInterface })),
  {
    loading: () => <MobileKYCSkeletonLoader type="camera" />,
    ssr: false
  }
)

export const LazySecureFileUpload = dynamic(
  () => import('./secure-file-upload').then(mod => ({ default: mod.SecureFileUpload })),
  {
    loading: () => <KYCLoadingSpinner message="Loading secure upload..." />,
    ssr: true
  }
)

export const LazyRiskAssessmentStep = dynamic(
  () => import('./steps/RiskAssessmentStep'),
  {
    loading: () => <MobileKYCSkeletonLoader type="form" />,
    ssr: true
  }
)

export const LazyLivenessCheckStep = dynamic(
  () => import('./steps/LivenessCheckStep'),
  {
    loading: () => <MobileKYCSkeletonLoader type="camera" />,
    ssr: false
  }
)

export const LazyAddressProofStep = dynamic(
  () => import('./steps/AddressProofStep'),
  {
    loading: () => <MobileKYCSkeletonLoader type="document" />,
    ssr: true
  }
)

export const LazyKYCReviewSummary = dynamic(
  () => import('./review/KYCReviewSummary'),
  {
    loading: () => <MobileKYCSkeletonLoader type="status" />,
    ssr: true
  }
)

export const LazyKYCStatusPage = dynamic(
  () => import('./review/KYCStatusPage'),
  {
    loading: () => <MobileKYCSkeletonLoader type="status" />,
    ssr: true
  }
)

// Admin components (loaded only when needed)
export const LazyKYCAdminControls = dynamic(
  () => import('./admin/KYCAdminControls'),
  {
    loading: () => <KYCLoadingSpinner message="Loading admin controls..." />,
    ssr: false
  }
)

export const LazyKYCQueueManager = dynamic(
  () => import('./admin/KYCQueueManager'),
  {
    loading: () => <KYCLoadingSpinner message="Loading queue manager..." />,
    ssr: false
  }
)

export const LazyKYCAnalytics = dynamic(
  () => import('./admin/KYCAnalytics'),
  {
    loading: () => <KYCLoadingSpinner message="Loading analytics..." />,
    ssr: false
  }
)

// Higher-order component for consistent error boundaries and mobile optimization
export const withMobileOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    enableHaptic?: boolean
    optimizeTouch?: boolean
    skeleton?: 'form' | 'document' | 'camera' | 'status'
  } = {}
) => {
  const WrappedComponent = (props: P) => {
    return (
      <Suspense 
        fallback={
          options.skeleton ? 
            <MobileKYCSkeletonLoader type={options.skeleton} /> : 
            <KYCLoadingSpinner />
        }
      >
        <div 
          className={`
            mobile-optimized-component
            ${options.optimizeTouch ? 'touch-optimized' : ''}
          `}
          data-haptic-enabled={options.enableHaptic}
        >
          <Component {...props} />
        </div>
      </Suspense>
    )
  }

  WrappedComponent.displayName = `withMobileOptimization(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Preload components based on user flow
export const preloadKYCComponents = {
  personal: () => {
    // Preload likely next components
    import('./steps/DocumentUploadStep')
    import('./secure-file-upload')
  },
  
  documents: () => {
    import('./mobile-camera-interface')
    import('./steps/RiskAssessmentStep')
  },
  
  risk: () => {
    import('./steps/LivenessCheckStep')
    import('./review/KYCReviewSummary')
  },
  
  review: () => {
    import('./review/KYCStatusPage')
  }
}

// Performance monitoring for lazy-loaded components
export const trackComponentLoad = (componentName: string, loadTime: number) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Send to analytics or monitoring service
    console.debug(`[KYC Mobile] ${componentName} loaded in ${loadTime}ms`)
    
    // Example: Send to analytics
    // analytics.track('kyc_component_loaded', {
    //   component: componentName,
    //   loadTime,
    //   isMobile: window.innerWidth < 768,
    //   connection: navigator.connection?.effectiveType
    // })
  }
}

export default {
  LazyDocumentUploadStep,
  LazyMobileCameraInterface,
  LazySecureFileUpload,
  LazyRiskAssessmentStep,
  LazyLivenessCheckStep,
  LazyAddressProofStep,
  LazyKYCReviewSummary,
  LazyKYCStatusPage,
  LazyKYCAdminControls,
  LazyKYCQueueManager,
  LazyKYCAnalytics,
  withMobileOptimization,
  preloadKYCComponents,
  trackComponentLoad
}