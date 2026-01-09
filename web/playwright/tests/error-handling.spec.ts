import { test, expect } from '@playwright/test';
import { SELECTORS } from '../helpers/selectors';

/**
 * Error Handling Tests
 * Verify that invalid input shows clear errors
 */
test.describe('Error Handling', () => {
  test('invalid input shows clear error message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to submit form with missing required fields
    const generateButton = page.locator(SELECTORS.generateButton).first();
    
    // If form has validation, try submitting empty
    if (await generateButton.count() > 0) {
      await generateButton.click();
      
      // Wait for error message
      const errorMessage = page.locator(SELECTORS.errorMessage).first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Verify error is user-friendly
      const errorText = await errorMessage.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText?.length).toBeGreaterThan(0);
    }
  });
});
