import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('KYC Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kyc')
    await page.waitForLoadState('networkidle')
  })

  test('should handle network errors during submission', async ({ page, context }) => {
    // Start KYC flow
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill all required fields
    await test.step('Fill personal information', async () => {
      await page.getByLabel('First Name').fill('Network')
      await page.getByLabel('Last Name').fill('Error')
      await page.getByLabel('Date of Birth').fill('1990-01-01')
      await page.getByLabel('Email').fill('network.error@test.com')
      await page.getByLabel('Phone Number').fill('+1234567890')
      await page.getByLabel('Street Address').fill('123 Test St')
      await page.getByLabel('City').fill('Test City')
      await page.getByLabel('State/Province').fill('TS')
      await page.getByLabel('Postal Code').fill('12345')
      await page.getByLabel('Nationality').selectOption('US')
      await page.getByLabel('Country').selectOption('US')
    })
    
    // Intercept API calls to simulate network error
    await context.route('**/api/kyc/**', route => {
      route.abort('failed')
    })
    
    // Try to continue
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show network error message
    await expect(page.getByText(/network error/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/please try again/i)).toBeVisible()
    
    // Should show retry button
    const retryButton = page.getByRole('button', { name: /retry/i })
    await expect(retryButton).toBeVisible()
    
    // Remove network block and retry
    await context.unroute('**/api/kyc/**')
    await retryButton.click()
    
    // Should proceed successfully
    await expect(page.getByRole('heading', { name: /document upload/i })).toBeVisible({ timeout: 10000 })
  })

  test('should handle server errors gracefully', async ({ page, context }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Navigate to document upload step
    await page.getByLabel('First Name').fill('Server')
    await page.getByLabel('Last Name').fill('Error')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('server.error@test.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Mock server error for document upload
    await context.route('**/api/kyc/upload', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    // Try to upload document
    const testFile = path.join(__dirname, 'fixtures', 'passport-front.jpg')
    await page.getByLabel('Passport').check()
    await page.getByLabel('Document Front').setInputFiles(testFile)
    
    // Should show server error
    await expect(page.getByText(/server error/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/unable to upload/i)).toBeVisible()
    
    // Should allow retry
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('should handle validation errors from backend', async ({ page, context }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill form with data that will trigger backend validation error
    await page.getByLabel('First Name').fill('X') // Too short
    await page.getByLabel('Last Name').fill('Y') // Too short
    await page.getByLabel('Date of Birth').fill('2010-01-01') // Too young
    await page.getByLabel('Email').fill('invalid@test')
    await page.getByLabel('Phone Number').fill('123')
    
    // Mock backend validation response
    await context.route('**/api/kyc/personal', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: {
            firstName: 'First name must be at least 2 characters',
            lastName: 'Last name must be at least 2 characters',
            dateOfBirth: 'Must be at least 18 years old',
            email: 'Invalid email format',
            phoneNumber: 'Invalid phone number format'
          }
        })
      })
    })
    
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should display all validation errors
    await expect(page.getByText(/first name must be at least 2 characters/i)).toBeVisible()
    await expect(page.getByText(/last name must be at least 2 characters/i)).toBeVisible()
    await expect(page.getByText(/must be at least 18 years old/i)).toBeVisible()
    await expect(page.getByText(/invalid email format/i)).toBeVisible()
    await expect(page.getByText(/invalid phone number format/i)).toBeVisible()
    
    // Fix errors and continue
    await page.getByLabel('First Name').fill('John')
    await page.getByLabel('Last Name').fill('Doe')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('valid@test.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    
    // Remove mock
    await context.unroute('**/api/kyc/personal')
    
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should proceed to next step
    await expect(page.getByRole('heading', { name: /document upload/i })).toBeVisible()
  })

  test('should handle OCR failures', async ({ page, context }) => {
    // Navigate to document upload step
    await page.getByRole('button', { name: /start verification/i }).click()
    await page.getByLabel('First Name').fill('OCR')
    await page.getByLabel('Last Name').fill('Test')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('ocr@test.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Mock OCR failure
    await context.route('**/api/kyc/ocr', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Could not extract text from document',
          requiresManualReview: true
        })
      })
    })
    
    // Upload document
    await page.getByLabel('Passport').check()
    const testFile = path.join(__dirname, 'fixtures', 'blurry-passport.jpg')
    await page.getByLabel('Document Front').setInputFiles(testFile)
    
    // Should show OCR failure message
    await expect(page.getByText(/could not extract/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/manual review required/i)).toBeVisible()
    
    // Should allow manual entry
    const manualEntryButton = page.getByRole('button', { name: /enter manually/i })
    await expect(manualEntryButton).toBeVisible()
    await manualEntryButton.click()
    
    // Should show manual entry form
    await expect(page.getByLabel('Document Number')).toBeVisible()
    await expect(page.getByLabel('Expiry Date')).toBeVisible()
  })

  test('should handle rate limiting', async ({ page, context }) => {
    // Mock rate limit response
    let requestCount = 0
    await context.route('**/api/kyc/**', route => {
      requestCount++
      if (requestCount > 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 60000)
          },
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        })
      } else {
        route.continue()
      }
    })
    
    // Make multiple rapid requests
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /start verification/i }).click()
      await page.waitForTimeout(100)
      await page.goBack()
    }
    
    // Should show rate limit error
    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible()
    await expect(page.getByText(/please wait/i)).toBeVisible()
    await expect(page.getByText(/60 seconds/i)).toBeVisible()
    
    // Should disable submit buttons
    const startButton = page.getByRole('button', { name: /start verification/i })
    await expect(startButton).toBeDisabled()
  })

  test('should handle document verification failures', async ({ page, context }) => {
    // Complete personal info and navigate to documents
    await page.getByRole('button', { name: /start verification/i }).click()
    await page.getByLabel('First Name').fill('Doc')
    await page.getByLabel('Last Name').fill('Verify')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('doc@test.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Upload documents
    await page.getByLabel('Passport').check()
    const passportFile = path.join(__dirname, 'fixtures', 'fake-passport.jpg')
    await page.getByLabel('Document Front').setInputFiles(passportFile)
    await page.getByLabel('Document Number').fill('FAKE123')
    await page.getByLabel('Expiry Date').fill('2025-12-31')
    
    const selfieFile = path.join(__dirname, 'fixtures', 'selfie.jpg')
    await page.getByLabel('Selfie Photo').setInputFiles(selfieFile)
    
    // Mock verification failure
    await context.route('**/api/kyc/verify', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          verificationResult: {
            documentVerification: {
              isAuthentic: false,
              confidence: 20,
              issues: ['Security features not detected', 'Font inconsistencies']
            },
            faceMatch: {
              match: false,
              confidence: 45
            }
          }
        })
      })
    })
    
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show verification failure
    await expect(page.getByText(/verification failed/i)).toBeVisible()
    await expect(page.getByText(/document.*not authentic/i)).toBeVisible()
    await expect(page.getByText(/face.*not match/i)).toBeVisible()
    
    // Should provide options
    await expect(page.getByRole('button', { name: /upload different/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /contact support/i })).toBeVisible()
  })

  test('should handle session expiry during form filling', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill partial form
    await page.getByLabel('First Name').fill('Session')
    await page.getByLabel('Last Name').fill('Expire')
    
    // Simulate session expiry
    await page.evaluate(() => {
      // Clear auth tokens
      localStorage.removeItem('clearhold_auth_token')
      sessionStorage.clear()
      
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'clearhold_auth_token',
        oldValue: 'token',
        newValue: null,
        storageArea: localStorage
      }))
    })
    
    // Try to continue
    await page.getByLabel('Email').fill('session@test.com')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show session expired modal
    await expect(page.getByText(/session expired/i)).toBeVisible()
    await expect(page.getByText(/please log in again/i)).toBeVisible()
    
    // Should have login button
    const loginButton = page.getByRole('button', { name: /log in/i })
    await expect(loginButton).toBeVisible()
  })

  test('should handle browser storage quota exceeded', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill storage to near capacity
    await page.evaluate(() => {
      const largeData = 'x'.repeat(1024 * 1024) // 1MB string
      try {
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`dummy-${i}`, largeData)
        }
      } catch (e) {
        // Storage might already be full
      }
    })
    
    // Try to save KYC data
    await page.getByLabel('First Name').fill('Storage')
    await page.getByLabel('Last Name').fill('Full')
    
    // Force save attempt
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    
    // Should show storage error
    await expect(page.getByText(/storage.*full/i)).toBeVisible()
    await expect(page.getByText(/clear.*space/i)).toBeVisible()
    
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('should handle concurrent modification conflicts', async ({ page, context }) => {
    // Start KYC in first tab
    await page.getByRole('button', { name: /start verification/i }).click()
    await page.getByLabel('First Name').fill('Tab1')
    
    // Open second tab
    const page2 = await context.newPage()
    await page2.goto('/kyc')
    await page2.getByRole('button', { name: /resume/i }).click()
    
    // Modify in second tab
    await page2.getByLabel('First Name').fill('Tab2')
    await page2.getByLabel('Last Name').fill('User')
    
    // Try to save in first tab
    await page.getByLabel('Last Name').fill('Original')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should detect conflict
    await expect(page.getByText(/data.*modified/i)).toBeVisible()
    await expect(page.getByText(/reload/i)).toBeVisible()
    
    await page2.close()
  })

  test('should handle malformed server responses', async ({ page, context }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Mock malformed response
    await context.route('**/api/kyc/personal', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      })
    })
    
    await page.getByLabel('First Name').fill('Malformed')
    await page.getByLabel('Last Name').fill('Response')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show generic error
    await expect(page.getByText(/unexpected error/i)).toBeVisible()
    await expect(page.getByText(/try again later/i)).toBeVisible()
  })
})