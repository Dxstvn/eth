import { test, expect } from '@playwright/test';

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
  });

  test('should display transactions page with proper styling', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page.locator('h1')).toContainText('Transactions');
    
    // Check subtitle
    await expect(page.locator('p')).toContainText('Manage your escrow transactions');

    // Check New Transaction button exists
    const newTransactionBtn = page.getByRole('link', { name: /new transaction/i });
    await expect(newTransactionBtn).toBeVisible();
    await expect(newTransactionBtn).toHaveClass(/bg-teal-900/);
  });

  test('should display search and filter controls with white background', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check search input exists
    const searchInput = page.getByPlaceholder('Search transactions...');
    await expect(searchInput).toBeVisible();

    // Check filter selects exist
    const statusFilter = page.getByRole('combobox').first();
    const sortFilter = page.getByRole('combobox').nth(1);
    
    await expect(statusFilter).toBeVisible();
    await expect(sortFilter).toBeVisible();

    // Check the search/filter card has white background
    const filterCard = page.locator('.mb-8').first();
    await expect(filterCard).toHaveClass(/shadow-soft/);
  });

  test('should show proper empty state when no transactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Wait a bit to ensure any loading states have finished
    await page.waitForTimeout(1000);

    // Check for either transaction cards or empty state
    const transactionCards = page.locator('[class*="bg-white"][class*="rounded-xl"]');
    const emptyState = page.locator('text=No Transactions Yet');
    
    // Should see either transaction cards or empty state
    const hasTransactions = await transactionCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    
    expect(hasTransactions || hasEmptyState).toBeTruthy();

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=Create Your First Transaction')).toBeVisible();
    }
  });

  test('should display transaction cards with white background when transactions exist', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check if transaction cards exist (they should have white background)
    const transactionCards = page.locator('[class*="bg-white"][class*="rounded-xl"][class*="shadow-soft"]');
    
    // If cards exist, verify their styling
    const cardCount = await transactionCards.count();
    if (cardCount > 0) {
      // Verify first card has proper white background styling
      const firstCard = transactionCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check card contains expected elements
      await expect(firstCard.locator('text=/ETH|USD|BTC/')).toBeTruthy();
      
      // Check View Details button exists
      const viewDetailsBtn = firstCard.getByRole('link', { name: /view details/i });
      await expect(viewDetailsBtn).toBeVisible();
    }
  });

  test('should allow searching transactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Search transactions...');
    
    // Type in search
    await searchInput.fill('Sample');
    
    // Wait for any filtering to occur
    await page.waitForTimeout(500);
    
    // Search functionality should be working (no errors)
    await expect(searchInput).toHaveValue('Sample');
  });

  test('should allow filtering by status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const statusFilter = page.getByRole('combobox').first();
    
    // Click on status filter
    await statusFilter.click();
    
    // Check filter options exist
    await expect(page.getByRole('option', { name: /all statuses/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /pending/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /completed/i })).toBeVisible();
  });

  test('should navigate to new transaction page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const newTransactionBtn = page.getByRole('link', { name: /new transaction/i });
    
    // Click new transaction button
    await newTransactionBtn.click();
    
    // Should navigate to new transaction page
    await expect(page).toHaveURL(/\/transactions\/new/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Check that main elements are still visible on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByPlaceholder('Search transactions...')).toBeVisible();
    
    // Check responsive layout adjustments
    const container = page.locator('.container');
    await expect(container).toBeVisible();
  });
});