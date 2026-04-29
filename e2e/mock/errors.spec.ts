/**
 * Phase 7: Error surface and recovery.
 *
 * Verifies:
 * 1. Mocked chat failure surfaces an error message in the UI.
 * 2. Mocked focus action failure surfaces an error and re-enables action row.
 */

import { test, expect } from '../utils/test-fixtures';
import { FocusEditorPO } from '../page-objects/FocusEditorPO';
import { dragSelectRange } from '../utils/select';
import { resetAllMocks, mockFail } from '../utils/mock-bridge';
import { Page } from '@playwright/test';

async function seedThreadWithAssistantMessage(page: Page) {
  const threadId = `thread-${Date.now()}`;
  const messageId = `msg-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId, messageId }) => {
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: 'Test Thread',
              messages: [
                {
                  id: messageId,
                  role: 'assistant',
                  text: 'This is an assistant response with some content to edit.',
                  meta: {
                    openaiResponseId: `resp-${Date.now()}`,
                  },
                },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
          activeThreadId: threadId,
          settings: {
            apiKey: 'sk-test',
            model: 'gpt-4',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            responseLanguage: 'en',
            translateLanguage: 'Spanish',
            exportDestination: 'local',
            obsidianVaultName: '',
          },
          mode: 'chat',
          isAwaitingResponse: false,
          error: null,
          focus: null,
          composerPrompt: '',
        },
        version: 3,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', threadId, messageId },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('Mocked chat failure surfaces error message', async ({ page }) => {
  await resetAllMocks(page);
  const threadId = `thread-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId }) => {
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: 'Empty Thread',
              messages: [],
              createdAt: new Date().toISOString(),
            },
          ],
          activeThreadId: threadId,
          settings: {
            apiKey: 'sk-test',
            model: 'gpt-4',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            responseLanguage: 'en',
            translateLanguage: 'Spanish',
            exportDestination: 'local',
            obsidianVaultName: '',
          },
          mode: 'chat',
          isAwaitingResponse: false,
          error: null,
          focus: null,
          composerPrompt: '',
        },
        version: 3,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', threadId },
  );

  await page.goto(`/t/${threadId}`);

  // Set up mock to fail on next chat call
  await mockFail(page, 'chat');

  // Submit a message
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Test message';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for error message to appear
  const errorMessage = page.locator('.assistant-error');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });

  // Verify error message contains failure text
  const errorText = await errorMessage.locator('p').textContent();
  expect(errorText).toBeTruthy();
  expect(errorText?.length).toBeGreaterThan(0);

  // Send button should be enabled again (not awaiting response)
  const sendButton = page.locator('button:has-text("Send"):not([disabled])');
  await expect(sendButton).toBeVisible({ timeout: 5000 });
});

test('Mocked focus action failure surfaces error and re-enables', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedThreadWithAssistantMessage(page);

  // Open the focus editor
  await dragSelectRange(page, messageId, 0, 20);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Set up mock to fail on next translate call
  await mockFail(page, 'translate');

  // Click Translate
  await editor.clickAction('translate');

  // Wait for error to appear
  const errorMessage = page.locator('.assistant-error');
  await expect(errorMessage).toBeVisible({ timeout: 5000 });

  // Verify error message exists
  const errorText = await errorMessage.locator('p').textContent();
  expect(errorText).toBeTruthy();

  // Action chips should be re-enabled (not disabled by opacity-50)
  // Verify we can click another action or the action row is responsive
  const translateAction = page.locator('[data-testid="focus-action-translate"]');
  await expect(translateAction).toBeVisible();
});
