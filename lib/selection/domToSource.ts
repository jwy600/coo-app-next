/**
 * Maps a DOM `Range` to source-markdown character offsets, using the
 * `data-md-start` / `data-md-end` attributes attached by `remarkSourcePositions`
 * and the text-wrapping spans added by `rehypeWrapText`.
 *
 * Returns `null` when:
 *  - the range is not inside a `[data-message-id]` ancestor,
 *  - the start and end live in different messages,
 *  - the range is collapsed or shorter than one word (Latin) / one
 *    character (CJK / non-Latin),
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

  if (!meetsMinimumLength(end - start, range.toString())) return null;

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

const NON_LATIN_RE = /[^\s\x00-\x7F]/u;

function meetsMinimumLength(snappedSize: number, rawText: string): boolean {
  if (snappedSize <= 0) return false;
  if (snappedSize >= 2) return true;
  return NON_LATIN_RE.test(rawText);
}
