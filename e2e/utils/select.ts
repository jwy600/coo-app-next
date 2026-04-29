/**
 * Drag-select helper for focus mode tests.
 *
 * Simulates a user drag-selecting text from character offset start to end
 * within a message element identified by data-testid or data-message-id.
 */

import { Page } from '@playwright/test';

export async function dragSelectRange(
  page: Page,
  messageId: string,
  startOffset: number,
  endOffset: number,
): Promise<void> {
  // Find all span elements within the message that have data-md-start and data-md-end
  await page.evaluate(
    ({ messageId, startOffset, endOffset }) => {
      const messageEl = document.querySelector(
        `[data-message-id="${messageId}"], [data-testid="assistant-message-${messageId}"]`,
      );
      if (!messageEl) {
        throw new Error(`Message element not found for id: ${messageId}`);
      }

      const spans = messageEl.querySelectorAll('[data-md-start]');
      let startNode: Node | null = null;
      let endNode: Node | null = null;
      let startOffset_ = 0;
      let endOffset_ = 0;

      for (const span of spans) {
        const mdStart = parseInt(span.getAttribute('data-md-start') || '0');
        const mdEnd = parseInt(span.getAttribute('data-md-end') || '0');

        if (mdStart <= startOffset && startOffset < mdEnd) {
          startNode = span;
          startOffset_ = startOffset - mdStart;
        }

        if (mdStart < endOffset && endOffset <= mdEnd) {
          endNode = span;
          endOffset_ = endOffset - mdStart;
        }
      }

      if (!startNode || !endNode) {
        throw new Error(
          `Could not find spans for range ${startOffset}-${endOffset}`,
        );
      }

      const range = document.createRange();
      range.setStart(startNode.firstChild || startNode, startOffset_);
      range.setEnd(endNode.firstChild || endNode, endOffset_);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Dispatch mouseup to trigger the selection handler
      messageEl.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
      );
    },
    { messageId, startOffset, endOffset },
  );

  // Give the selection handler time to open the editor
  await page.waitForTimeout(100);
}
