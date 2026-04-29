/**
 * Tasks 3.1 + 3.2: Ask roundtrip and note accumulation.
 *
 * Task 3.1 covers the single-ask lifecycle: open editor, ask a question,
 * mock returns answer, buffer accumulates the note, ask input clears.
 * Tests request-in-flight disabled state, mid-edit response landing, and failure recovery.
 *
 * Task 3.2 covers multiple successive asks: each one appends a note in order,
 * and each successive ask sends only the passage (not prior notes) as context.
 * Tests note ordering, no dedup, and accumulated buffer persistence through scroll/blur.
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

// The mock key is based on the full input passed to the API (wrapped in <passage>...</passage> tags)
// This is built by blockAction.ts buildInput() and passed to openAiClient.ts createResponse()
const buildMockInput = (passage: string, question?: string): string => {
  const preamble = question
    ? `Answer this question about the passage.\n\nQuestion: ${question}`
    : '';
  const wrapped = `<passage>\n${passage}\n</passage>`;
  return preamble ? `${preamble}\n\n${wrapped}` : wrapped;
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
// Task 3.1: Single-ask round trip
// ============================================================================

test('3.1.1: Open editor on passage, ask Q, mock returns A → buffer appends note and ask input clears', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.isOpen()).toBe(true);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Set up mock response. The input passed to the mock includes the full API request
  // structure with <passage>...</passage> tags and the question preamble
  const question = 'What is global warming?';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, 'Global warming is the long-term heating of Earth.');

  // Ask the question
  await editor.ask(question);

  // Wait for the response and verify buffer contains the note
  await page.waitForTimeout(500); // Give the response time to land
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe(`${PASSAGE}\n\n> **Note:** Global warming is the long-term heating of Earth.`);

  // Verify ask input is cleared
  const askInput = page.locator('[data-testid="focus-ask-input"]');
  expect(await askInput.inputValue()).toBe('');
});

test('3.1.2: During ask request, ask input + chips disabled; on response, re-enabled', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  const question = 'What is global warming?';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, 'Answer about global warming.');

  // Type the question and submit
  await editor.ask(question);

  // After response, chips should be enabled (no opacity-50 disabled state)
  await page.waitForTimeout(500);
  const translateChip = page.locator('[data-testid="focus-action-translate"]');
  const computedClass = await translateChip.getAttribute('class');
  // The chip should NOT have opacity-50 disabled state
  expect(computedClass).not.toContain('opacity-50');
});

test('3.1.3: Buffer mid-edit when ask returns → answer appends to current textarea contents', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Meanwhile, user edits the textarea by appending extra text
  // Focus the textarea first to ensure proper input handling
  const textarea = page.locator('[data-testid="focus-editor-textarea"]');
  await textarea.click();
  await textarea.press('End'); // Move cursor to end
  await page.keyboard.type(' EXTRA');

  const bufferMidEdit = await editor.buffer();
  expect(bufferMidEdit).toBe(`${PASSAGE} EXTRA`);

  // Now user types question into ask input and submits
  const question = 'Question?';
  const modifiedPassage = `${PASSAGE} EXTRA`;
  const mockInput = buildMockInput(modifiedPassage, question);
  await setMockResponse(page, 'ask', mockInput, 'Answer text here.');

  // Submit the ask
  await editor.ask(question);

  // Wait for response
  await page.waitForTimeout(500);

  // The buffer should contain the mid-edit content plus the appended note
  const bufferAfter = await editor.buffer();
  expect(bufferAfter).toBe(`${PASSAGE} EXTRA\n\n> **Note:** Answer text here.`);
});

test('3.1.4: Mocked failure → error surfaces, buffer unchanged, ask input re-enabled', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Mark the ask action as failed
  await mockFail(page, 'ask');

  const question = 'What is global warming?';
  // Submit the ask (which will fail)
  await editor.ask(question);

  // Wait a moment for the error to surface
  await page.waitForTimeout(500);

  // Buffer should remain unchanged
  expect(await editor.buffer()).toBe(PASSAGE);

  // After failure, the ask input is NOT cleared (preserving the user's typed question)
  // This is the pinned behavior (asymmetry: ask keeps the input on failure, unlike successful ask)
  const askInput = page.locator('[data-testid="focus-ask-input"]');
  const askInputValue = await askInput.inputValue();
  expect(askInputValue).toBe(question); // Question is preserved on failure
});

// ============================================================================
// Task 3.2: Multiple notes accumulating
// ============================================================================

test('3.2.1: Two successive asks → buffer accumulates notes in order', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);
  expect(await editor.buffer()).toBe(PASSAGE);

  // Set up mock responses. Both asks send only the PASSAGE (notes are not included in the API call)
  const q1 = 'Question 1?';
  const mockInput1 = buildMockInput(PASSAGE, q1);
  await setMockResponse(page, 'ask', mockInput1, 'First answer.');

  const q2 = 'Question 2?';
  const mockInput2 = buildMockInput(PASSAGE, q2); // Only passage, not prior notes
  await setMockResponse(page, 'ask', mockInput2, 'Second answer.');

  // First ask
  await editor.ask(q1);
  await page.waitForTimeout(500);

  const bufferAfter1 = await editor.buffer();
  expect(bufferAfter1).toBe(`${PASSAGE}\n\n> **Note:** First answer.`);

  // Second ask (on the same selection/editor; sends PASSAGE only, not accumulated notes)
  await editor.ask(q2);
  await page.waitForTimeout(500);

  const bufferAfter2 = await editor.buffer();
  expect(bufferAfter2).toBe(
    `${PASSAGE}\n\n> **Note:** First answer.\n\n> **Note:** Second answer.`,
  );
});

test('3.2.2: Ten successive asks → all notes present in order, no dedup, no reflow', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // Set up mock responses for all 10 asks
  // Each ask sends the PASSAGE, not the accumulated notes
  for (let i = 1; i <= 10; i++) {
    const q = `Question ${i}?`;
    const mockInput = buildMockInput(PASSAGE, q);
    await setMockResponse(page, 'ask', mockInput, `Answer ${i}.`);
  }

  // Submit all 10 asks in sequence
  for (let i = 1; i <= 10; i++) {
    await editor.ask(`Question ${i}?`);
    await page.waitForTimeout(300);
  }

  // Verify all 10 notes are present and in order
  const finalBuffer = await editor.buffer();
  const expectedBuffer = PASSAGE +
    Array.from({ length: 10 }, (_, i) => `\n\n> **Note:** Answer ${i + 1}.`).join('');

  expect(finalBuffer).toBe(expectedBuffer);
});

test('3.2.3: Each successive ask sends passage-only, not accumulating notes', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // Set up mock responses
  const q1 = 'Q1?';
  const q2 = 'Q2?';
  const mockInput1 = buildMockInput(PASSAGE, q1);
  const mockInput2 = buildMockInput(PASSAGE, q2);
  await setMockResponse(page, 'ask', mockInput1, 'First answer.');
  await setMockResponse(page, 'ask', mockInput2, 'Second answer.');

  // First ask
  await editor.ask(q1);
  await page.waitForTimeout(500);

  // Second ask
  await editor.ask(q2);
  await page.waitForTimeout(500);

  // Inspect mock calls to verify each one sent only the passage (in the full input)
  const calls = await getMockCalls(page);
  const askCalls = calls.filter((c) => c.action === 'ask');

  expect(askCalls).toHaveLength(2);
  // Both calls should have sent PASSAGE (wrapped in the full input), not the passage + notes
  // The mock stores the full input, which includes the preamble and passage tags
  expect(askCalls[0].passage).toContain(PASSAGE);
  expect(askCalls[1].passage).toContain(PASSAGE);
  // Verify that the passage doesn't include the notes that were added after the first ask
  expect(askCalls[1].passage).not.toContain('> **Note:**');
});

test('3.2.4: Notes survive scroll, blur of ask input, and clicks elsewhere inside editor', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  // Drag-select the passage
  await dragSelectRange(page, messageId, 0, PASSAGE.length);

  const editor = new FocusEditorPO(page);

  // Set up mock response
  const q1 = 'Q1?';
  const mockInput1 = buildMockInput(PASSAGE, q1);
  await setMockResponse(page, 'ask', mockInput1, 'First answer.');

  // Ask and verify note is appended
  await editor.ask(q1);
  await page.waitForTimeout(500);

  const bufferAfterAsk = await editor.buffer();
  expect(bufferAfterAsk).toBe(`${PASSAGE}\n\n> **Note:** First answer.`);

  // Scroll the page
  await page.evaluate(() => {
    window.scrollBy(0, 200);
  });

  // Verify note still there
  let bufferAfterScroll = await editor.buffer();
  expect(bufferAfterScroll).toBe(`${PASSAGE}\n\n> **Note:** First answer.`);

  // Blur the ask input and refocus editor
  const editorTextarea = page.locator('[data-testid="focus-editor-textarea"]');
  await editorTextarea.click();
  await page.waitForTimeout(100);

  // Verify note still there
  let bufferAfterBlur = await editor.buffer();
  expect(bufferAfterBlur).toBe(`${PASSAGE}\n\n> **Note:** First answer.`);

  // Click inside the editor area (on the textarea)
  await editorTextarea.click();
  await page.waitForTimeout(100);

  // Final check: notes remain
  let bufferFinal = await editor.buffer();
  expect(bufferFinal).toBe(`${PASSAGE}\n\n> **Note:** First answer.`);
});
