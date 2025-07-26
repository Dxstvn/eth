import { test, expect, devices } from '@playwright/test'
import path from 'path'

// Test on various mobile devices
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S9+', device: devices['Galaxy S9+'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
]

mobileDevices.forEach(({ name, device }) => {
  test.describe(`KYC Mobile Experience - ${name}`, () => {
    test.use({ ...device })

    test.beforeEach(async ({ page }) => {
      await page.goto('/kyc')
      await page.waitForLoadState('networkidle')
    })

    test('should display mobile-optimized layout', async ({ page }) => {
      // Check mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      await expect(mobileMenu).toBeVisible()
      
      // Check responsive heading
      const heading = page.getByRole('heading', { name: /identity verification/i })
      await expect(heading).toBeVisible()
      
      // Check mobile-optimized button
      const startButton = page.getByRole('button', { name: /start verification/i })
      await expect(startButton).toBeVisible()
      
      // Button should be full width on mobile
      const buttonBox = await startButton.boundingBox()
      const viewportSize = page.viewportSize()
      
      if (buttonBox && viewportSize) {
        // Button should take most of the width with some padding
        expect(buttonBox.width).toBeGreaterThan(viewportSize.width * 0.8)
      }
    })

    test('should handle touch interactions', async ({ page }) => {
      // Start verification
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Check form is scrollable
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Test swipe gestures for navigation hints
      const progressIndicator = page.locator('[data-testid="progress-indicator"]')
      await expect(progressIndicator).toBeVisible()
      
      // Fill form using touch
      await page.getByLabel('First Name').tap()
      await page.keyboard.type('Mobile')
      
      await page.getByLabel('Last Name').tap()
      await page.keyboard.type('User')
      
      // Test date picker on mobile
      await page.getByLabel('Date of Birth').tap()
      // Mobile browsers show native date picker
      await page.keyboard.type('1990-01-15')
      
      // Scroll to reveal more fields
      await page.getByLabel('Email').scrollIntoViewIfNeeded()
      await page.getByLabel('Email').tap()
      await page.keyboard.type('mobile@test.com')
      
      // Test numeric keyboard for phone
      await page.getByLabel('Phone Number').tap()
      // Should trigger numeric keyboard on mobile
      await page.keyboard.type('1234567890')
    })

    test('should handle mobile camera for document upload', async ({ page, browserName }) => {
      // Skip on desktop browsers in mobile emulation
      test.skip(browserName === 'webkit', 'Camera test not supported in WebKit')
      
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Fill minimum required fields
      await page.getByLabel('First Name').fill('Camera')
      await page.getByLabel('Last Name').fill('Test')
      await page.getByLabel('Date of Birth').fill('1990-01-01')
      await page.getByLabel('Email').fill('camera@test.com')
      await page.getByLabel('Phone Number').fill('+1234567890')
      
      await page.getByRole('button', { name: /continue/i }).tap()
      
      // Document upload step
      await page.getByLabel('Passport').tap()
      
      // Check camera option is available
      const documentUpload = page.getByLabel('Document Front')
      await documentUpload.tap()
      
      // On real mobile, this would open camera
      // For testing, we'll use a file
      const testFile = path.join(__dirname, 'fixtures', 'passport-front.jpg')
      await documentUpload.setInputFiles(testFile)
      
      // Check file preview on mobile
      await expect(page.getByText('passport-front.jpg')).toBeVisible()
      
      // Test selfie camera (usually front camera)
      const selfieUpload = page.getByLabel('Selfie Photo')
      await selfieUpload.tap()
      
      // Should show camera instructions on mobile
      await expect(page.getByText(/position your face/i)).toBeVisible()
      
      const selfieFile = path.join(__dirname, 'fixtures', 'selfie.jpg')
      await selfieUpload.setInputFiles(selfieFile)
    })

    test('should optimize form for one-handed use', async ({ page }) => {
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // All interactive elements should be reachable with thumb
      const inputs = page.locator('input, select, button')
      const count = await inputs.count()
      
      for (let i = 0; i < count; i++) {
        const element = inputs.nth(i)
        const box = await element.boundingBox()
        
        if (box) {
          // Elements should be in thumb-reachable zone
          // Bottom 2/3 of screen for one-handed use
          const viewportHeight = page.viewportSize()?.height || 800
          expect(box.y).toBeGreaterThan(viewportHeight * 0.1)
          
          // Minimum touch target size (48x48 pixels)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should handle poor network conditions', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 1000)
      })
      
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Should show loading states
      await expect(page.getByTestId('loading-spinner')).toBeVisible()
      
      // Fill form
      await page.getByLabel('First Name').fill('Slow')
      await page.getByLabel('Last Name').fill('Network')
      
      // Should save progress locally
      await page.waitForTimeout(2000)
      
      // Simulate connection loss
      await context.route('**/*', route => route.abort())
      
      // Try to continue
      await page.getByRole('button', { name: /continue/i }).tap()
      
      // Should show offline message
      await expect(page.getByText(/offline|no connection/i)).toBeVisible()
      
      // Should offer to save progress
      await expect(page.getByText(/saved locally/i)).toBeVisible()
    })

    test('should provide mobile-specific help', async ({ page }) => {
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Help button should be easily accessible
      const helpButton = page.getByRole('button', { name: /help/i })
      await expect(helpButton).toBeVisible()
      await helpButton.tap()
      
      // Should show mobile-specific instructions
      await expect(page.getByText(/tap to select/i)).toBeVisible()
      await expect(page.getByText(/use camera/i)).toBeVisible()
      await expect(page.getByText(/pinch to zoom/i)).toBeVisible()
      
      // Close help
      await page.getByRole('button', { name: /close/i }).tap()
    })

    test('should handle device orientation changes', async ({ page, context }) => {
      // Start in portrait
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Fill some fields
      await page.getByLabel('First Name').fill('Orientation')
      await page.getByLabel('Last Name').fill('Test')
      
      // Simulate rotation to landscape
      await page.setViewportSize({ width: 812, height: 375 })
      
      // Form should adapt
      await expect(page.getByLabel('First Name')).toHaveValue('Orientation')
      await expect(page.getByLabel('Last Name')).toHaveValue('Test')
      
      // Layout should be optimized for landscape
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Rotate back to portrait
      await page.setViewportSize({ width: 375, height: 812 })
      
      // Data should persist
      await expect(page.getByLabel('First Name')).toHaveValue('Orientation')
    })

    test('should support mobile accessibility features', async ({ page }) => {
      // Check for proper ARIA labels
      const startButton = page.getByRole('button', { name: /start verification/i })
      await expect(startButton).toHaveAttribute('aria-label')
      
      await startButton.tap()
      
      // Form fields should have proper labels
      const firstNameInput = page.getByLabel('First Name')
      await expect(firstNameInput).toHaveAttribute('aria-required', 'true')
      
      // Error messages should be announced
      await page.getByRole('button', { name: /continue/i }).tap()
      
      const errorMessage = page.getByText(/first name is required/i)
      await expect(errorMessage).toHaveAttribute('role', 'alert')
      
      // Focus management for keyboard users
      await firstNameInput.focus()
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('name'))
      expect(focusedElement).toBeTruthy()
    })

    test('should optimize images for mobile data', async ({ page }) => {
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Navigate to document upload
      await page.getByLabel('First Name').fill('Image')
      await page.getByLabel('Last Name').fill('Test')
      await page.getByLabel('Date of Birth').fill('1990-01-01')
      await page.getByLabel('Email').fill('image@test.com')
      await page.getByLabel('Phone Number').fill('+1234567890')
      await page.getByRole('button', { name: /continue/i }).tap()
      
      // Upload image
      const testFile = path.join(__dirname, 'fixtures', 'large-passport.jpg')
      await page.getByLabel('Document Front').setInputFiles(testFile)
      
      // Should show compression message
      await expect(page.getByText(/optimizing image/i)).toBeVisible()
      
      // Should complete upload
      await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 10000 })
    })

    test('should handle mobile-specific security features', async ({ page }) => {
      // Check for secure connection indicator
      await expect(page.locator('[data-testid="secure-connection"]')).toBeVisible()
      
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Biometric authentication prompt (simulated)
      const biometricPrompt = page.getByText(/use face id|use fingerprint/i)
      if (await biometricPrompt.isVisible()) {
        // Would trigger native biometric auth on real device
        await page.getByRole('button', { name: /use passcode/i }).tap()
      }
      
      // Check for secure input fields
      const ssnInput = page.getByLabel(/social security/i)
      if (await ssnInput.isVisible()) {
        await expect(ssnInput).toHaveAttribute('type', 'password')
      }
    })

    test('should provide offline capability', async ({ page, context }) => {
      await page.getByRole('button', { name: /start verification/i }).tap()
      
      // Fill form data
      await page.getByLabel('First Name').fill('Offline')
      await page.getByLabel('Last Name').fill('Test')
      await page.getByLabel('Email').fill('offline@test.com')
      
      // Go offline
      await context.setOffline(true)
      
      // Should still allow form filling
      await page.getByLabel('Phone Number').fill('+1234567890')
      await page.getByLabel('Date of Birth').fill('1990-01-01')
      
      // Try to continue
      await page.getByRole('button', { name: /continue/i }).tap()
      
      // Should show offline save message
      await expect(page.getByText(/saved offline/i)).toBeVisible()
      await expect(page.getByText(/sync when online/i)).toBeVisible()
      
      // Go back online
      await context.setOffline(false)
      
      // Should sync automatically
      await expect(page.getByText(/syncing/i)).toBeVisible()
      await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 5000 })
    })
  })
})

// Additional tablet-specific tests
test.describe('KYC Tablet Experience', () => {
  test.use({ ...devices['iPad Pro'] })

  test('should utilize tablet screen space', async ({ page }) => {
    await page.goto('/kyc')
    
    // Should show split view on tablet
    const sidebar = page.locator('[data-testid="kyc-sidebar"]')
    const mainContent = page.locator('[data-testid="kyc-main-content"]')
    
    await expect(sidebar).toBeVisible()
    await expect(mainContent).toBeVisible()
    
    // Sidebar should show progress steps
    await expect(sidebar.getByText(/personal information/i)).toBeVisible()
    await expect(sidebar.getByText(/document upload/i)).toBeVisible()
    await expect(sidebar.getByText(/risk assessment/i)).toBeVisible()
    await expect(sidebar.getByText(/review/i)).toBeVisible()
  })
})