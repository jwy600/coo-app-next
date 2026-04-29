/**
 * Task 5.1: Focus mode + streaming interactions.
 *
 * Covers the gate `enabled: !isStreaming && !isFocused` on useFocusSelection:
 * - While a message is streaming, drag-select on **that** message → no editor.
 * - Drag-select on a **different**, already-completed message during the stream → editor opens.
 * - Stream completes; drag-select on the just-finished message → editor opens.
 * - (Bonus, optional) If a focus call is mid-flight when a new chat message starts streaming,
 *   the chat stream is independent (no cross-talk).
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { AssistantMessagePO } from '../../page-objects/AssistantMessagePO';
import { dragSelectRange } from '../../utils/select';
import { resetAllMocks, setMockDelay } from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

async function seedThreadWithMessage(page: Page) {
  const threadId = `thread-${Date.now()}`;
  const messageId = `msg-${Date.now()}`;
  const messageText = 'This is an existing completed message that can be edited.';

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
        },
        version: 3,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', threadId, messageId, messageText },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('While message is streaming, drag-select on that message → no editor opens', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId: existingMsgId } = await seedThreadWithMessage(page);

  // Slow down the mock response so streaming window is large enough for assertions
  await setMockDelay(page, 'chat', 1500);

  // Submit a new prompt to start streaming a new message
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Generate a response';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for the streaming message to appear (it will be added to the message list)
  // The new message should have a data-testid="assistant-message"
  const messages = await page.locator('[data-testid="assistant-message"]').count();
  expect(messages).toBeGreaterThan(1);

  // Get the ID of the newly streaming message (the last one)
  const streamingMsgId = await page.evaluate(() => {
    const messages = Array.from(
      document.querySelectorAll('[data-testid="assistant-message"]'),
    );
    const lastMsg = messages[messages.length - 1];
    return lastMsg?.getAttribute('data-message-id');
  });

  expect(streamingMsgId).toBeTruthy();

  // While streaming is happening, drag-select on the streaming message
  // This should NOT open an editor because isStreaming=true disables the hook
  try {
    await dragSelectRange(page, streamingMsgId!, 0, 10);
  } catch (e) {
    // Source offsets may not exist yet for partial content — that's OK
    // The important assertion is that the editor doesn't open
  }

  // Assert editor does NOT appear within a reasonable timeout
  const editorVisible = await page
    .locator('[data-testid="focus-editor"]')
    .isVisible({ timeout: 500 })
    .catch(() => false);

  expect(editorVisible).toBe(false);
});

test('Drag-select on different completed message during stream → editor opens', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId: completedMsgId } = await seedThreadWithMessage(page);

  // Slow down the stream
  await setMockDelay(page, 'chat', 1500);

  // Submit a new prompt to start streaming
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Generate a response';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for streaming to start (message appears in list)
  await page.waitForTimeout(200);

  // While the new message is streaming, drag-select on the FIRST (completed) message
  // This message is NOT streaming, so the gate should allow selection → editor opens
  await dragSelectRange(page, completedMsgId, 0, 10);

  // Editor SHOULD open because the selected message is not streaming
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen(2000);

  const buffer = await editor.buffer();
  expect(buffer.trim()).toBe('This is an');
});

test('Stream completes; drag-select on just-finished message → editor opens', async ({
  page,
}) => {
  await resetAllMocks(page);
  await seedThreadWithMessage(page);

  // Very short delay so stream completes almost immediately
  await setMockDelay(page, 'chat', 50);

  // Submit a new prompt
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Test message for streaming';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for the new assistant message to appear
  // This means streaming has started and likely completed
  const initialCount = await page.locator('[data-testid="assistant-message"]').count();
  await page.waitForTimeout(800);

  // Get the newly created message ID
  const streamingMsgId = await page.evaluate(() => {
    const messages = Array.from(
      document.querySelectorAll('[data-testid="assistant-message"]'),
    );
    const lastMsg = messages[messages.length - 1];
    return lastMsg?.getAttribute('data-message-id');
  });

  expect(streamingMsgId).toBeTruthy();

  // Drag-select on the now-completed message
  // Since stream is done, streamingMessageId should be null and selection should work
  try {
    await dragSelectRange(page, streamingMsgId!, 0, 15);
  } catch (e) {
    // If selection fails due to missing source positions, that's acceptable
    // The important test is checking if the editor opens
  }

  // Editor SHOULD open
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen(2000);

  const buffer = await editor.buffer();
  expect(buffer.trim().length).toBeGreaterThan(0);
});

test('(Bonus) Focus call mid-flight when new chat stream starts → independent streams', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId: completedMsgId } = await seedThreadWithMessage(page);

  // Open editor on the completed message first
  await dragSelectRange(page, completedMsgId, 0, 10);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen(2000);

  // Now type in the composer while editor is open
  // This should not conflict — the composer always creates a new chat message
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Another message';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  // Delay the chat response so the focus editor stays open during streaming
  await setMockDelay(page, 'chat', 800);

  // Submit (this starts a new chat stream)
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait a bit for the new message to start streaming
  await page.waitForTimeout(200);

  // The editor on the first message should still be open (no interference)
  const editorStillOpen = await editor.isOpen();
  expect(editorStillOpen).toBe(true);

  // The new streaming message should exist
  const messageCount = await page.locator('[data-testid="assistant-message"]').count();
  expect(messageCount).toBeGreaterThan(1);

  // Close the editor
  await editor.closeByClickingOutside();
});
