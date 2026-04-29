/**
 * Task 4.2: Revert semantics.
 *
 * AC 1: After Translate, click Revert → buffer restored, prevBuffer = null, second Revert is no-op.
 * AC 2: Translate → Ask → Revert restores pre-Translate buffer; the appended note is wiped.
 * AC 3: Translate → Rewrite → Revert restores the post-Translate, pre-Rewrite buffer.
 *
 * Ask does NOT touch prevBuffer, so Revert always goes back to the last shortcut/rewrite result.
 * Revert button is disabled when prevBuffer === null (checked via opacity-50 class).
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import {
  resetAllMocks,
  setMockResponse,
} from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const TEST_MESSAGE = `Here is a passage about climate change. It covers the main effects and causes of global warming.`;
const PASSAGE = `Here is a passage about climate change.`;

// The mock key is based on the full input passed to createResponse() including <passage> tags
// For translate: `<passage>\n${text}\n</passage>` (no preamble)
// For ask: `Answer this question about the passage.\n\nQuestion: ${question}\n\n<passage>\n${text}\n</passage>`
// For rewrite: fetchRewrite calls getMockedResponse with the trimmed buffer (no tags)
const buildTranslateInput = (passage: string): string => {
  return `<passage>\n${passage}\n</passage>`;
};

const buildAskInput = (passage: string, question: string): string => {
  return `Answer this question about the passage.\n\nQuestion: ${question}\n\n<passage>\n${passage}\n</passage>`;
};

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
          streamingMessageId: null,
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

// ============================================================================
// AC 1: After Translate, click Revert → buffer restored, prevBuffer = null, second Revert is no-op
// ============================================================================

test('4.2.1: After Translate, click Revert → buffer restored and Revert becomes disabled', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Set up mock response for Translate
  const translatedResult = '[translated version in Chinese]';
  const mockInputTranslate = buildTranslateInput(PASSAGE);
  await setMockResponse(page, 'translate', mockInputTranslate, translatedResult);

  // Click Translate
  await editor.clickAction('translate');
  await page.waitForTimeout(300);

  // Verify buffer is now the translated result
  const bufferAfterTranslate = await editor.buffer();
  expect(bufferAfterTranslate).toBe(translatedResult);

  // Verify Revert button is enabled (has no opacity-50)
  const revertButton = page.locator('[data-testid="focus-action-revert"]');
  let revertClass = await revertButton.getAttribute('class');
  expect(revertClass).not.toContain('opacity-50');

  // Click Revert
  await editor.clickAction('revert');
  await page.waitForTimeout(100);

  // Verify buffer is restored to original
  const bufferAfterRevert = await editor.buffer();
  expect(bufferAfterRevert).toBe(PASSAGE);

  // Verify Revert button is now disabled (has opacity-50)
  revertClass = await revertButton.getAttribute('class');
  expect(revertClass).toContain('opacity-50');
});

test('4.2.2: Second Revert after first Revert is a no-op (buffer unchanged, still disabled)', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Set up mock and translate
  const mockInputTranslate = buildTranslateInput(PASSAGE);
  await setMockResponse(page, 'translate', mockInputTranslate, '[translated]');

  await editor.clickAction('translate');
  await page.waitForTimeout(300);
  expect(await editor.buffer()).toBe('[translated]');

  // Click Revert (first time)
  await editor.clickAction('revert');
  await page.waitForTimeout(100);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Verify Revert button is disabled
  const revertButton = page.locator('[data-testid="focus-action-revert"]');
  let revertClass = await revertButton.getAttribute('class');
  expect(revertClass).toContain('opacity-50');

  // Try to click Revert again (second time) with force: true since button is disabled
  // The onClick handler prevents action, so this is truly a no-op
  await revertButton.click({ force: true });
  await page.waitForTimeout(100);

  // Buffer should still be original (no change)
  expect(await editor.buffer()).toBe(PASSAGE);

  // Revert button should still be disabled
  revertClass = await revertButton.getAttribute('class');
  expect(revertClass).toContain('opacity-50');
});

// ============================================================================
// AC 2: Translate → Ask → Revert restores pre-Translate buffer (wiping appended note)
// ============================================================================

test('4.2.3: Translate → Ask → Revert restores pre-Translate buffer, wiping the note', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Translate
  const translatedResult = '[Chinese translation]';
  const mockInputTranslate = buildTranslateInput(PASSAGE);
  await setMockResponse(page, 'translate', mockInputTranslate, translatedResult);

  await editor.clickAction('translate');
  await page.waitForTimeout(300);

  expect(await editor.buffer()).toBe(translatedResult);

  // Ask a question (which appends a note to the CURRENT buffer, which is the translated text)
  const question = 'What is this about?';
  const mockInputAsk = buildAskInput(translatedResult, question);
  const askAnswer = 'This is about translations.';
  await setMockResponse(page, 'ask', mockInputAsk, askAnswer);

  await editor.ask(question);
  await page.waitForTimeout(300);

  // Verify buffer now has the note appended to the translated text
  const bufferAfterAsk = await editor.buffer();
  expect(bufferAfterAsk).toBe(`${translatedResult}\n\n> **Note:** ${askAnswer}`);

  // Revert (should go back to pre-Translate buffer, wiping the note that Ask added)
  await editor.clickAction('revert');
  await page.waitForTimeout(100);

  // Buffer should be the original PASSAGE (pre-Translate), NOT the translated + note
  expect(await editor.buffer()).toBe(PASSAGE);

  // Verify Revert button is now disabled
  const revertButton = page.locator('[data-testid="focus-action-revert"]');
  const revertClass = await revertButton.getAttribute('class');
  expect(revertClass).toContain('opacity-50');
});

// ============================================================================
// AC 3: Translate → Rewrite → Revert restores post-Translate, pre-Rewrite buffer
// ============================================================================

test('4.2.4: Translate → Rewrite → Revert restores the post-Translate, pre-Rewrite buffer', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Translate
  const translatedResult = '[translated text]';
  const mockInputTranslate = buildTranslateInput(PASSAGE);
  await setMockResponse(page, 'translate', mockInputTranslate, translatedResult);

  await editor.clickAction('translate');
  await page.waitForTimeout(300);

  expect(await editor.buffer()).toBe(translatedResult);

  // Rewrite the translated text
  // Note: createResponse is called with the full input including <passage> tags
  const rewriteResult = '[rewritten and translated text]';
  const rewriteInput = `<passage>\n${translatedResult}\n</passage>`;
  await setMockResponse(page, 'rewrite', rewriteInput, rewriteResult);

  await editor.clickAction('rewrite');
  await page.waitForTimeout(300);

  expect(await editor.buffer()).toBe(rewriteResult);

  // Revert (should restore the post-Translate, pre-Rewrite buffer)
  await editor.clickAction('revert');
  await page.waitForTimeout(100);

  // Buffer should be the translated text (NOT the original passage or the rewritten result)
  expect(await editor.buffer()).toBe(translatedResult);

  // Revert button should be disabled (prevBuffer cleared)
  const revertButton = page.locator('[data-testid="focus-action-revert"]');
  const revertClass = await revertButton.getAttribute('class');
  expect(revertClass).toContain('opacity-50');
});
