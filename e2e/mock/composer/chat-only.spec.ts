/**
 * Task 7.1: Composer behavior with focus editor open.
 *
 * Verifies that the composer is always in chat mode:
 * - Editor open + composer submit → assistant streams a new reply that lands in the thread;
 *   the editor stays open and untouched (buffer unchanged, no rewrite, no transformations).
 * - Editor open + drag-select inside composer → nothing happens. No `> **Note:**`
 *   blockquote appears anywhere (focus.buffer unchanged, message text unchanged).
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { AssistantMessagePO } from '../../page-objects/AssistantMessagePO';
import { dragSelectRange } from '../../utils/select';
import { resetAllMocks } from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const INITIAL_MESSAGE = 'This is an existing assistant message ready for editing.';

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
    { storageKey: 'coo-test-storage', threadId, messageId, messageText: INITIAL_MESSAGE },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('Editor open + composer submit → new assistant reply lands; editor untouched', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedThreadWithMessage(page);

  // Open the editor by drag-selecting part of the first message
  await dragSelectRange(page, messageId, 0, 10);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Capture the initial buffer
  const initialBuffer = await editor.buffer();
  expect(initialBuffer).toBe('This is an');

  // Type something into the editor
  await editor.typeBuffer('\n\nEdited in focus');
  const bufferAfterEdit = await editor.buffer();

  // Count messages before submission
  const initialMessageCount = await page.locator('[data-testid="assistant-message"]').count();
  expect(initialMessageCount).toBe(1);

  // Submit a new message via the composer (bottom chat input)
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Tell me something new';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for the new assistant message to appear (count should go from 1 → 2)
  // Allow for streaming
  await page.waitForTimeout(500);
  const finalMessageCount = await page.locator('[data-testid="assistant-message"]').count();
  expect(finalMessageCount).toBeGreaterThan(initialMessageCount);

  // Assert: editor is still open
  const editorStillOpen = await editor.isOpen();
  expect(editorStillOpen).toBe(true);

  // Assert: buffer is unchanged from what we typed into it
  const bufferAfterSubmit = await editor.buffer();
  expect(bufferAfterSubmit).toBe(bufferAfterEdit);
});

test('Editor open + drag-select inside composer → no Note blockquote added', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedThreadWithMessage(page);

  // Open the editor by drag-selecting part of the first message
  await dragSelectRange(page, messageId, 0, 10);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Capture the initial buffer
  const initialBuffer = await editor.buffer();

  // Get the bounding box of the composer to perform a drag-select inside it
  const composerInput = page.locator('[aria-label="Prompt"]');
  const box = await composerInput.boundingBox();
  expect(box).toBeTruthy();

  if (!box) throw new Error('Composer bounding box not found');

  // Drag-select inside the composer (shouldn't do anything)
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 20);
  await page.mouse.up();

  // Wait a moment for any event handlers
  await page.waitForTimeout(200);

  // Assert: buffer is unchanged
  const bufferAfterDrag = await editor.buffer();
  expect(bufferAfterDrag).toBe(initialBuffer);

  // Assert: no `> **Note:**` text appears in the editor textarea
  expect(bufferAfterDrag).not.toContain('> **Note:**');

  // Assert: no `> **Note:**` in rendered DOM (check the message)
  const msgPO = AssistantMessagePO.create(page, messageId);
  const renderedText = await msgPO.getRenderedText();
  expect(renderedText).not.toContain('Note:');
});
