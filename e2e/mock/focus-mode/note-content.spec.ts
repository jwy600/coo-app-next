/**
 * Task 3.3: Note content edge cases.
 *
 * Covers the handling of various answer formats when appended to the buffer:
 * multi-line answers, special characters (backticks, bold, blockquotes, math),
 * empty/whitespace answers, and the edge case of an answer that itself contains
 * the reserved pattern.
 *
 * Notes live as raw markdown in focus.buffer; appendNoteToBuffer does minimal
 * processing (trim only), so characters flow through verbatim. Rendering applies
 * blockquote styling via isNoteBlockquote (MarkdownContent.tsx:22).
 *
 * Per lib/state/focus.ts:85-86, appendNoteToBuffer does:
 *   const trimmed = note.trim();
 *   if (!trimmed) return state;
 * So whitespace-only answers result in no note appended.
 */

import { test, expect } from '../../utils/test-fixtures';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import { resetAllMocks, setMockResponse } from '../../utils/mock-bridge';
import { Page } from '@playwright/test';

const PASSAGE = `Here is a passage to edit.`;

// Build the mock input exactly as lib/api/blockAction.ts buildInput() does
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
    { storageKey: 'coo-test-storage', threadId, messageId, messageText: PASSAGE },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  return { threadId, messageId };
}

test('Multi-line (soft break) answer → every line quoted so the whole answer stays in one blockquote', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  const answer = 'line1\nline2';
  const question = 'explain this';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  const buffer = await editor.buffer();

  // Every line of the answer is prefixed with `>` so the whole answer stays
  // inside the blockquote. Relying on markdown lazy continuation (a bare
  // `line2`) works for a soft break but breaks the moment a blank line appears
  // — see the two-paragraph test below.
  expect(buffer).toBe(`${PASSAGE}\n\n> **Note:** line1\n> line2`);

  // Verify rendered DOM shows both lines in one blockquote
  await editor.closeByClickingOutside();

  // Note: MarkdownContent applies the --note class only if the rendered first paragraph
  // starts with <strong>Note:</strong>. Multi-line blockquotes may not always match.
  // Instead: scope to any blockquote within this message and check contents.
  const blockquote = page.locator(`[data-message-id="${messageId}"] blockquote`);
  await expect(blockquote).toBeVisible();

  const blockquoteText = await blockquote.textContent();
  expect(blockquoteText).toContain('line1');
  expect(blockquoteText).toContain('line2');
});

test('Two-paragraph answer → both paragraphs quoted so both keep the blockquote border', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  const answer = 'Para one.\n\nPara two.';
  const question = 'explain this';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  const buffer = await editor.buffer();

  // Every line — including the blank separator — is prefixed with `>` so the
  // second paragraph stays inside the blockquote. Without the `>` on the
  // continuation, the blank line ends the blockquote and Para two. breaks out,
  // losing its left border (the bug this pins).
  expect(buffer).toBe(`${PASSAGE}\n\n> **Note:** Para one.\n>\n> Para two.`);

  await editor.closeByClickingOutside();

  // The whole answer renders as a single blockquote with two <p> children.
  // (Before the fix, the blockquote held one <p> and Para two. was a sibling
  // paragraph outside it.)
  const blockquote = page.locator(`[data-message-id="${messageId}"] blockquote`);
  await expect(blockquote).toBeVisible();
  await expect(blockquote.locator('p')).toHaveCount(2);

  const blockquoteText = await blockquote.textContent();
  expect(blockquoteText).toContain('Para one.');
  expect(blockquoteText).toContain('Para two.');
});

test('Answer with special chars (backticks, bold, math, blockquote) → characters preserved verbatim', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  const answer = '`code` **bold** > quote $x$';
  const question = 'test special chars';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  let buffer = await editor.buffer();
  expect(buffer).toBe(`${PASSAGE}\n\n> **Note:** ${answer}`);

  // Round-trip: close and reopen the editor. After close, the message text now includes
  // the appended note, so the full message length is longer. Reopening on the original
  // range (0, PASSAGE.length) would only get the passage without the note.
  // Compute the new full length and drag the whole range, accounting for DOM syntax stripping.
  await editor.closeByClickingOutside();

  const newMessageLength = `${PASSAGE}\n\n> **Note:** ${answer}`.length;
  // Exclude the final character to avoid offset-DOM mismatch from stripped syntax (> and **)
  await dragSelectRange(page, messageId, 0, Math.max(1, newMessageLength - 1));
  await editor.waitForOpen();

  buffer = await editor.buffer();
  // Characters should survive exactly: backticks, bold, blockquote, math all preserved
  expect(buffer).toContain(`> **Note:** ${answer}`);
});

test('Answer beginning with > (itself a blockquote) → no double-prefixing', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Answer that starts with blockquote marker
  const answer = '> already a quote';
  const question = 'test blockquote answer';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  const buffer = await editor.buffer();

  // appendNoteToBuffer adds exactly one "> **Note:** " prefix
  // The answer (which starts with >) flows after it, no double-prefixing
  expect(buffer).toBe(`${PASSAGE}\n\n> **Note:** > already a quote`);
});

test('Whitespace-only answer → no note appended, buffer unchanged', async ({ page }) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Set mock to return only whitespace
  const answer = '   \n\t  ';
  const question = 'test whitespace answer';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  const buffer = await editor.buffer();

  // Per lib/state/focus.ts:85-86, appendNoteToBuffer trims and checks if empty.
  // Since trimmed is empty, state is unchanged and no note is appended.
  expect(buffer).toBe(PASSAGE);
});

test('Answer containing the literal pattern > **Note:** → pinned behavior', async ({
  page,
}) => {
  await resetAllMocks(page);
  const { messageId } = await seedAndNavigate(page);

  await dragSelectRange(page, messageId, 0, PASSAGE.length);
  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  // Answer that echoes the reserved pattern
  const answer = '> **Note:** echoed pattern';
  const question = 'test echoed pattern';
  const mockInput = buildMockInput(PASSAGE, question);
  await setMockResponse(page, 'ask', mockInput, answer);

  await editor.ask(question);
  await page.waitForTimeout(500);

  const buffer = await editor.buffer();

  // appendNoteToBuffer adds exactly one "> **Note:** " prefix, then the answer
  // Result: the buffer contains both patterns, one as prefix, one in the content
  expect(buffer).toBe(`${PASSAGE}\n\n> **Note:** > **Note:** echoed pattern`);

  // Pin: this shows both patterns appear in the buffer.
  // Whether splitNotes (used by Rewrite) re-classifies the second one as a note
  // is covered in Task 3.4. For now, we pin that the buffer contains both strings.
  expect(buffer).toContain('> **Note:** > **Note:**');
});
