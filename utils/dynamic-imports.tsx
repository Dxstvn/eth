import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { Skeleton } from '@/components/ui/design-system'

/**
 * Dynamic import utility for code splitting with ClearHold loading states
 */

// Loading component with ClearHold branding
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center space-y-4">
      <Skeleton.Card />
      <div className="text-sm text-gray-500">Loading...</div>
    </div>
  </div>
)

// Page-level loading component
const PageLoadingComponent = () => (
  <div className="container mx-auto p-6 space-y-6">
    <Skeleton.Text lines={1} className="w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Skeleton.Card />
      <Skeleton.Card />
      <Skeleton.Card />
    </div>
  </div>
)

// Form loading component
const FormLoadingComponent = () => (
  <div className="max-w-2xl mx-auto p-6">
    <Skeleton.Form />
  </div>
)

/**
 * Create a dynamically imported component with loading state
 */
export function createDynamicComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loading?: ComponentType
    ssr?: boolean
  } = {}
) {
  return dynamic(importFn, {
    loading: options.loading || LoadingComponent,
    ssr: options.ssr ?? true
  })
}

/**
 * Create a dynamically imported page component
 */
export function createDynamicPage<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    ssr?: boolean
  } = {}
) {
  return dynamic(importFn, {
    loading: PageLoadingComponent,
    ssr: options.ssr ?? true
  })
}

/**
 * Create a dynamically imported form component
 */
export function createDynamicForm<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    ssr?: boolean
  } = {}
) {
  return dynamic(importFn, {
    loading: FormLoadingComponent,
    ssr: options.ssr ?? false // Forms typically don't need SSR
  })
}

/**
 * Create a client-only dynamic component (no SSR)
 */
export function createClientOnlyComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loading?: ComponentType
) {
  return dynamic(importFn, {
    loading: loading || LoadingComponent,
    ssr: false
  })
}

// Pre-configured dynamic imports for existing heavy components
export const DynamicComponents = {
  // File upload components
  FileUpload: createDynamicComponent(
    () => import('@/components/file-upload-enhanced'),
    { ssr: false }
  ),
  
  // Transaction card component
  TransactionCard: createDynamicComponent(
    () => import('@/components/transaction-card')
  ),
  
  // Dashboard components
  DashboardStats: createDynamicComponent(
    () => import('@/components/dashboard-stats')
  ),
  
  // Contact invitation form
  ContactInvitationForm: createDynamicForm(
    () => import('@/components/contact-invitation-form')
  ),
  
  // Wallet connect modal
  WalletConnectModal: createClientOnlyComponent(
    () => import('@/components/wallet-connect-modal')
  ),
  
  // Document preview modal  
  DocumentPreviewModal: createClientOnlyComponent(
    () => import('@/components/document-preview-modal'),
    () => <Skeleton.Card className="h-96" />
  )
}

/**
 * Preload a dynamic component for better UX
 */
export async function preloadComponent(componentImport: () => Promise<any>) {
  try {
    await componentImport()
  } catch (error) {
    console.warn('Failed to preload component:', error)
  }
}

/**
 * Preload components on route hover or focus
 */
export function setupPreloading() {
  if (typeof window === 'undefined') return

  // Preload on link hover
  document.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement
    const link = target.closest('a[data-preload]')
    if (link) {
      const preloadTarget = link.getAttribute('data-preload')
      if (preloadTarget && DynamicComponents[preloadTarget as keyof typeof DynamicComponents]) {
        // Preload the component
        const component = DynamicComponents[preloadTarget as keyof typeof DynamicComponents]
        if (component && typeof component.preload === 'function') {
          component.preload()
        }
      }
    }
  })

  // Preload on intersection (when component container comes into view)
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            const preloadTarget = target.getAttribute('data-preload-on-view')
            if (preloadTarget && DynamicComponents[preloadTarget as keyof typeof DynamicComponents]) {
              const component = DynamicComponents[preloadTarget as keyof typeof DynamicComponents]
              if (component && typeof component.preload === 'function') {
                component.preload()
              }
              observer.unobserve(target)
            }
          }
        })
      },
      { rootMargin: '50px' }
    )

    // Observe elements with preload-on-view attribute
    document.querySelectorAll('[data-preload-on-view]').forEach((el) => {
      observer.observe(el)
    })
  }
}