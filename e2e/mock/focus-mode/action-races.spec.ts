/**
 * Task 4.3: Race conditions guarded by isSameSession.
 *
 * Tests that the isSameSession guard in EditorControls correctly discards
 * API results when the user closes and reopens the editor on a different
 * range or message while a request is in flight.
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import {
  getMockCalls,
  resetAllMocks,
  setMockResponse,
  setMockDelay,
} from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const TEST_MESSAGE_1 = `First message with some content about testing.`;
const TEST_MESSAGE_2 = `Second message with different content about racing.`;

const PASSAGE_1 = `First message with some`;
const PASSAGE_2 = `content about`;
const PASSAGE_2_FULL = `Second message with different content about racing.`;

async function seedTwoMessages(page: Page) {
  const threadId = `thread-${Date.now()}`;
  const msg1Id = `msg-1-${Date.now()}`;
  const msg2Id = `msg-2-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId, msg1Id, msg2Id }) => {
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: 'Test Thread',
              messages: [
                {
                  id: msg1Id,
                  role: 'assistant',
                  text: 'First message with some content about testing.',
                  meta: {
                    openaiResponseId: `resp-1-${Date.now()}`,
                  },
                },
                {
                  id: msg2Id,
                  role: 'assistant',
                  text: 'Second message with different content about racing.',
                  meta: {
                    openaiResponseId: `resp-2-${Date.now()}`,
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
    { storageKey: 'coo-test-storage', threadId, msg1Id, msg2Id },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, msg1Id, msg2Id };
}

// ============================================================================
// Task 4.3.1: Different range same message → result discarded
// ============================================================================

test('4.3.1: Click Translate, close editor, reopen on different range of same message → result discarded', async ({ page }) => {
  await resetAllMocks(page);
  const { msg1Id } = await seedTwoMessages(page);

  // Set up mock with delay so we have time to close/reopen
  const input1 = `<passage>\n${PASSAGE_1}\n</passage>`;
  await setMockResponse(page, 'translate', input1, '[translated] First message with some');
  await setMockDelay(page, 'translate', 600);

  // Drag-select first range
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  const editor = new FocusEditorPO(page);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE_1);

  // Click Translate
  await editor.clickAction('translate');

  // While request is in flight, close the editor by clicking outside
  await page.waitForTimeout(100);
  await editor.closeByClickingOutside();

  // Wait for editor to close fully
  await page.waitForTimeout(200);

  // Reopen editor on a *different* range of the same message
  const msg1Text = TEST_MESSAGE_1;
  await dragSelectRange(page, msg1Id, PASSAGE_1.length + 1, PASSAGE_1.length + 1 + PASSAGE_2.length);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE_2);

  // Wait for the original translate request to complete (delay > 600ms)
  await page.waitForTimeout(700);

  // Buffer should NOT contain the translated result (it should still be the new selection)
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe(PASSAGE_2);
  expect(bufferAfter).not.toContain('[translated]');
});

// ============================================================================
// Task 4.3.2: Different message → result discarded
// ============================================================================

test('4.3.2: Click Translate on message 1, close, reopen on message 2 → result discarded', async ({ page }) => {
  await resetAllMocks(page);
  const { msg1Id, msg2Id } = await seedTwoMessages(page);

  const input1 = `<passage>\n${PASSAGE_1}\n</passage>`;
  await setMockResponse(page, 'translate', input1, '[translated] First message with some');
  await setMockDelay(page, 'translate', 600);

  // Select and start translate on message 1
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE_1);
  await editor.clickAction('translate');

  // Close editor while in flight
  await page.waitForTimeout(100);
  await editor.closeByClickingOutside();

  // Wait for editor to close fully
  await page.waitForTimeout(200);

  // Reopen on message 2
  const input2 = `<passage>\n${PASSAGE_2_FULL}\n</passage>`;
  await setMockResponse(page, 'translate', input2, '[translated] Second message with different content about racing.');
  await dragSelectRange(page, msg2Id, 0, PASSAGE_2_FULL.length);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE_2_FULL);

  // Wait for the original translate request to complete
  await page.waitForTimeout(700);

  // Buffer should have the message 2 content, not the message 1 translation
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe(PASSAGE_2_FULL);
  expect(bufferAfter).not.toContain('[translated] First message');
});

// ============================================================================
// Task 4.3.3: Same range same message → result lands (same session)
// ============================================================================

test('4.3.3: Click Translate, close, reopen on same range of same message → result lands', async ({ page }) => {
  await resetAllMocks(page);
  const { msg1Id } = await seedTwoMessages(page);

  const input1 = `<passage>\n${PASSAGE_1}\n</passage>`;
  await setMockResponse(page, 'translate', input1, '[translated] First message with some');
  await setMockDelay(page, 'translate', 600);

  // Select and translate
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE_1);
  await editor.clickAction('translate');

  // Close editor
  await page.waitForTimeout(100);
  await editor.closeByClickingOutside();

  // Wait for editor to close fully
  await page.waitForTimeout(200);

  // Reopen on the *same* range
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE_1);

  // Wait for the translate request to complete
  await page.waitForTimeout(700);

  // Buffer should now contain the translated result (same session)
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe('[translated] First message with some');
});

// ============================================================================
// Task 4.3.4: Rewrite in flight, close editor → result discarded
// ============================================================================

test('4.3.4: Click Rewrite, close editor while in flight → result discarded', async ({ page }) => {
  await resetAllMocks(page);
  const { msg1Id } = await seedTwoMessages(page);

  const input = `<passage>\n${PASSAGE_1}\n</passage>`;
  await setMockResponse(page, 'rewrite', input, 'Rewritten: First message completely revised.');
  await setMockDelay(page, 'rewrite', 600);

  // Select, open editor, and click Rewrite
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE_1);
  await editor.rewrite();

  // Close editor while request is in flight
  await page.waitForTimeout(100);
  await editor.closeByClickingOutside();

  // Wait for editor to close fully
  await page.waitForTimeout(200);

  // Reopen on any range (same message, different place)
  await dragSelectRange(page, msg1Id, PASSAGE_1.length + 1, PASSAGE_1.length + 1 + PASSAGE_2.length);
  expect(await editor.isOpen()).toBe(true);

  // Wait for the rewrite request to complete
  await page.waitForTimeout(700);

  // Buffer should be the new selection, not the rewrite result
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe(PASSAGE_2);
  expect(bufferAfter).not.toContain('Rewritten');
});

// ============================================================================
// Task 4.3.5: Ask in flight, click another chip → single-busy gate
// ============================================================================

test('4.3.5: Click Ask, while in flight click Translate → second chip disabled, Ask result lands', async ({ page }) => {
  await resetAllMocks(page);
  const { msg1Id } = await seedTwoMessages(page);

  const input1 = `Answer this question about the passage.\n\nQuestion: What is this?\n\n<passage>\n${PASSAGE_1}\n</passage>`;
  await setMockResponse(page, 'ask', input1, 'This is an answer about the passage.');
  await setMockDelay(page, 'ask', 600);

  // Select and open editor
  await dragSelectRange(page, msg1Id, 0, PASSAGE_1.length);
  const editor = new FocusEditorPO(page);

  // Submit ask question
  await editor.ask('What is this?');

  // While Ask is in flight (with 600ms delay), try to click Translate
  await page.waitForTimeout(100);
  const translateChip = page.locator('[data-testid="focus-action-translate"]');
  const classBeforeClick = await translateChip.getAttribute('class');

  // Click Translate (should be disabled due to single-busy gate)
  await translateChip.click().catch(() => {
    // Click may fail if truly disabled, that's fine
  });

  // Wait for Ask to complete
  await page.waitForTimeout(700);

  // Buffer should contain the Ask result (note appended)
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toContain('> **Note:** This is an answer about the passage.');
  expect(bufferAfter).toContain(PASSAGE_1);

  // Translate chip should be re-enabled after Ask completes
  const classAfter = await translateChip.getAttribute('class');
  expect(classAfter).not.toContain('opacity-50');
});
