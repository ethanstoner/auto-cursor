import { test, expect } from '@playwright/test';
import { SELECTORS } from '../helpers/selectors';
import { waitForJobToComplete, startVideoJob } from '../helpers/utils';

/**
 * Video Generation Flow Test
 * 
 * This test simulates a real user creating a video:
 * 1. Navigate to the video generation page
 * 2. Fill in the form (title, template, etc.)
 * 3. Start the video job
 * 4. Wait for job to complete
 * 5. Verify output (video file, preview, etc.)
 * 
 * Update selectors and flow based on your actual UI.
 */
test.describe('Video Generation Flow', () => {
  test('user can create a video and see finished result', async ({ page }) => {
    // Step 1: Navigate to main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill in form (adjust based on your actual form)
    const titleInput = page.locator(SELECTORS.titleInput).first();
    if (await titleInput.count() > 0) {
      await titleInput.fill('Test Video ' + Date.now());
    }
    
    // Step 3: Click generate button
    const generateButton = page.locator(SELECTORS.generateButton).first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // Step 4: Wait for job to appear
    const jobRow = page.locator(SELECTORS.jobRow).first();
    await expect(jobRow).toBeVisible({ timeout: 10000 });
    
    // Step 5: Wait for job to complete
    const timeoutMs = parseInt(process.env.VIDEO_JOB_TIMEOUT_MS || '180000'); // 3 minutes default
    await waitForJobToComplete(page, { timeoutMs });
    
    // Step 6: Verify output
    // Check for completed status
    const completedStatus = page.locator(SELECTORS.jobCompleted).first();
    await expect(completedStatus).toBeVisible();
    
    // Check for video preview or link
    const videoElement = page.locator(SELECTORS.videoPreview).first();
    const videoLink = page.locator(SELECTORS.videoLink).first();
    
    if (await videoElement.count() > 0) {
      await expect(videoElement).toBeVisible();
    } else if (await videoLink.count() > 0) {
      const href = await videoLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/\.(mp4|mov|webm)/i);
    }
    
    // Step 7: Final assertion - no critical errors
    const errorMessage = page.locator(SELECTORS.errorMessage);
    const errorCount = await errorMessage.count();
    expect(errorCount).toBe(0);
  });
});
