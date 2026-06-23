/**
 * Maps a DOM `Range` to source-markdown character offsets, using the
 * `data-md-start` / `data-md-end` attributes attached by `remarkSourcePositions`
 * and the text-wrapping spans added by `rehypeWrapText`.
 *
 * Returns `null` when:
 *  - the range is not inside a `[data-message-id]` ancestor,
 *  - the start and end live in different messages,
 *  - the range is collapsed,
 *  - either endpoint cannot be mapped to a source offset.
 */

export interface SourceRange {
  messageId: string;
  start: number;
  end: number;
}

type Endpoint = 'start' | 'end';

export function domToSource(range: Range): SourceRange | null {
  const startMessage = closestMessageId(range.startContainer);
  const endMessage = closestMessageId(range.endContainer);
  if (!startMessage || startMessage !== endMessage) return null;

  const startOffset = endpointToOffset(range.startContainer, range.startOffset, 'start');
  const endOffset = endpointToOffset(range.endContainer, range.endOffset, 'end');
  if (startOffset === null || endOffset === null) return null;

  const start = Math.min(startOffset, endOffset);
  const end = Math.max(startOffset, endOffset);
  if (end <= start) return null;

  return { messageId: startMessage, start, end };
}

function closestMessageId(node: Node): string | null {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el) {
    const id = el.getAttribute('data-message-id');
    if (id) return id;
    el = el.parentElement;
  }
  return null;
}

function endpointToOffset(node: Node, offset: number, kind: Endpoint): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent) return null;

    if (parent.getAttribute('data-md-text') === 'true') {
      const base = readStart(parent);
      if (base === null) return null;
      const clamped = Math.max(0, Math.min(offset, text.data.length));
      // When a selection starts at offset 0 of a text node, the browser
      // snaps it past any leading markdown marker rendered as a CSS
      // pseudo-element (the `- ` of a list item, the `# ` of a heading,
      // the `**` of bold, etc.). Walk up while we're the leftmost child
      // and pick the smallest enclosing data-md-start so the buffer
      // includes the marker syntax.
      if (kind === 'start' && offset === 0) {
        return expandLeftward(parent, base);
      }
      // Mirror case: when a selection ends at the last offset of a text
      // node, the browser snaps it before any trailing markdown marker
      // (the closing `**`, `_`, `` ` `` of emphasis/code). Without this,
      // the trailing marker is left outside the editor's buffer (e.g. a
      // dangling `**`). Walk up while we're the rightmost child and pick
      // the largest enclosing data-md-end so the buffer includes it.
      if (kind === 'end' && offset === text.data.length) {
        return expandRightward(parent, base + clamped);
      }
      return base + clamped;
    }

    const ancestor = closestMd(parent);
    return ancestor ? boundaryOf(ancestor, kind) : null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const ancestor = closestMd(el);
    return ancestor ? boundaryOf(ancestor, kind) : null;
  }

  return null;
}

function expandLeftward(textSpan: Element, currentStart: number): number {
  let candidate = currentStart;
  let el: Element = textSpan;
  while (el.parentElement && el.parentElement.firstChild === el) {
    const parent = el.parentElement;
    const start = readStart(parent);
    if (start !== null && start < candidate) candidate = start;
    el = parent;
  }
  return candidate;
}

function expandRightward(textSpan: Element, currentEnd: number): number {
  let candidate = currentEnd;
  let el: Element = textSpan;
  while (el.parentElement && el.parentElement.lastChild === el) {
    const parent = el.parentElement;
    const end = readEnd(parent);
    if (end !== null && end > candidate) candidate = end;
    el = parent;
  }
  return candidate;
}

function closestMd(el: Element | null): Element | null {
  while (el) {
    if (el.hasAttribute('data-md-start') && el.hasAttribute('data-md-end')) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function readStart(el: Element): number | null {
  const v = el.getAttribute('data-md-start');
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function readEnd(el: Element): number | null {
  const v = el.getAttribute('data-md-end');
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function boundaryOf(el: Element, kind: Endpoint): number | null {
  return kind === 'start' ? readStart(el) : readEnd(el);
}
