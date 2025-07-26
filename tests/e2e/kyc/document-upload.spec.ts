import { test, expect, Page } from '@playwright/test'
import path from 'path'

// Test data
const testFiles = {
  validJpeg: {
    name: 'passport.jpg',
    type: 'image/jpeg',
    content: Buffer.from('fake-jpeg-content')
  },
  validPng: {
    name: 'license.png', 
    type: 'image/png',
    content: Buffer.from('fake-png-content')
  },
  validPdf: {
    name: 'utility-bill.pdf',
    type: 'application/pdf',
    content: Buffer.from('fake-pdf-content')
  },
  invalidFile: {
    name: 'document.txt',
    type: 'text/plain',
    content: Buffer.from('invalid-file-type')
  },
  largeFile: {
    name: 'large.jpg',
    type: 'image/jpeg',
    content: Buffer.alloc(11 * 1024 * 1024) // 11MB
  }
}

test.describe('KYC Document Upload E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('clearhold_auth_token', 'mock-auth-token')
      localStorage.setItem('clearhold_user', JSON.stringify({
        uid: 'test-user-123',
        email: 'test@example.com'
      }))
    })

    // Navigate to KYC documents page
    await page.goto('/kyc/documents')
  })

  test.describe('Complete document upload workflow', () => {
    test('uploads identity and address documents successfully', async ({ page }) => {
      // Step 1: Identity Document Upload
      await expect(page.getByText('Identity Verification')).toBeVisible()
      await expect(page.getByText('Step 1 of 3')).toBeVisible()

      // Select passport tab
      await page.getByRole('tab', { name: /passport/i }).click()

      // Upload passport front
      const passportInput = page.locator('input[type="file"]').first()
      await passportInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      // Wait for upload and preview
      await expect(page.getByText('Pending Verification')).toBeVisible()
      await expect(page.getByText(testFiles.validJpeg.name)).toBeVisible()

      // Continue to address proof
      await page.getByRole('button', { name: /continue/i }).click()

      // Wait for validation
      await expect(page.getByText('Validating...')).toBeVisible()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Step 2: Address Proof Upload
      await expect(page.getByText('Proof of Address')).toBeVisible()
      await expect(page.getByText('Step 2 of 3')).toBeVisible()

      // Select utility bill
      await page.getByLabel('Utility Bill').click()

      // Check date warning
      await expect(page.getByText(/must be dated within the last 3 months/)).toBeVisible()

      // Upload utility bill
      const utilityInput = page.locator('input[type="file"]').first()
      await utilityInput.setInputFiles({
        name: testFiles.validPdf.name,
        mimeType: testFiles.validPdf.type,
        buffer: testFiles.validPdf.content
      })

      await expect(page.getByText(testFiles.validPdf.name)).toBeVisible()

      // Continue to review
      await page.getByRole('button', { name: /continue/i }).click()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Step 3: Review and Submit
      await expect(page.getByText('Review Your Documents')).toBeVisible()
      await expect(page.getByText('Step 3 of 3')).toBeVisible()

      // Check document summary
      await expect(page.getByText('2').near(page.getByText('Total Documents'))).toBeVisible()
      await expect(page.getByText('2').near(page.getByText('Verified'))).toBeVisible()

      // Submit documents
      await page.getByRole('button', { name: /submit documents/i }).click()
      await expect(page.getByText('Submitting...')).toBeVisible()

      // Should redirect to verification page
      await expect(page).toHaveURL('/kyc/verification', { timeout: 5000 })
    })
  })

  test.describe('File upload interactions', () => {
    test('drag and drop file upload', async ({ page }) => {
      // Create a data transfer for drag and drop
      await page.locator('[data-testid="secure-upload-Passport (Front)"]').evaluate((element) => {
        const dataTransfer = new DataTransfer()
        const file = new File(['test'], 'passport.jpg', { type: 'image/jpeg' })
        dataTransfer.items.add(file)

        const dragEnterEvent = new DragEvent('dragenter', {
          dataTransfer,
          bubbles: true
        })
        element.dispatchEvent(dragEnterEvent)

        const dropEvent = new DragEvent('drop', {
          dataTransfer,
          bubbles: true
        })
        element.dispatchEvent(dropEvent)
      })

      // Verify file was uploaded
      await expect(page.getByText('passport.jpg')).toBeVisible()
    })

    test('removes uploaded file', async ({ page }) => {
      // Upload a file
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      await expect(page.getByText(testFiles.validJpeg.name)).toBeVisible()

      // Remove the file
      await page.getByRole('button', { name: /remove/i }).click()

      // Verify file was removed
      await expect(page.getByText(testFiles.validJpeg.name)).not.toBeVisible()
    })

    test('previews image files', async ({ page }) => {
      // Upload an image file
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      // Check for image preview
      await expect(page.locator('img[alt="preview"]')).toBeVisible()
    })
  })

  test.describe('Error scenarios', () => {
    test('rejects invalid file types', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first()
      
      // Try to upload invalid file type
      await fileInput.setInputFiles({
        name: testFiles.invalidFile.name,
        mimeType: testFiles.invalidFile.type,
        buffer: testFiles.invalidFile.content
      })

      // Should show error message
      await expect(page.getByText(/please upload jpeg, png, or pdf files only/i)).toBeVisible()
    })

    test('rejects files over 10MB', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first()
      
      // Try to upload large file
      await fileInput.setInputFiles({
        name: testFiles.largeFile.name,
        mimeType: testFiles.largeFile.type,
        buffer: testFiles.largeFile.content
      })

      // Should show error message
      await expect(page.getByText(/file size must be less than 10mb/i)).toBeVisible()
    })

    test('handles network failures gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())

      // Upload a file
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      // Try to continue
      await page.getByRole('button', { name: /continue/i }).click()

      // Should show error message
      await expect(page.getByText(/validation failed|error/i)).toBeVisible()
    })

    test('validates required documents', async ({ page }) => {
      // Try to continue without uploading
      await page.getByRole('button', { name: /continue/i }).click()

      // Should show validation error
      await expect(page.getByText(/please upload at least one valid identification document/i)).toBeVisible()
    })
  })

  test.describe('Responsive behavior', () => {
    test('works on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Check that tabs are still functional
      await expect(page.getByRole('tab', { name: /passport/i })).toBeVisible()
      
      // Upload should still work
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      await expect(page.getByText(testFiles.validJpeg.name)).toBeVisible()
    })

    test('works on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      // Check layout adapts properly
      await expect(page.getByText('Identity Verification')).toBeVisible()
      
      // Grid should show properly
      const radioGroup = page.getByRole('radiogroup')
      await expect(radioGroup).toBeVisible()
    })

    test('works on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })

      // All features should be visible
      await expect(page.getByText('Identity Verification')).toBeVisible()
      await expect(page.getByText('Bank-Level Security')).toBeVisible()
    })
  })

  test.describe('Security features', () => {
    test('shows security indicators throughout process', async ({ page }) => {
      // Check security badges
      await expect(page.getByText('256-bit Encryption')).toBeVisible()
      await expect(page.getByText('Bank-Level Security')).toBeVisible()

      // Upload a file
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      // Security indicators should remain visible
      await expect(page.getByText('256-bit Encryption')).toBeVisible()
    })

    test('shows watermark notice', async ({ page }) => {
      await expect(page.getByText(/watermarked and securely deleted/i)).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('navigates between steps correctly', async ({ page }) => {
      // Upload identity document
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      await page.getByRole('button', { name: /continue/i }).click()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Should be on step 2
      await expect(page.getByText('Step 2 of 3')).toBeVisible()

      // Go back
      await page.getByRole('button', { name: /back/i }).click()

      // Should be back on step 1
      await expect(page.getByText('Step 1 of 3')).toBeVisible()
      
      // File should still be uploaded
      await expect(page.getByText(testFiles.validJpeg.name)).toBeVisible()
    })

    test('progress bar updates correctly', async ({ page }) => {
      // Check initial progress (33%)
      const progressBar = page.getByRole('progressbar')
      await expect(progressBar).toHaveAttribute('aria-valuenow', '33.333333333333336')

      // Complete step 1
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      await page.getByRole('button', { name: /continue/i }).click()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Progress should be 66%
      await expect(progressBar).toHaveAttribute('aria-valuenow', '66.66666666666667')

      // Complete step 2
      const utilityInput = page.locator('input[type="file"]').first()
      await utilityInput.setInputFiles({
        name: testFiles.validPdf.name,
        mimeType: testFiles.validPdf.type,
        buffer: testFiles.validPdf.content
      })

      await page.getByRole('button', { name: /continue/i }).click()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Progress should be 100%
      await expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  test.describe('Document type switching', () => {
    test('switches between passport, drivers license, and ID card', async ({ page }) => {
      // Check passport is selected by default
      await expect(page.getByText('Tips for Passport:')).toBeVisible()

      // Switch to driver's license
      await page.getByRole('tab', { name: /driver's license/i }).click()
      await expect(page.getByText('Tips for Driver\'s License:')).toBeVisible()
      await expect(page.getByText("Driver's License (Front)")).toBeVisible()
      await expect(page.getByText("Driver's License (Back)")).toBeVisible()

      // Switch to ID card
      await page.getByRole('tab', { name: /national id card/i }).click()
      await expect(page.getByText('Tips for National ID Card:')).toBeVisible()
    })
  })

  test.describe('Address proof types', () => {
    test('shows different requirements for each address proof type', async ({ page }) => {
      // Navigate to address proof step
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles({
        name: testFiles.validJpeg.name,
        mimeType: testFiles.validJpeg.type,
        buffer: testFiles.validJpeg.content
      })

      await page.getByRole('button', { name: /continue/i }).click()
      await expect(page.getByText('Verified')).toBeVisible({ timeout: 5000 })

      // Check utility bill requirements
      await page.getByLabel('Utility Bill').click()
      await expect(page.getByText(/must be issued within the last 3 months/i)).toBeVisible()

      // Check bank statement requirements
      await page.getByLabel('Bank Statement').click()
      await expect(page.getByText(/bank letterhead must be visible/i)).toBeVisible()

      // Check lease agreement requirements
      await page.getByLabel('Lease Agreement').click()
      await expect(page.getByText(/must be currently valid/i)).toBeVisible()
      // Should not show 3-month requirement
      await expect(page.getByText(/must be dated within the last 3 months/i)).not.toBeVisible()

      // Check government letter requirements
      await page.getByLabel('Government Letter').click()
      await expect(page.getByText(/must be dated within the last 12 months/i)).toBeVisible()
    })
  })
})