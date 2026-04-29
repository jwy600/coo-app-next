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

      // Descend to the leftmost / rightmost text node so domToSource takes
      // the TEXT_NODE branch and runs expandLeftward — picking up markdown
      // syntax (## , > , - , …) attached to the enclosing block element.
      const leftmostText = (el: Node): Text => {
        let cur: Node | null = el;
        while (cur && cur.nodeType !== Node.TEXT_NODE) {
          cur = cur.firstChild;
        }
        return (cur as Text) ?? (el as Text);
      };
      const rightmostText = (el: Node): Text => {
        let cur: Node | null = el;
        while (cur && cur.nodeType !== Node.TEXT_NODE) {
          cur = cur.lastChild;
        }
        return (cur as Text) ?? (el as Text);
      };
      const startText = leftmostText(startNode);
      const endText = rightmostText(endNode);
      const range = document.createRange();
      range.setStart(startText, Math.min(startOffset_, startText.data?.length ?? 0));
      range.setEnd(endText, Math.min(endOffset_, endText.data?.length ?? 0));

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

/**
 * Drag-select reversed (right-to-left). The focus hook reads
 * window.getSelection() on mouseup, which is direction-agnostic, so this
 * just normalizes offsets and calls dragSelectRange.
 */
export async function selectBackwards(
  page: Page,
  messageId: string,
  startOffset: number,
  endOffset: number,
): Promise<void> {
  await dragSelectRange(
    page,
    messageId,
    Math.min(startOffset, endOffset),
    Math.max(startOffset, endOffset),
  );
}

/**
 * Drag-select that crosses two messages. Does NOT wait for the editor —
 * cross-message selections should not open one.
 */
export async function dragSelectAcrossMessages(
  page: Page,
  inputs: {
    fromMessageId: string;
    fromOffset: number;
    toMessageId: string;
    toOffset: number;
  },
): Promise<void> {
  await page.evaluate(
    ({ fromMessageId, fromOffset, toMessageId, toOffset }) => {
      const fromContainer = document.querySelector(
        `[data-message-id="${fromMessageId}"]`,
      );
      const toContainer = document.querySelector(
        `[data-message-id="${toMessageId}"]`,
      );
      if (!fromContainer || !toContainer) {
        throw new Error('Cross-message: container missing');
      }
      const fromSpans = Array.from(
        fromContainer.querySelectorAll('[data-md-start]'),
      );
      const toSpans = Array.from(
        toContainer.querySelectorAll('[data-md-start]'),
      );
      let startSpan: Element | null = null;
      let endSpan: Element | null = null;
      let startInner = 0;
      let endInner = 0;
      for (const span of fromSpans) {
        const s = Number(span.getAttribute('data-md-start'));
        const e = Number(span.getAttribute('data-md-end'));
        if (s <= fromOffset && fromOffset < e) {
          startSpan = span;
          startInner = fromOffset - s;
          break;
        }
      }
      for (const span of toSpans) {
        const s = Number(span.getAttribute('data-md-start'));
        const e = Number(span.getAttribute('data-md-end'));
        if (s < toOffset && toOffset <= e) {
          endSpan = span;
          endInner = toOffset - s;
          break;
        }
      }
      if (!startSpan || !endSpan) {
        throw new Error('Cross-message: span not found');
      }
      const range = document.createRange();
      range.setStart(startSpan.firstChild || startSpan, startInner);
      range.setEnd(endSpan.firstChild || endSpan, endInner);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      toContainer.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
      );
    },
    inputs,
  );
}
