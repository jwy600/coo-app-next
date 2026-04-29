/**
 * Task 6.2: Context chain on legacy persisted messages (no responseId).
 *
 * When a message lacks `meta.openaiResponseId` (pre-persisted, legacy state),
 * the first focus-mode action injects `<reference-question>` wrapping the
 * prior user message. After that call's responseId is captured, subsequent
 * actions switch to chain mode (omit reference-question).
 * Close + reopen resets lastResponseId, so the next call re-injects.
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import {
  getMockCalls,
  resetAllMocks,
  setMockResponse,
} from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const ASSISTANT_TEXT = `React is a JavaScript library for building user interfaces with reusable components.`;
const SELECTED_PASSAGE = `React is a JavaScript library`;

async function seedLegacyThread(page: Page) {
  const threadId = `thread-${Date.now()}`;
  const userMessageId = `msg-user-${Date.now()}`;
  const assistantMessageId = `msg-assistant-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId, userMessageId, assistantMessageId, assistantText }) => {
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: 'Test Thread',
              messages: [
                {
                  id: userMessageId,
                  role: 'user',
                  text: 'What is React?',
                  meta: undefined, // User messages typically don't have meta
                },
                {
                  id: assistantMessageId,
                  role: 'assistant',
                  text: assistantText,
                  // NOTE: Intentionally NO meta.openaiResponseId — this is the legacy case
                  // The message simply does not have a meta field at all.
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
    {
      storageKey: 'coo-test-storage',
      threadId,
      userMessageId,
      assistantMessageId,
      assistantText: ASSISTANT_TEXT,
    },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, assistantMessageId };
}

// ============================================================================
// Task 6.2: Context chain on legacy messages
// ============================================================================

test('6.2.1: First focus action on legacy message injects <reference-question>', async ({ page }) => {
  await resetAllMocks(page);
  const { assistantMessageId } = await seedLegacyThread(page);

  // Drag-select the passage
  await dragSelectRange(page, assistantMessageId, 0, SELECTED_PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(SELECTED_PASSAGE);

  // Set up mock response for Translate
  // The input will include <reference-question>What is React?</reference-question>
  // and then the preamble + passage.
  const mockInput1 = `<reference-question>\nWhat is React?\n</reference-question>\n\n<passage>\n${SELECTED_PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput1, '[translated] React is a JavaScript');

  // Trigger Translate
  await editor.clickAction('translate');

  // Wait for the response to land
  await page.waitForTimeout(500);

  // Verify the mock recorded the call with reference-question
  const calls = await getMockCalls(page);
  expect(calls).toHaveLength(1);
  expect(calls[0].action).toBe('translate');
  expect(calls[0].passage).toContain('<reference-question>');
  expect(calls[0].passage).toContain('What is React?');
});

test('6.2.2: After first call captures responseId, second action omits reference-question', async ({ page }) => {
  await resetAllMocks(page);
  const { assistantMessageId } = await seedLegacyThread(page);

  // Drag-select the passage
  await dragSelectRange(page, assistantMessageId, 0, SELECTED_PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // First call: Translate with reference-question
  const mockInput1 = `<reference-question>\nWhat is React?\n</reference-question>\n\n<passage>\n${SELECTED_PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput1, '[translated] React is');

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  // Verify first call has reference-question
  let calls = await getMockCalls(page);
  expect(calls[0].passage).toContain('<reference-question>');

  // Second call: Ask, should NOT have reference-question (chain mode)
  // The input will be just the (possibly modified) passage + ask preamble
  const question = 'What version?';
  const mockInput2 = `Answer this question about the passage.\n\nQuestion: ${question}\n\n<passage>\n${SELECTED_PASSAGE}\n</passage>`;
  await setMockResponse(page, 'ask', mockInput2, 'React has many versions.');

  const askInput = page.locator('[data-testid="focus-ask-input"]');
  await askInput.fill(question);
  await askInput.press('Enter');

  await page.waitForTimeout(500);

  // Verify second call does NOT have reference-question
  calls = await getMockCalls(page);
  expect(calls).toHaveLength(2);
  expect(calls[1].action).toBe('ask');
  expect(calls[1].passage).not.toContain('<reference-question>');
  expect(calls[1].passage).toContain('What version?');
});

test('6.2.3: Close + reopen editor resets lastResponseId, next call re-injects reference-question', async ({ page }) => {
  await resetAllMocks(page);
  const { assistantMessageId } = await seedLegacyThread(page);

  // Drag-select and open editor
  await dragSelectRange(page, assistantMessageId, 0, SELECTED_PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // First call: Translate with reference-question
  const mockInput1 = `<reference-question>\nWhat is React?\n</reference-question>\n\n<passage>\n${SELECTED_PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput1, '[translated] React is');

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  // Verify first call has reference-question
  let calls = await getMockCalls(page);
  expect(calls[0].passage).toContain('<reference-question>');

  // Close editor by clicking outside
  await editor.closeByClickingOutside();
  await page.waitForTimeout(200);

  // Verify editor is closed
  expect(await editor.isOpen()).toBe(false);

  // Re-open editor on the same selection
  await dragSelectRange(page, assistantMessageId, 0, SELECTED_PASSAGE.length);
  expect(await editor.isOpen()).toBe(true);

  // Third call: Translate again, should re-inject reference-question
  const mockInput3 = `<reference-question>\nWhat is React?\n</reference-question>\n\n<passage>\n${SELECTED_PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput3, '[translated] React again');

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  // Verify third call has reference-question again
  calls = await getMockCalls(page);
  expect(calls).toHaveLength(2);
  expect(calls[1].action).toBe('translate');
  expect(calls[1].passage).toContain('<reference-question>');
  expect(calls[1].passage).toContain('What is React?');
});
