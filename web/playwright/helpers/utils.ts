import { Page, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

/**
 * Wait for a video job to complete
 * @param page Playwright page object
 * @param options Configuration options
 */
export async function waitForJobToComplete(
  page: Page,
  options: {
    timeoutMs?: number;
    jobSelector?: string;
    statusSelector?: string;
  } = {}
) {
  const timeoutMs = options.timeoutMs || parseInt(process.env.VIDEO_JOB_TIMEOUT_MS || '180000'); // Default 3 minutes
  const jobSelector = options.jobSelector || SELECTORS.jobRow;
  const statusSelector = options.statusSelector || SELECTORS.jobStatus;

  // Wait for job to appear
  await page.waitForSelector(jobSelector, { timeout: 10000 });

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const statusText = await page.textContent(statusSelector).catch(() => '');
    
    if (statusText && (
      statusText.includes('Completed') ||
      statusText.includes('Done') ||
      statusText.includes('Finished') ||
      statusText.includes('Success')
    )) {
      return true;
    }
    
    if (statusText && (
      statusText.includes('Error') ||
      statusText.includes('Failed')
    )) {
      throw new Error(`Job failed with status: ${statusText}`);
    }
    
    await page.waitForTimeout(2000); // Poll every 2 seconds
  }
  
  throw new Error(`Job did not complete within ${timeoutMs}ms timeout`);
}

/**
 * Start a video generation job
 */
export async function startVideoJob(page: Page, formData: Record<string, string> = {}) {
  // Fill form if data provided
  for (const [key, value] of Object.entries(formData)) {
    const input = page.locator(`input[name="${key}"], input[placeholder*="${key}" i]`).first();
    if (await input.count() > 0) {
      await input.fill(value);
    }
  }
  
  // Click generate button
  const generateButton = page.locator(SELECTORS.generateButton).first();
  await generateButton.click();
}
