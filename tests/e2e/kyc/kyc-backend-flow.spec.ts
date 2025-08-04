import { test, expect } from '@playwright/test'
import { mockKYCBackendResponses, createMockSession } from '../helpers/kyc-mock-helpers'

test.describe('KYC Backend Integration E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock backend API responses
    await mockKYCBackendResponses(page, {
      startSession: {
        success: true,
        session: {
          sessionId: 'e2e-test-session-123',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          requiredLevel: 'basic'
        }
      },
      getStatus: {
        success: true,
        status: {
          level: 'none',
          status: 'not_started',
          completedSteps: []
        }
      }
    })

    // Set up authenticated user
    await context.addCookies([{
      name: 'clearhold_auth_token',
      value: 'e2e-test-token',
      domain: 'localhost',
      path: '/'
    }])

    // Navigate to dashboard
    await page.goto('/dashboard')
  })

  test('should show KYC notification banner for unverified users', async ({ page }) => {
    // Check for KYC banner
    await expect(page.locator('[data-testid="kyc-notification-banner"]')).toBeVisible()
    await expect(page.getByText(/Complete identity verification/)).toBeVisible()
    
    // Verify the call-to-action button
    const verifyButton = page.getByRole('button', { name: 'Verify Identity' })
    await expect(verifyButton).toBeVisible()
  })

  test('should block transaction creation without KYC', async ({ page }) => {
    // Try to create a new transaction
    await page.getByRole('link', { name: 'New Transaction' }).click()
    
    // Should see KYC guard instead of transaction form
    await expect(page.getByText('Identity Verification Required')).toBeVisible()
    await expect(page.getByText(/Complete identity verification to create secure escrow transactions/)).toBeVisible()
    
    // Should not see transaction form
    await expect(page.getByText('Transaction Details')).not.toBeVisible()
  })

  test('should complete full KYC onboarding flow', async ({ page }) => {
    // Start from KYC banner
    await page.getByRole('button', { name: 'Verify Identity' }).click()
    
    // Step 1: Welcome page
    await expect(page).toHaveURL('/onboarding/welcome')
    await expect(page.getByText('Welcome to ClearHold')).toBeVisible()
    
    // Accept consent
    await page.getByLabel(/I consent to the collection/).check()
    await page.getByRole('button', { name: 'Begin Verification' }).click()
    
    // Step 2: Basic Information
    await expect(page).toHaveURL('/onboarding/basic-info')
    
    // Fill in basic info
    await page.getByLabel('First Name *').fill('John')
    await page.getByLabel('Last Name *').fill('Doe')
    await page.getByLabel('Date of Birth *').fill('1990-01-01')
    await page.getByLabel('Nationality *').selectOption('US')
    await page.getByLabel('Country of Residence *').selectOption('US')
    await page.getByLabel('City *').fill('New York')
    await page.getByLabel('Street Address *').fill('123 Main St')
    await page.getByLabel('Postal/ZIP Code *').fill('10001')
    await page.getByLabel('Phone Number *').fill('+1234567890')
    await page.getByLabel('Occupation *').fill('Software Engineer')
    await page.getByLabel('Primary Source of Funds *').selectOption('employment')
    
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Step 3: Document Upload
    await expect(page).toHaveURL('/onboarding/kyc-documents')
    
    // Mock document upload response
    await mockKYCBackendResponses(page, {
      uploadDocument: {
        success: true,
        result: {
          documentId: 'doc-e2e-123',
          verificationStatus: 'processing',
          extractedData: {
            firstName: 'John',
            lastName: 'Doe',
            documentNumber: 'P123456789',
            expiryDate: '2030-01-01'
          }
        }
      }
    })
    
    // Upload document (mock file input)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'passport.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-passport-image')
    })
    
    // Wait for upload to complete
    await expect(page.getByText('Document uploaded successfully')).toBeVisible()
    
    // Step 4: Facial Verification
    await expect(page).toHaveURL('/onboarding/kyc-selfie')
    
    // Mock camera permissions
    await page.context().grantPermissions(['camera'])
    
    // Mock liveness check response
    await mockKYCBackendResponses(page, {
      performLivenessCheck: {
        success: true,
        result: {
          isLive: true,
          confidence: 0.98,
          selfieUrl: 'https://storage.example.com/selfie-e2e.jpg'
        }
      },
      completeSession: {
        success: true,
        message: 'KYC session completed successfully'
      }
    })
    
    // Start camera and complete liveness check
    await page.getByRole('button', { name: 'Enable Camera' }).click()
    await page.waitForTimeout(2000) // Wait for mock face detection
    
    // Take photo
    await page.getByRole('button', { name: 'Capture' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Step 5: Completion
    await expect(page).toHaveURL('/onboarding/complete')
    await expect(page.getByText('Welcome to ClearHold!')).toBeVisible()
    
    // Navigate to dashboard
    await page.getByRole('button', { name: 'Go to Dashboard' }).click()
    await expect(page).toHaveURL('/dashboard')
    
    // KYC banner should no longer be visible
    await expect(page.locator('[data-testid="kyc-notification-banner"]')).not.toBeVisible()
  })

  test('should handle KYC session errors gracefully', async ({ page }) => {
    // Mock session start failure
    await mockKYCBackendResponses(page, {
      startSession: {
        success: false,
        error: 'Session creation failed'
      }
    })
    
    // Try to start KYC
    await page.getByRole('button', { name: 'Verify Identity' }).click()
    await page.getByLabel(/I consent to the collection/).check()
    await page.getByRole('button', { name: 'Begin Verification' }).click()
    
    // Should see error message
    await expect(page.getByText(/Failed to start verification session/)).toBeVisible()
  })

  test('should handle document upload errors', async ({ page }) => {
    // Navigate through to document upload
    await page.getByRole('button', { name: 'Verify Identity' }).click()
    await page.getByLabel(/I consent to the collection/).check()
    await page.getByRole('button', { name: 'Begin Verification' }).click()
    
    // Fill basic info and continue
    await page.getByLabel('First Name *').fill('John')
    // ... (fill other required fields)
    await page.getByRole('button', { name: 'Continue' }).click()
    
    // Mock upload failure
    await mockKYCBackendResponses(page, {
      uploadDocument: {
        success: false,
        error: 'Document verification failed'
      }
    })
    
    // Try to upload document
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'passport.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-passport-image')
    })
    
    // Should see error message
    await expect(page.getByText(/Failed to upload documents/)).toBeVisible()
  })

  test('should show appropriate status for under review KYC', async ({ page }) => {
    // Mock under review status
    await mockKYCBackendResponses(page, {
      getStatus: {
        success: true,
        status: {
          level: 'basic',
          status: 'pending',
          lastUpdated: new Date().toISOString(),
          completedSteps: ['personal_info', 'document_upload', 'liveness_check']
        }
      }
    })
    
    await page.reload()
    
    // Should see under review message in banner
    await expect(page.getByText(/Your identity verification is under review/)).toBeVisible()
    
    // Should not see verify button
    await expect(page.getByRole('button', { name: 'Verify Identity' })).not.toBeVisible()
  })

  test('should allow transaction creation with approved KYC', async ({ page }) => {
    // Mock approved KYC status
    await mockKYCBackendResponses(page, {
      getStatus: {
        success: true,
        status: {
          level: 'basic',
          status: 'approved',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          completedSteps: ['personal_info', 'document_upload', 'liveness_check']
        }
      }
    })
    
    // Set user as KYC verified
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('clearhold_user') || '{}')
      user.kycLevel = 'basic'
      user.kycStatus = { status: 'approved' }
      user.facialVerificationStatus = 'passed'
      localStorage.setItem('clearhold_user', JSON.stringify(user))
    })
    
    await page.reload()
    
    // Should not see KYC banner
    await expect(page.locator('[data-testid="kyc-notification-banner"]')).not.toBeVisible()
    
    // Should be able to access transaction page
    await page.getByRole('link', { name: 'New Transaction' }).click()
    await expect(page).toHaveURL('/transactions/new')
    await expect(page.getByText('Transaction Details')).toBeVisible()
  })

  test('should handle expired KYC appropriately', async ({ page }) => {
    // Mock expired KYC
    await mockKYCBackendResponses(page, {
      getStatus: {
        success: true,
        status: {
          level: 'basic',
          status: 'approved',
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
          completedSteps: ['personal_info', 'document_upload', 'liveness_check']
        }
      }
    })
    
    await page.reload()
    
    // Should see re-verification required message
    await expect(page.getByText(/verification has expired/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Renew Verification' })).toBeVisible()
  })

  test('should persist KYC status across sessions', async ({ page, context }) => {
    // Complete KYC in first session
    // ... (abbreviated - would include full KYC flow)
    
    // Close and reopen browser context
    await context.close()
    const newContext = await browser.newContext()
    const newPage = await newContext.newPage()
    
    // Add auth cookie
    await newContext.addCookies([{
      name: 'clearhold_auth_token',
      value: 'e2e-test-token',
      domain: 'localhost',
      path: '/'
    }])
    
    // Navigate to dashboard
    await newPage.goto('/dashboard')
    
    // Should maintain KYC status
    await expect(newPage.locator('[data-testid="kyc-notification-banner"]')).not.toBeVisible()
  })
})

// Helper function to mock backend responses
async function mockKYCBackendResponses(page: any, responses: Record<string, any>) {
  await page.route('**/api/kyc/**', async (route: any) => {
    const url = route.request().url()
    
    if (url.includes('/session/start') && responses.startSession) {
      await route.fulfill({ json: responses.startSession })
    } else if (url.includes('/document/upload') && responses.uploadDocument) {
      await route.fulfill({ json: responses.uploadDocument })
    } else if (url.includes('/liveness/check') && responses.performLivenessCheck) {
      await route.fulfill({ json: responses.performLivenessCheck })
    } else if (url.includes('/session/complete') && responses.completeSession) {
      await route.fulfill({ json: responses.completeSession })
    } else if (url.includes('/status') && responses.getStatus) {
      await route.fulfill({ json: responses.getStatus })
    } else {
      await route.continue()
    }
  })
}