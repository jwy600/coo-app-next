/**
 * Task 6.1: Context chain via previousResponseId.
 *
 * Verifies that focus-mode API calls form a context chain:
 * - First call uses the message's seeded responseId
 * - Successive calls use the prior call's responseId
 * - Closing and reopening resets the chain to the seeded message responseId
 * - Failed calls don't advance the chain
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import {
  getMockCalls,
  resetAllMocks,
  setMockResponse,
  mockFail,
} from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const TEST_MESSAGE = `Here is a passage about climate change. It covers the main effects and causes of global warming.`;
const PASSAGE = `Here is a passage about climate change.`;

async function seedAndNavigate(page: Page) {
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
                    openaiResponseId: 'seeded-resp-A',
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
    { storageKey: 'coo-test-storage', threadId, messageId, messageText: TEST_MESSAGE },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('6.1.1: First focus call uses message seeded responseId', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.isOpen()).toBe(true);

  // Set up mock response for translate
  const mockInput = `<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput, `[translated] ${PASSAGE}`);

  // Click translate
  await editor.clickAction('translate');

  // Wait for response
  await page.waitForTimeout(500);

  // Inspect the mock call to verify previousResponseId was 'seeded-resp-A'
  const calls = await getMockCalls(page);
  const translateCall = calls.find((c) => c.action === 'translate');

  expect(translateCall).toBeDefined();
  expect(translateCall?.previousResponseId).toBe('seeded-resp-A');
});

test('6.1.2: Successive calls chain via prior responseId', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // First call: translate
  const mockInput1 = `<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput1, `[translated] ${PASSAGE}`);

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  const callsAfterTranslate = await getMockCalls(page);
  const translateCall = callsAfterTranslate[0]; // First call should be the translate

  // Verify first call used seeded responseId
  expect(translateCall.action).toBe('translate');
  expect(translateCall.previousResponseId).toBe('seeded-resp-A');

  // The mock generates responseIds like resp-test-1, resp-test-2, etc.
  // After the translate call, the next call's previousResponseId should be
  // the auto-generated responseId from the first call.

  // Second call: ask (should use the responseId from the first translate call)
  const mockInput2 = `Answer this question about the passage.\n\n<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'ask', mockInput2, 'Answer about climate change.');

  const question = 'What is climate change?';
  await editor.ask(question);
  await page.waitForTimeout(500);

  const callsAfterAsk = await getMockCalls(page);
  const askCall = callsAfterAsk[1]; // Second call should be the ask

  // Verify second call used the first call's responseId, not the seeded one
  // The ask's previousResponseId should be a generated one (resp-test-1), not the seeded
  expect(askCall.action).toBe('ask');
  expect(askCall.previousResponseId).not.toBe('seeded-resp-A');
  expect(askCall.previousResponseId).toMatch(/^resp-test-/);
});

test('6.1.3: Close and reopen resets chain to seeded responseId', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // First session: open, translate, close
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  const mockInput1 = `<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'translate', mockInput1, `[translated] ${PASSAGE}`);

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  const calls1 = await getMockCalls(page);
  const firstTranslate = calls1.find((c) => c.action === 'translate');
  expect(firstTranslate?.previousResponseId).toBe('seeded-resp-A');

  // Close the editor
  await editor.closeByClickingOutside();
  await page.waitForTimeout(300);

  // Second session: drag-select again on the SAME message
  // The browser should have reset focus state, so opening again on the same message
  // should use the seeded responseId again
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor2 = new FocusEditorPO(page);
  expect(await editor2.isOpen()).toBe(true);

  const mockInput2 = `<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'summarize', mockInput2, `Summary: ${PASSAGE}`);

  await editor2.clickAction('summarize');
  await page.waitForTimeout(500);

  const calls2 = await getMockCalls(page);
  const secondSummarize = calls2.find((c) => c.action === 'summarize');

  // Verify the second session's first call uses the seeded responseId again
  expect(secondSummarize?.previousResponseId).toBe('seeded-resp-A');
});

test('6.1.4: Failed call leaves chain head unchanged', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // First call: translate (will fail)
  await mockFail(page, 'translate');

  await editor.clickAction('translate');
  await page.waitForTimeout(500);

  const calls1 = await getMockCalls(page);
  const failedTranslate = calls1.find((c) => c.action === 'translate');

  // Verify the failed call sent the seeded responseId
  expect(failedTranslate?.previousResponseId).toBe('seeded-resp-A');

  // Second call: ask (should still use the seeded responseId because the failed
  // translate's responseId was never adopted by the state)
  const mockInput2 = `Answer this question about the passage.\n\n<passage>\n${PASSAGE}\n</passage>`;
  await setMockResponse(page, 'ask', mockInput2, 'Answer about climate change.');

  const question = 'What is climate change?';
  await editor.ask(question);
  await page.waitForTimeout(500);

  const calls2 = await getMockCalls(page);
  const askCall = calls2.find((c) => c.action === 'ask');

  // Verify the ask still uses the seeded responseId, not the failed translate's responseId
  expect(askCall?.previousResponseId).toBe('seeded-resp-A');
});
