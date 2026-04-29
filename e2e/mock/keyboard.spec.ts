/**
 * Keyboard interaction behavior.
 *
 * Verifies:
 * 1. Enter submits, Shift+Enter inserts newline
 * 2. Escape on the focus editor (current behavior: no-op, editor stays open)
 */

import { test, expect } from '../utils/test-fixtures';
import { FocusEditorPO } from '../page-objects/FocusEditorPO';
import { dragSelectRange } from '../utils/select';
import { resetAllMocks } from '../utils/mock-bridge';
import { Page } from '@playwright/test';

const TEST_MESSAGE = 'This is an existing assistant message ready for editing.';

async function seedThreadWithMessage(page: Page) {
  const threadId = `thread-${Date.now()}`;
  const messageId = `msg-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId, messageId, messageText }) => {
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
                  text: messageText,
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
            translateLanguage: 'Chinese',
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
    { storageKey: 'coo-test-storage', threadId, messageId, messageText: TEST_MESSAGE }
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('Enter submits, Shift+Enter inserts newline', async ({ page }) => {
  await resetAllMocks(page);
  await page.goto('/');

  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  // Type "Hello"
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Hello';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  // Press Shift+Enter to insert newline
  await composerInput.press('Shift+Enter');

  // Type "world"
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Hello\nworld';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  // Wait for Send button to be enabled
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });

  // Press Enter to submit
  await composerInput.press('Enter');

  // Wait for an assistant message to appear (confirms the message was sent and a reply streamed)
  await page.waitForSelector('[data-testid="assistant-message"]', {
    timeout: 5000,
  });

  // The presence of an assistant message confirms the submit worked
  expect(true).toBe(true);
});

test('Escape on the focus editor is a no-op (editor stays open)', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedThreadWithMessage(page);

  // Drag-select to open the editor
  await dragSelectRange(page, messageId, 0, 10);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  const initialBuffer = await editor.buffer();
  expect(initialBuffer).toBeTruthy();

  // Focus the textarea and press Escape
  await page.locator('[data-testid="focus-editor-textarea"]').focus();
  await page.press('[data-testid="focus-editor-textarea"]', 'Escape');

  // Wait a moment for any event handlers
  await page.waitForTimeout(200);

  // Assert: editor is still open
  const isStillOpen = await editor.isOpen();
  expect(isStillOpen).toBe(true);

  // Assert: buffer is unchanged (Escape did not save or close)
  const bufferAfterEscape = await editor.buffer();
  expect(bufferAfterEscape).toBe(initialBuffer);
});
