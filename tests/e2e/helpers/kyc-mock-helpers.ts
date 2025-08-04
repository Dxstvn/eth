import { Page } from '@playwright/test'

export interface MockKYCSession {
  sessionId: string
  expiresAt: string
  requiredLevel: 'basic' | 'enhanced' | 'full'
}

export interface MockKYCStatus {
  level: 'none' | 'basic' | 'enhanced' | 'full'
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired'
  lastUpdated?: string
  expiryDate?: string
  completedSteps?: string[]
  riskProfile?: {
    overallRisk: 'low' | 'medium' | 'high'
  }
}

export interface MockKYCResponses {
  startSession?: {
    success: boolean
    session?: MockKYCSession
    error?: string
  }
  uploadDocument?: {
    success: boolean
    result?: {
      documentId: string
      verificationStatus: string
      extractedData?: {
        firstName?: string
        lastName?: string
        documentNumber?: string
        expiryDate?: string
      }
    }
    error?: string
  }
  performLivenessCheck?: {
    success: boolean
    result?: {
      isLive: boolean
      confidence: number
      selfieUrl?: string
    }
    error?: string
  }
  completeSession?: {
    success: boolean
    message?: string
    error?: string
  }
  getStatus?: {
    success: boolean
    status?: MockKYCStatus
    error?: string
  }
}

/**
 * Mock KYC backend API responses
 */
export async function mockKYCBackendResponses(page: Page, responses: MockKYCResponses) {
  await page.route('**/api/kyc/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    
    // Start session
    if (url.includes('/kyc/session/start') && method === 'POST' && responses.startSession) {
      await route.fulfill({ 
        status: responses.startSession.success ? 200 : 400,
        json: responses.startSession 
      })
      return
    }
    
    // Upload document
    if (url.includes('/kyc/document/upload') && method === 'POST' && responses.uploadDocument) {
      await route.fulfill({ 
        status: responses.uploadDocument.success ? 200 : 400,
        json: responses.uploadDocument 
      })
      return
    }
    
    // Liveness check
    if (url.includes('/kyc/liveness/check') && method === 'POST' && responses.performLivenessCheck) {
      await route.fulfill({ 
        status: responses.performLivenessCheck.success ? 200 : 400,
        json: responses.performLivenessCheck 
      })
      return
    }
    
    // Complete session
    if (url.includes('/kyc/session/complete') && method === 'POST' && responses.completeSession) {
      await route.fulfill({ 
        status: responses.completeSession.success ? 200 : 400,
        json: responses.completeSession 
      })
      return
    }
    
    // Get status
    if (url.includes('/kyc/status') && method === 'GET' && responses.getStatus) {
      await route.fulfill({ 
        status: responses.getStatus.success ? 200 : 400,
        json: responses.getStatus 
      })
      return
    }
    
    // Continue with actual request if no mock defined
    await route.continue()
  })
}

/**
 * Create a mock KYC session for testing
 */
export function createMockSession(overrides?: Partial<MockKYCSession>): MockKYCSession {
  return {
    sessionId: `test-session-${Date.now()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    requiredLevel: 'basic',
    ...overrides
  }
}

/**
 * Create a mock KYC status for testing
 */
export function createMockStatus(overrides?: Partial<MockKYCStatus>): MockKYCStatus {
  return {
    level: 'none',
    status: 'not_started',
    lastUpdated: new Date().toISOString(),
    completedSteps: [],
    ...overrides
  }
}

/**
 * Set up authenticated user state in browser
 */
export async function setupAuthenticatedUser(page: Page, userData?: any) {
  await page.evaluate((user) => {
    const defaultUser = {
      id: 'test-user-e2e',
      email: 'test@example.com',
      hasCompletedOnboarding: true,
      kycLevel: 'none',
      kycStatus: { status: 'not_started' },
      facialVerificationStatus: 'pending',
      ...user
    }
    
    localStorage.setItem('clearhold_user', JSON.stringify(defaultUser))
    localStorage.setItem('clearhold_auth_token', 'test-auth-token-e2e')
  }, userData)
}

/**
 * Clear all KYC-related data from browser storage
 */
export async function clearKYCData(page: Page) {
  await page.evaluate(() => {
    // Clear localStorage
    const keysToRemove = ['kycSessionId', 'kycRedirectPath', 'kycBannerDismissed']
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    // Clear cookies related to KYC
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=')
      if (name.trim().includes('kyc')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
    })
  })
}

/**
 * Wait for KYC status to update
 */
export async function waitForKYCStatusUpdate(page: Page, expectedStatus: string, timeout = 10000) {
  await page.waitForFunction(
    (status) => {
      const kycData = JSON.parse(localStorage.getItem('clearhold_kyc_data') || '{}')
      return kycData.status === status
    },
    expectedStatus,
    { timeout }
  )
}

/**
 * Mock camera permissions and stream for facial verification
 */
export async function mockCameraStream(page: Page) {
  await page.evaluate(() => {
    // Create a mock MediaStream
    const mockStream = {
      getTracks: () => [{
        stop: () => {},
        kind: 'video'
      }],
      getVideoTracks: () => [{
        stop: () => {},
        getSettings: () => ({ width: 640, height: 480 })
      }]
    }
    
    // Override getUserMedia
    ;(navigator.mediaDevices as any).getUserMedia = async () => mockStream
  })
}

/**
 * Fill basic KYC information form
 */
export async function fillBasicInfoForm(page: Page, data?: any) {
  const defaultData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    nationality: 'US',
    countryOfResidence: 'US',
    city: 'New York',
    address: '123 Main St',
    postalCode: '10001',
    phone: '+1234567890',
    occupation: 'Software Engineer',
    sourceOfFunds: 'employment',
    ...data
  }
  
  await page.getByLabel('First Name *').fill(defaultData.firstName)
  await page.getByLabel('Last Name *').fill(defaultData.lastName)
  await page.getByLabel('Date of Birth *').fill(defaultData.dateOfBirth)
  await page.getByLabel('Nationality *').selectOption(defaultData.nationality)
  await page.getByLabel('Country of Residence *').selectOption(defaultData.countryOfResidence)
  await page.getByLabel('City *').fill(defaultData.city)
  await page.getByLabel('Street Address *').fill(defaultData.address)
  await page.getByLabel('Postal/ZIP Code *').fill(defaultData.postalCode)
  await page.getByLabel('Phone Number *').fill(defaultData.phone)
  await page.getByLabel('Occupation *').fill(defaultData.occupation)
  await page.getByLabel('Primary Source of Funds *').selectOption(defaultData.sourceOfFunds)
}