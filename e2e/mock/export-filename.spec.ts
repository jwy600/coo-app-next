/**
 * Export filename: verify filename includes thread title and date.
 *
 * Verifies that when a thread is exported locally (browser download),
 * the filename follows the expected pattern of `${sanitized-title}-${date}.md`.
 */

import { test, expect } from '../utils/test-fixtures';
import { Page } from '@playwright/test';
import { randomUUID } from 'crypto';

async function seedThreadWithKnownTitle(page: Page, threadTitle: string) {
  const threadId = randomUUID();
  const userId = randomUUID();
  const assistantId = randomUUID();

  await page.addInitScript(
    ({ storageKey, threadId, userId, assistantId, threadTitle }) => {
      const now = Date.now();
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: threadTitle,
              createdAt: now,
              updatedAt: now,
              messages: [
                {
                  id: userId,
                  threadId: threadId,
                  role: 'user',
                  text: 'Hello, what can you tell me?',
                  createdAt: now,
                  meta: {},
                },
                {
                  id: assistantId,
                  threadId: threadId,
                  role: 'assistant',
                  text: 'I can tell you many things.',
                  createdAt: now + 1000,
                  meta: {},
                },
              ],
            },
          ],
          activeThreadId: threadId,
          settings: {
            apiKey: 'sk-test',
            model: 'gpt-4',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            responseLanguage: 'en',
            translateLanguage: 'Chinese',
            exportDestination: 'local',
            obsidianVaultName: '',
          },
        },
        version: 3,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', threadId, userId, assistantId, threadTitle },
  );
}

test('Local export filename includes thread title and date', async ({ page, context }) => {
  const threadTitle = 'What is React';
  await seedThreadWithKnownTitle(page, threadTitle);

  // Navigate to the app root first
  await page.goto('/');

  // Get the thread ID from localStorage to navigate to it
  const threadId = await page.evaluate(() => {
    const storage = window.localStorage.getItem('coo-test-storage');
    if (storage) {
      const data = JSON.parse(storage);
      return data.state.activeThreadId;
    }
    return null;
  });

  // Navigate to the thread
  await page.goto(`/t/${threadId}`);

  // Wait for export button
  const exportButton = page.locator('button[aria-label="Export thread"], button:has-text("Export Thread")').first();
  await exportButton.waitFor({ state: 'visible', timeout: 5000 });
  await expect(exportButton).toBeEnabled();

  // Capture the download
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await exportButton.click();
  const download = await downloadPromise;

  // Get the suggested filename
  const filename = download.suggestedFilename();

  // Get today's date in ISO format (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // Verify filename format: ${sanitized-title}-${date}.md
  // "What is React" should be sanitized as "What is React" (no special chars)
  expect(filename).toMatch(/What is React-\d{4}-\d{2}-\d{2}\.md/);
  expect(filename).toContain(`-${today}.md`);
});
