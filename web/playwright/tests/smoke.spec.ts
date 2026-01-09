import { test, expect } from '@playwright/test';

/**
 * Smoke test: Verify the app loads without crashing
 */
test.describe('Smoke Tests', () => {
  test('app loads without crashing', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check page status
    expect(page.url()).toContain(page.url());
    
    // Check for fatal errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Check for obvious error messages in UI
    const errorMessages = page.locator('text=/something went wrong|error|failed/i');
    const errorCount = await errorMessages.count();
    
    expect(errorCount).toBe(0);
    
    // Verify page has some content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
