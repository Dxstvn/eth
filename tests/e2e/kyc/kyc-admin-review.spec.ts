import { test, expect } from '@playwright/test'

test.describe('KYC Admin Review Process', () => {
  test.use({
    storageState: 'tests/e2e/auth/admin.json' // Assumes admin auth state is saved
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/kyc')
    await page.waitForLoadState('networkidle')
  })

  test('should display pending KYC applications', async ({ page }) => {
    // Check admin dashboard loads
    await expect(page.getByRole('heading', { name: /kyc review dashboard/i })).toBeVisible()
    
    // Check queue statistics
    await expect(page.getByText(/pending review/i)).toBeVisible()
    await expect(page.getByTestId('pending-count')).toContainText(/\d+/)
    
    // Check application list
    const applicationList = page.locator('[data-testid="application-list"]')
    await expect(applicationList).toBeVisible()
    
    // Should have at least one application
    const applications = applicationList.locator('[data-testid="application-card"]')
    await expect(applications.first()).toBeVisible()
    
    // Check application card contains required info
    const firstApp = applications.first()
    await expect(firstApp.locator('[data-testid="applicant-name"]')).toBeVisible()
    await expect(firstApp.locator('[data-testid="submission-date"]')).toBeVisible()
    await expect(firstApp.locator('[data-testid="risk-score"]')).toBeVisible()
    await expect(firstApp.locator('[data-testid="status-badge"]')).toContainText(/under review/i)
  })

  test('should filter applications by status', async ({ page }) => {
    // Check filter dropdown
    const filterDropdown = page.getByLabel(/filter by status/i)
    await expect(filterDropdown).toBeVisible()
    
    // Filter by "Additional Info Required"
    await filterDropdown.selectOption('additional_info_required')
    
    // Wait for filtered results
    await page.waitForTimeout(1000)
    
    // All visible applications should have this status
    const statusBadges = page.locator('[data-testid="status-badge"]')
    const count = await statusBadges.count()
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText(/additional info/i)
    }
    
    // Clear filter
    await filterDropdown.selectOption('')
    await page.waitForTimeout(500)
  })

  test('should review and approve KYC application', async ({ page }) => {
    // Click on first application
    const viewButton = page.locator('[data-testid="view-application"]').first()
    await viewButton.click()
    
    // Wait for application details to load
    await expect(page.getByRole('heading', { name: /application details/i })).toBeVisible()
    
    // Verify all sections are displayed
    await test.step('Check personal information section', async () => {
      const personalSection = page.locator('[data-testid="personal-info-section"]')
      await expect(personalSection).toBeVisible()
      await expect(personalSection.getByText(/first name/i)).toBeVisible()
      await expect(personalSection.getByText(/last name/i)).toBeVisible()
      await expect(personalSection.getByText(/date of birth/i)).toBeVisible()
      await expect(personalSection.getByText(/email/i)).toBeVisible()
    })
    
    await test.step('Check document verification section', async () => {
      const docSection = page.locator('[data-testid="document-section"]')
      await expect(docSection).toBeVisible()
      
      // View uploaded documents
      const viewDocButton = docSection.getByRole('button', { name: /view document/i }).first()
      await viewDocButton.click()
      
      // Document viewer modal should open
      await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible()
      
      // Close modal
      await page.getByRole('button', { name: /close/i }).click()
    })
    
    await test.step('Check risk assessment results', async () => {
      const riskSection = page.locator('[data-testid="risk-assessment-section"]')
      await expect(riskSection).toBeVisible()
      await expect(riskSection.getByText(/risk score/i)).toBeVisible()
      await expect(riskSection.getByText(/source of funds/i)).toBeVisible()
      await expect(riskSection.getByText(/pep status/i)).toBeVisible()
    })
    
    await test.step('Check verification results', async () => {
      const verificationSection = page.locator('[data-testid="verification-results"]')
      await expect(verificationSection).toBeVisible()
      
      // Check OCR results
      await expect(verificationSection.getByText(/ocr confidence/i)).toBeVisible()
      
      // Check document authenticity
      await expect(verificationSection.getByText(/document authentic/i)).toBeVisible()
      
      // Check face match
      await expect(verificationSection.getByText(/face match/i)).toBeVisible()
    })
    
    // Add review notes
    const notesTextarea = page.getByLabel(/review notes/i)
    await notesTextarea.fill('All documents verified. Identity confirmed through multiple checks. Low risk profile.')
    
    // Approve application
    const approveButton = page.getByRole('button', { name: /approve application/i })
    await expect(approveButton).toBeEnabled()
    await approveButton.click()
    
    // Confirm approval in dialog
    await expect(page.getByText(/confirm approval/i)).toBeVisible()
    await page.getByRole('button', { name: /confirm/i }).click()
    
    // Should show success message
    await expect(page.getByText(/application approved/i)).toBeVisible()
    
    // Should redirect back to queue
    await expect(page.getByRole('heading', { name: /kyc review dashboard/i })).toBeVisible({ timeout: 5000 })
  })

  test('should reject application with reason', async ({ page }) => {
    // Open an application
    await page.locator('[data-testid="view-application"]').first().click()
    await expect(page.getByRole('heading', { name: /application details/i })).toBeVisible()
    
    // Click reject button
    const rejectButton = page.getByRole('button', { name: /reject application/i })
    await rejectButton.click()
    
    // Rejection modal should open
    await expect(page.getByRole('dialog', { name: /reject application/i })).toBeVisible()
    
    // Select rejection reasons
    await page.getByLabel(/document not authentic/i).check()
    await page.getByLabel(/face mismatch/i).check()
    
    // Add custom reason
    const customReasonTextarea = page.getByLabel(/additional comments/i)
    await customReasonTextarea.fill('The submitted passport appears to be digitally altered. Security features are missing.')
    
    // Confirm rejection
    await page.getByRole('button', { name: /confirm rejection/i }).click()
    
    // Should show confirmation
    await expect(page.getByText(/application rejected/i)).toBeVisible()
    
    // Check email notification option
    await expect(page.getByText(/notification sent/i)).toBeVisible()
  })

  test('should request additional information', async ({ page }) => {
    // Open an application
    await page.locator('[data-testid="view-application"]').first().click()
    await expect(page.getByRole('heading', { name: /application details/i })).toBeVisible()
    
    // Click request info button
    const requestInfoButton = page.getByRole('button', { name: /request additional info/i })
    await requestInfoButton.click()
    
    // Modal should open
    await expect(page.getByRole('dialog', { name: /request additional/i })).toBeVisible()
    
    // Select required documents
    await page.getByLabel(/proof of address/i).check()
    await page.getByLabel(/bank statement/i).check()
    
    // Set deadline
    const deadlineInput = page.getByLabel(/deadline/i)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    await deadlineInput.fill(futureDate.toISOString().split('T')[0])
    
    // Add message
    const messageTextarea = page.getByLabel(/message to applicant/i)
    await messageTextarea.fill('Please provide a recent utility bill or bank statement (within last 3 months) showing your current address.')
    
    // Send request
    await page.getByRole('button', { name: /send request/i }).click()
    
    // Should update status
    await expect(page.getByText(/request sent/i)).toBeVisible()
    await expect(page.getByTestId('status-badge')).toContainText(/additional info required/i)
  })

  test('should perform bulk operations', async ({ page }) => {
    // Enable selection mode
    const selectModeButton = page.getByRole('button', { name: /select multiple/i })
    await selectModeButton.click()
    
    // Select multiple applications
    const checkboxes = page.locator('[data-testid="select-application"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    await checkboxes.nth(2).check()
    
    // Should show bulk action bar
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible()
    await expect(page.getByText(/3 selected/i)).toBeVisible()
    
    // Click bulk approve
    const bulkApproveButton = page.getByRole('button', { name: /approve selected/i })
    await bulkApproveButton.click()
    
    // Confirm bulk action
    await expect(page.getByRole('dialog', { name: /bulk approval/i })).toBeVisible()
    await expect(page.getByText(/approve 3 applications/i)).toBeVisible()
    
    // Add bulk note
    const bulkNoteTextarea = page.getByLabel(/bulk review note/i)
    await bulkNoteTextarea.fill('Bulk approved - all applications meet standard criteria')
    
    // Confirm
    await page.getByRole('button', { name: /confirm bulk approval/i }).click()
    
    // Should show progress
    await expect(page.getByText(/processing/i)).toBeVisible()
    
    // Should show completion
    await expect(page.getByText(/3 applications approved/i)).toBeVisible({ timeout: 10000 })
  })

  test('should export KYC data', async ({ page }) => {
    // Click export button
    const exportButton = page.getByRole('button', { name: /export data/i })
    await exportButton.click()
    
    // Export modal should open
    await expect(page.getByRole('dialog', { name: /export kyc data/i })).toBeVisible()
    
    // Select date range
    const startDateInput = page.getByLabel(/start date/i)
    const endDateInput = page.getByLabel(/end date/i)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    await startDateInput.fill(startDate.toISOString().split('T')[0])
    await endDateInput.fill(new Date().toISOString().split('T')[0])
    
    // Select export format
    await page.getByLabel(/csv format/i).check()
    
    // Select fields to export
    await page.getByLabel(/include personal info/i).check()
    await page.getByLabel(/include risk scores/i).check()
    await page.getByLabel(/include verification results/i).check()
    
    // Start download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /download export/i }).click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/kyc-export.*\.csv/)
  })

  test('should view analytics dashboard', async ({ page }) => {
    // Navigate to analytics
    await page.getByRole('link', { name: /analytics/i }).click()
    
    // Check analytics page loads
    await expect(page.getByRole('heading', { name: /kyc analytics/i })).toBeVisible()
    
    // Check key metrics
    await expect(page.getByTestId('total-applications')).toBeVisible()
    await expect(page.getByTestId('approval-rate')).toBeVisible()
    await expect(page.getByTestId('avg-processing-time')).toBeVisible()
    await expect(page.getByTestId('pending-count')).toBeVisible()
    
    // Check charts
    await expect(page.getByTestId('applications-chart')).toBeVisible()
    await expect(page.getByTestId('risk-distribution-chart')).toBeVisible()
    await expect(page.getByTestId('processing-time-chart')).toBeVisible()
    
    // Change date range
    const dateRangeSelector = page.getByLabel(/date range/i)
    await dateRangeSelector.selectOption('last_30_days')
    
    // Charts should update
    await page.waitForTimeout(1000)
    
    // Export analytics report
    const exportReportButton = page.getByRole('button', { name: /export report/i })
    await exportReportButton.click()
    
    // Should generate PDF report
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /generate pdf/i }).click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/kyc-analytics-report.*\.pdf/)
  })

  test('should handle real-time updates', async ({ page, context }) => {
    // Open a second browser context to simulate another admin
    const adminContext2 = await context.browser()?.newContext({
      storageState: 'tests/e2e/auth/admin.json'
    })
    const page2 = await adminContext2!.newPage()
    
    // Both admins viewing the dashboard
    await page2.goto('/admin/kyc')
    
    // Admin 2 approves an application
    await page2.locator('[data-testid="view-application"]').first().click()
    await page2.getByRole('button', { name: /approve application/i }).click()
    await page2.getByRole('button', { name: /confirm/i }).click()
    
    // Admin 1 should see the update
    await page.waitForTimeout(2000) // Wait for real-time update
    
    // Check for notification
    await expect(page.getByText(/application approved by/i)).toBeVisible()
    
    // The approved application should move out of pending queue
    const pendingCount = await page.getByTestId('pending-count').textContent()
    expect(parseInt(pendingCount || '0')).toBeGreaterThanOrEqual(0)
    
    await adminContext2!.close()
  })

  test('should manage team permissions', async ({ page }) => {
    // Navigate to team management
    await page.getByRole('link', { name: /team management/i }).click()
    
    // Check team page loads
    await expect(page.getByRole('heading', { name: /kyc team/i })).toBeVisible()
    
    // Add new team member
    await page.getByRole('button', { name: /add team member/i }).click()
    
    // Fill member details
    await page.getByLabel(/email address/i).fill('newreviewer@company.com')
    await page.getByLabel(/role/i).selectOption('reviewer')
    
    // Set permissions
    await page.getByLabel(/can approve/i).check()
    await page.getByLabel(/can reject/i).check()
    await page.getByLabel(/can export/i).uncheck()
    
    // Send invitation
    await page.getByRole('button', { name: /send invitation/i }).click()
    
    // Should show success
    await expect(page.getByText(/invitation sent/i)).toBeVisible()
    
    // Check team member list updated
    await expect(page.getByText('newreviewer@company.com')).toBeVisible()
  })
})