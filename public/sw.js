// ClearHold KYC Service Worker for Mobile Optimization
const CACHE_NAME = 'clearhold-kyc-v1'
const KYC_CACHE = 'clearhold-kyc-data-v1'

// Cache essential KYC resources
const STATIC_CACHE_FILES = [
  '/kyc',
  '/kyc/personal',
  '/kyc/documents',
  '/kyc/status',
  // Add other critical KYC routes
]

const DYNAMIC_CACHE_FILES = [
  // API endpoints that should be cached when possible
  '/api/kyc/personal',
  '/api/kyc/documents',
  '/api/kyc/status'
]

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker for KYC mobile optimization')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching KYC static resources')
        return cache.addAll(STATIC_CACHE_FILES)
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Failed to cache static resources:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== KYC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Only handle same-origin requests and important CDN resources
  if (url.origin !== location.origin && !isImportantResource(url)) {
    return
  }

  // Handle different types of requests with appropriate strategies
  if (request.url.includes('/api/kyc/')) {
    // KYC API requests - network first with cache fallback
    event.respondWith(networkFirstStrategy(request))
  } else if (request.url.includes('/kyc')) {
    // KYC pages - cache first with network fallback
    event.respondWith(cacheFirstStrategy(request))
  } else if (request.destination === 'image') {
    // Images - cache first
    event.respondWith(cacheFirstStrategy(request))
  } else if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    // Static resources - stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request))
  } else {
    // Default - network first
    event.respondWith(networkFirstStrategy(request))
  }
})

// Network first strategy - for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(KYC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page or error response for KYC pages
    if (request.destination === 'document') {
      return createOfflineResponse()
    }
    
    throw error
  }
}

// Cache first strategy - for static content
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Failed to fetch and cache:', request.url)
    throw error
  }
}

// Stale while revalidate strategy - for updated static content
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request)
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(CACHE_NAME)
      cache.then(c => c.put(request, networkResponse.clone()))
    }
    return networkResponse
  }).catch(error => {
    console.log('[SW] Network fetch failed:', error)
    return cachedResponse
  })
  
  return cachedResponse || fetchPromise
}

// Check if resource is important enough to cache
function isImportantResource(url) {
  const importantDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net'
  ]
  
  return importantDomains.some(domain => url.hostname.includes(domain))
}

// Create offline response for pages
function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ClearHold KYC - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
          color: #333;
          text-align: center;
        }
        .container {
          max-width: 400px;
          margin: 50px auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #1a3c34;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .btn {
          background: #2d7463;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          margin: 5px;
        }
        .btn:hover {
          background: #225f51;
        }
        .offline-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #dc3545;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="offline-indicator">Offline</div>
      <div class="container">
        <div class="icon">📱</div>
        <h1>You're Offline</h1>
        <p>Your KYC progress has been saved locally. You can continue filling out forms, and your data will be synchronized when you're back online.</p>
        <p>Any files you upload will be stored securely on your device until connection is restored.</p>
        <button class="btn" onclick="location.reload()">Try Again</button>
        <a href="/kyc" class="btn">Continue KYC</a>
      </div>
      
      <script>
        // Auto-reload when online
        window.addEventListener('online', () => {
          setTimeout(() => location.reload(), 1000)
        })
        
        // Update offline indicator
        function updateOnlineStatus() {
          const indicator = document.querySelector('.offline-indicator')
          if (navigator.onLine) {
            indicator.textContent = 'Online'
            indicator.style.background = '#28a745'
            setTimeout(() => location.reload(), 1000)
          } else {
            indicator.textContent = 'Offline'
            indicator.style.background = '#dc3545'
          }
        }
        
        window.addEventListener('online', updateOnlineStatus)
        window.addEventListener('offline', updateOnlineStatus)
      </script>
    </body>
    </html>
  `
  
  return new Response(offlineHTML, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  })
}

// Handle background sync for KYC data
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'kyc-data-sync') {
    event.waitUntil(syncKYCData())
  }
})

// Sync KYC data when connection is restored
async function syncKYCData() {
  try {
    // Get stored KYC data from IndexedDB or cache
    const kycData = await getStoredKYCData()
    
    if (kycData && kycData.length > 0) {
      console.log('[SW] Syncing stored KYC data:', kycData.length, 'items')
      
      for (const data of kycData) {
        try {
          const response = await fetch(data.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': data.authToken ? `Bearer ${data.authToken}` : ''
            },
            body: JSON.stringify(data.payload)
          })
          
          if (response.ok) {
            // Remove successfully synced data
            await removeStoredKYCData(data.id)
            console.log('[SW] Successfully synced KYC data item:', data.id)
          }
        } catch (error) {
          console.error('[SW] Failed to sync KYC data item:', data.id, error)
        }
      }
    }
  } catch (error) {
    console.error('[SW] KYC data sync failed:', error)
  }
}

// Placeholder functions for KYC data management
async function getStoredKYCData() {
  // Implementation would use IndexedDB to retrieve stored KYC data
  return []
}

async function removeStoredKYCData(id) {
  // Implementation would remove synced data from IndexedDB
  console.log('[SW] Removing synced KYC data:', id)
}

// Handle push notifications for KYC status updates
self.addEventListener('push', event => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    
    if (data.type === 'kyc-status-update') {
      const options = {
        body: data.message,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: 'kyc-status',
        renotify: true,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Status',
            icon: '/icons/view-icon.png'
          }
        ],
        data: {
          url: '/kyc/status'
        }
      }
      
      event.waitUntil(
        self.registration.showNotification('ClearHold - KYC Update', options)
      )
    }
  } catch (error) {
    console.error('[SW] Failed to handle push notification:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  if (action === 'view' || !action) {
    const url = data?.url || '/kyc/status'
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes('/kyc') && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        
        // Open new window
        return clients.openWindow(url)
      })
    )
  }
})

console.log('[SW] ClearHold KYC Service Worker loaded')