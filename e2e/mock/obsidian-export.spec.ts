/**
 * Obsidian export: verify obsidian:// URI scheme navigation.
 *
 * Verifies that when exportDestination is set to 'obsidian' and obsidianVaultName
 * is configured, clicking Export opens an obsidian:// URI with the correct
 * vault name and file content.
 */

import { test, expect } from '../utils/test-fixtures';
import { resetAllMocks } from '../utils/mock-bridge';
import { Page } from '@playwright/test';

async function seedObsidianSettings(page: Page) {
  await page.evaluate(() => {
    const storage = window.localStorage.getItem('coo-test-storage');
    if (storage) {
      const data = JSON.parse(storage);
      data.state.settings.exportDestination = 'obsidian';
      data.state.settings.obsidianVaultName = 'TestVault';
      window.localStorage.setItem('coo-test-storage', JSON.stringify(data));
    }
  });
}

test('Obsidian export opens obsidian:// URI with vault name and content', async ({
  page,
}) => {
  await resetAllMocks(page);
  await page.goto('/');

  // Seed Obsidian settings
  await seedObsidianSettings(page);
  await page.reload();

  // Create a thread with a user message and assistant response
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  // Submit user message
  await composerInput.focus();
  const userMessage = 'What is Obsidian?';
  await page.evaluate((text) => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }, userMessage);
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for assistant message
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

  // Capture obsidian:// navigation before clicking export
  let capturedUri = '';
  await page.evaluate(() => {
    (window as any).__capturedObsidianUri = null;
    // Monitor for anchor elements with obsidian:// href being added to DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLAnchorElement && node.href.startsWith('obsidian://')) {
              (window as any).__capturedObsidianUri = node.href;
            }
          });
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    (window as any).__capturedUriObserver = observer;
  });

  // Find and click export button
  const exportButton = page.locator('button[aria-label="Export thread"], button:has-text("Export Thread")').first();
  await exportButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();

  // Wait a bit for the URI to be captured
  await page.waitForTimeout(500);

  // Retrieve captured URI
  capturedUri = await page.evaluate(() => {
    const uri = (window as any).__capturedObsidianUri || '';
    const observer = (window as any).__capturedUriObserver;
    if (observer) observer.disconnect();
    return uri;
  });

  // Assert URI exists and has correct format
  expect(capturedUri).toBeTruthy();
  expect(capturedUri).toMatch(/^obsidian:\/\//);

  // Assert vault name is present
  expect(capturedUri).toContain('vault=TestVault');

  // Assert file path is present (should be under Coo/)
  expect(capturedUri).toContain('file=');

  // Assert content parameter is present
  expect(capturedUri).toContain('content=');

  // Verify the content includes the exported markdown
  const decodedUri = decodeURIComponent(capturedUri);
  expect(decodedUri).toContain(userMessage);
});
