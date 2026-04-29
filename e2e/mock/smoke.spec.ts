/**
 * Phase 1 Checkpoint: End-to-end smoke test.
 *
 * Verifies the complete e2e harness:
 * 1. SDK-boundary mock delivers streamed responses
 * 2. Test IDs allow page object selection
 * 3. Drag-select primitive opens the editor
 * 4. Editor reads/writes buffer correctly
 * 5. Closing the editor saves changes
 *
 * This is the only spec in Phase 1 that tests real behavior. All others are
 * stubs (.fixme) until their phases rewrite them.
 */

import { test, expect } from '../utils/test-fixtures';
import { FocusEditorPO } from '../page-objects/FocusEditorPO';
import { AssistantMessagePO } from '../page-objects/AssistantMessagePO';
import { dragSelectRange } from '../utils/select';
import { getMockCalls, resetAllMocks, setMockResponse } from '../utils/mock-bridge';

test('end-to-end: send message, select reply, edit, save', async ({
  page,
}) => {
  await resetAllMocks(page);

  await page.goto('/');
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  // Set the contenteditable's textContent and dispatch a real input event
  // so React's onInput handler fires and setPrompt updates the store.
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'What is React?';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for assistant message to appear (streamed response)
  const assistantMsg = await page.waitForSelector('[data-testid="assistant-message"]', {
    timeout: 10000,
  });

  const messageId = await assistantMsg?.getAttribute('data-message-id');
  expect(messageId).toBeTruthy();

  const msgPO = AssistantMessagePO.create(page, messageId!);
  const renderedText = await msgPO.getRenderedText();

  // The mock should have returned a canned response
  expect(renderedText.length).toBeGreaterThan(0);

  // Now drag-select a portion of the reply to open the editor
  // Select characters 0-20 (should be a few words)
  await dragSelectRange(page, messageId!, 0, 20);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // The buffer should contain the selected text
  const buffer = await editor.buffer();
  expect(buffer.length).toBeGreaterThan(0);

  // Verify mock call was recorded
  const calls = await getMockCalls(page);
  expect(calls.length).toBeGreaterThan(0);

  // The first call should be chat (from the composer)
  const chatCall = calls[0];
  expect(chatCall.action).toBe('chat');
  expect(chatCall.passage).toBe('What is React?');

  // Type some text into the editor
  await editor.typeBuffer('\n\nEdited');

  // Close the editor
  await editor.closeByClickingOutside();

  // Verify the editor closed
  const isOpen = await editor.isOpen();
  expect(isOpen).toBe(false);

  // The message text should now include the edit
  const updatedText = await msgPO.getRenderedText();
  expect(updatedText).toContain('Edited');
});
