import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Complete KYC Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to KYC page
    await page.goto('/kyc')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should complete full KYC verification flow successfully', async ({ page }) => {
    // Step 1: Start KYC Process
    await test.step('Start KYC verification', async () => {
      await expect(page.getByRole('heading', { name: /identity verification/i })).toBeVisible()
      await expect(page.getByText(/complete your kyc/i)).toBeVisible()
      
      await page.getByRole('button', { name: /start verification/i }).click()
      
      // Should navigate to personal info step
      await expect(page.getByRole('heading', { name: /personal information/i })).toBeVisible()
    })

    // Step 2: Fill Personal Information
    await test.step('Complete personal information', async () => {
      // Fill in personal details
      await page.getByLabel('First Name').fill('John')
      await page.getByLabel('Middle Name').fill('Michael')
      await page.getByLabel('Last Name').fill('Doe')
      await page.getByLabel('Date of Birth').fill('1990-01-15')
      
      // Select nationality
      await page.getByLabel('Nationality').selectOption('US')
      await page.getByLabel('Country of Residence').selectOption('US')
      
      // Fill contact information
      await page.getByLabel('Email').fill('john.doe@example.com')
      await page.getByLabel('Phone Number').fill('+1 (555) 123-4567')
      
      // Fill address
      await page.getByLabel('Street Address').fill('123 Main Street')
      await page.getByLabel('City').fill('New York')
      await page.getByLabel('State/Province').fill('NY')
      await page.getByLabel('Postal Code').fill('10001')
      await page.getByLabel('Country').selectOption('US')
      
      // Fill employment information
      await page.getByLabel('Occupation').fill('Software Engineer')
      await page.getByLabel('Employer').fill('Tech Corp')
      
      // Continue to next step
      await page.getByRole('button', { name: /continue/i }).click()
      
      // Verify navigation to documents step
      await expect(page.getByRole('heading', { name: /document upload/i })).toBeVisible()
    })

    // Step 3: Upload Documents
    await test.step('Upload identity documents', async () => {
      // Select document type
      await page.getByLabel('Passport').check()
      
      // Upload passport front
      const passportFront = path.join(__dirname, 'fixtures', 'passport-front.jpg')
      await page.getByLabel('Document Front').setInputFiles(passportFront)
      
      // Wait for upload preview
      await expect(page.getByText('passport-front.jpg')).toBeVisible()
      
      // Upload selfie
      const selfiePhoto = path.join(__dirname, 'fixtures', 'selfie.jpg')
      await page.getByLabel('Selfie Photo').setInputFiles(selfiePhoto)
      
      // Fill document details
      await page.getByLabel('Document Number').fill('P12345678')
      await page.getByLabel('Expiry Date').fill('2025-12-31')
      
      // Upload address proof
      await page.getByLabel('Utility Bill').check()
      const utilityBill = path.join(__dirname, 'fixtures', 'utility-bill.pdf')
      await page.getByLabel('Address Proof Document').setInputFiles(utilityBill)
      
      // Continue to next step
      await page.getByRole('button', { name: /continue/i }).click()
      
      // Wait for OCR processing
      await page.waitForTimeout(2000)
      
      // Verify navigation to risk assessment
      await expect(page.getByRole('heading', { name: /risk assessment/i })).toBeVisible()
    })

    // Step 4: Complete Risk Assessment
    await test.step('Complete risk assessment questionnaire', async () => {
      // Source of funds
      await page.getByLabel('Employment Income').check()
      await page.getByLabel('Investments').check()
      
      // Expected transaction volume
      await page.getByLabel('Expected Monthly Volume').selectOption('5000-10000')
      
      // Purpose of use
      await page.getByLabel('Real Estate Transactions').check()
      await page.getByLabel('Investment').check()
      
      // PEP status
      await page.getByLabel('No, I am not a politically exposed person').check()
      
      // Sanctions
      await page.getByLabel('No, I have no sanctions').check()
      
      // Tax residency
      await page.getByLabel('Tax Residency Country').selectOption('US')
      await page.getByLabel('No tax obligations elsewhere').check()
      
      // US Person status
      await page.getByLabel('Yes, I am a US person').check()
      
      // Accept terms
      await page.getByLabel('I accept the terms and conditions').check()
      await page.getByLabel('I consent to screening').check()
      
      // Digital signature
      const canvas = page.locator('canvas#signature-pad')
      const box = await canvas.boundingBox()
      
      if (box) {
        // Draw signature
        await page.mouse.move(box.x + 50, box.y + 50)
        await page.mouse.down()
        await page.mouse.move(box.x + 150, box.y + 50)
        await page.mouse.move(box.x + 100, box.y + 100)
        await page.mouse.up()
      }
      
      // Continue to review
      await page.getByRole('button', { name: /continue to review/i }).click()
      
      // Verify navigation to review page
      await expect(page.getByRole('heading', { name: /review.*submission/i })).toBeVisible()
    })

    // Step 5: Review and Submit
    await test.step('Review and submit KYC application', async () => {
      // Verify all sections are displayed
      await expect(page.getByText(/personal information/i)).toBeVisible()
      await expect(page.getByText('John Michael Doe')).toBeVisible()
      await expect(page.getByText('john.doe@example.com')).toBeVisible()
      
      await expect(page.getByText(/documents/i)).toBeVisible()
      await expect(page.getByText('Passport')).toBeVisible()
      await expect(page.getByText('P12345678')).toBeVisible()
      
      await expect(page.getByText(/risk assessment/i)).toBeVisible()
      await expect(page.getByText('Employment Income, Investments')).toBeVisible()
      
      // Expand sections to verify details
      await page.getByRole('button', { name: /expand personal/i }).click()
      await expect(page.getByText('123 Main Street')).toBeVisible()
      
      // Submit application
      await page.getByRole('button', { name: /submit.*verification/i }).click()
      
      // Confirm submission in dialog
      await page.getByRole('button', { name: /confirm submission/i }).click()
      
      // Wait for processing
      await page.waitForTimeout(3000)
      
      // Verify success page
      await expect(page.getByRole('heading', { name: /verification.*submitted/i })).toBeVisible()
      await expect(page.getByText(/under review/i)).toBeVisible()
      await expect(page.getByText(/verification id/i)).toBeVisible()
    })

    // Step 6: Check Status
    await test.step('Navigate to status page', async () => {
      await page.getByRole('button', { name: /check status/i }).click()
      
      // Verify status page
      await expect(page.getByRole('heading', { name: /kyc status/i })).toBeVisible()
      await expect(page.getByText(/under review/i)).toBeVisible()
      
      // Should show progress indicator
      const progressBar = page.locator('[role="progressbar"]')
      await expect(progressBar).toBeVisible()
      
      // Should show estimated time
      await expect(page.getByText(/estimated time/i)).toBeVisible()
    })
  })

  test('should save progress and allow resuming', async ({ page, context }) => {
    // Start KYC flow
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill partial information
    await page.getByLabel('First Name').fill('Jane')
    await page.getByLabel('Last Name').fill('Smith')
    await page.getByLabel('Email').fill('jane.smith@example.com')
    
    // Create new page (simulate closing and reopening)
    const newPage = await context.newPage()
    await newPage.goto('/kyc')
    
    // Should show resume option
    await expect(newPage.getByText(/resume verification/i)).toBeVisible()
    await newPage.getByRole('button', { name: /resume/i }).click()
    
    // Should restore filled data
    await expect(newPage.getByLabel('First Name')).toHaveValue('Jane')
    await expect(newPage.getByLabel('Last Name')).toHaveValue('Smith')
    await expect(newPage.getByLabel('Email')).toHaveValue('jane.smith@example.com')
    
    await newPage.close()
  })

  test('should validate data before proceeding to next step', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Try to continue without filling required fields
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/first name is required/i)).toBeVisible()
    await expect(page.getByText(/last name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    
    // Fill invalid email
    await page.getByLabel('Email').fill('invalid-email')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show email validation error
    await expect(page.getByText(/valid email address/i)).toBeVisible()
    
    // Fill invalid phone number
    await page.getByLabel('Phone Number').fill('123')
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should show phone validation error
    await expect(page.getByText(/valid phone number/i)).toBeVisible()
  })

  test('should handle document upload errors gracefully', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill minimum required fields to proceed
    await page.getByLabel('First Name').fill('Test')
    await page.getByLabel('Last Name').fill('User')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    
    // Continue to documents
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Try to upload invalid file type
    const invalidFile = path.join(__dirname, 'fixtures', 'test.txt')
    await page.getByLabel('Document Front').setInputFiles(invalidFile)
    
    // Should show error
    await expect(page.getByText(/supported file types/i)).toBeVisible()
    
    // Try to upload oversized file
    // This would require a large file fixture
    // await page.getByLabel('Document Front').setInputFiles(largeFile)
    // await expect(page.getByText(/file size limit/i)).toBeVisible()
  })

  test('should work on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only test')
    
    // Should show mobile-optimized layout
    await expect(page.getByRole('heading', { name: /identity verification/i })).toBeVisible()
    
    // Start verification
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Mobile form should be scrollable
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Fill form on mobile
    await page.getByLabel('First Name').fill('Mobile')
    await page.getByLabel('Last Name').fill('User')
    
    // Test touch interactions for file upload
    await page.getByRole('button', { name: /continue/i }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Verify mobile camera access prompt for selfie
    // This would show native mobile file picker
  })

  test('should handle session timeout', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Fill some data
    await page.getByLabel('First Name').fill('Session')
    await page.getByLabel('Last Name').fill('Test')
    
    // Simulate session timeout by clearing storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Try to continue
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Should redirect to login or show session expired message
    await expect(page.getByText(/session expired/i)).toBeVisible()
  })

  test('should track progress with visual indicators', async ({ page }) => {
    await page.getByRole('button', { name: /start verification/i }).click()
    
    // Check progress indicators
    const progressSteps = page.locator('.progress-step')
    await expect(progressSteps).toHaveCount(4) // Personal, Documents, Risk, Review
    
    // First step should be active
    await expect(progressSteps.nth(0)).toHaveClass(/active/)
    
    // Complete first step
    await page.getByLabel('First Name').fill('Progress')
    await page.getByLabel('Last Name').fill('Test')
    await page.getByLabel('Date of Birth').fill('1990-01-01')
    await page.getByLabel('Email').fill('progress@test.com')
    await page.getByLabel('Phone Number').fill('+1234567890')
    
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Second step should now be active
    await expect(progressSteps.nth(1)).toHaveClass(/active/)
    await expect(progressSteps.nth(0)).toHaveClass(/completed/)
  })
})

// Test fixtures would need to be created:
// - fixtures/passport-front.jpg
// - fixtures/selfie.jpg
// - fixtures/utility-bill.pdf
// - fixtures/test.txt (for invalid file test)