/**
 * Export to markdown: verify export functionality and content.
 *
 * Verifies that the Export button triggers a download with correct
 * YAML frontmatter and user/assistant message sections.
 */

import { test, expect } from '../../utils/test-fixtures';
import { resetAllMocks } from '../../utils/mock-bridge';
import * as fs from 'fs';
import * as path from 'path';

test('export button triggers download with correct markdown structure', async ({
  page,
  context,
}) => {
  await resetAllMocks(page);
  await page.goto('/');

  // Create a thread with a user message and assistant response
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  // Submit user message
  await composerInput.focus();
  const userMessage = 'What is a test?';
  await page.evaluate((text) => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }, userMessage);
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for assistant message
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

  // Verify we're on a thread page
  const url = page.url();
  expect(url).toMatch(/\/t\/[a-z0-9]+/);

  // Find export button
  const exportButton = page.locator('button[aria-label="Export thread"], button:has-text("Export Thread")').first();
  await exportButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(exportButton).toBeEnabled();

  // Intercept the blob by capturing the downloaded content via evaluate
  // The download function creates a blob and triggers a download.
  // We'll capture what gets created.
  let capturedContent = '';
  await page.evaluate(() => {
    // Patch Blob to capture the markdown content being downloaded
    const originalBlob = window.Blob;
    (window as any).__downloadedContent = null;

    // Override the createObjectURL mechanism to capture the blob
    const originalRevoke = URL.revokeObjectURL;
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = function (blob: any) {
      if (blob instanceof Blob && blob.type.includes('markdown')) {
        // Read the blob content
        const reader = new FileReader();
        reader.onload = (event) => {
          (window as any).__downloadedContent = event.target?.result;
        };
        reader.readAsText(blob);
      }
      return originalCreate.call(this, blob);
    };
  });

  // Click the export button
  await exportButton.click();

  // Wait a bit for the blob reader to complete
  await page.waitForTimeout(500);

  // Get the captured content
  capturedContent = await page.evaluate(() => {
    return (window as any).__downloadedContent || '';
  });

  expect(capturedContent).toBeTruthy();
  const content = capturedContent;

  // Verify YAML frontmatter exists
  expect(content).toMatch(/^---\n/);
  expect(content).toContain('title:');
  expect(content).toContain('created:');
  expect(content).toContain('question:');

  // Verify frontmatter closing
  const lines = content.split('\n');
  const secondDashLine = lines.findIndex((line, i) => i > 0 && line === '---');
  expect(secondDashLine).toBeGreaterThan(0);

  // Verify user message section
  expect(content).toContain('## User');
  expect(content).toContain(userMessage);

  // Verify assistant message section
  expect(content).toContain('## Assistant');

  // Content after frontmatter should have both sections
  const bodyStart = secondDashLine + 1;
  const body = lines.slice(bodyStart).join('\n');
  expect(body).toContain('## User');
  expect(body).toContain('## Assistant');
});
