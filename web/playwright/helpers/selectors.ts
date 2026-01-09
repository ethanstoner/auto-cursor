/**
 * Centralized selectors for Playwright tests
 * Update these based on your actual UI elements
 */

export const SELECTORS = {
  // Common UI elements
  generateButton: '[data-testid="generate-button"], button:has-text("Generate"), button:has-text("Render"), button:has-text("Create Video")',
  jobsTable: '[data-testid="jobs-table"], table, [role="table"]',
  jobRow: '[data-testid="job-row"], tr[data-job-id]',
  
  // Form inputs
  titleInput: 'input[name="title"], input[placeholder*="title" i], input[placeholder*="name" i]',
  templateSelect: 'select[name="template"], [data-testid="template-select"]',
  
  // Job status
  jobStatus: '[data-testid="job-status"], [class*="status"], [class*="state"]',
  jobProcessing: ':has-text("Processing"), :has-text("Queued"), :has-text("Rendering")',
  jobCompleted: ':has-text("Completed"), :has-text("Done"), :has-text("Finished"), :has-text("Success")',
  jobError: ':has-text("Error"), :has-text("Failed")',
  
  // Video output
  videoPreview: 'video, [data-testid="video-preview"], [class*="video"]',
  videoLink: 'a[href*=".mp4"], a[href*=".mov"], a[href*="video"]',
  downloadButton: 'button:has-text("Download"), a:has-text("Download")',
  
  // Error messages
  errorMessage: '[role="alert"], [class*="error"], [class*="alert"]',
};
