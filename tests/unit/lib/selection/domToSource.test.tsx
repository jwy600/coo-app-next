import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { domToSource } from '@/lib/selection/domToSource';

function renderMessage(text: string, messageId = 'msg-1'): HTMLElement {
  const { container } = render(
    React.createElement(
      'div',
      { 'data-message-id': messageId },
      React.createElement(MarkdownContent, { text }),
    ),
  );
  return container;
}

function findTextNode(root: HTMLElement, needle: string): { node: Text; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const idx = (node as Text).data.indexOf(needle);
    if (idx !== -1) return { node: node as Text, offset: idx };
  }
  throw new Error(`Text node containing "${needle}" not found`);
}

function makeRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
): Range {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

describe('domToSource', () => {
  describe('single paragraph', () => {
    let container: HTMLElement;
    beforeEach(() => {
      container = renderMessage('Hello world');
    });

    it('maps a selection inside a paragraph to source offsets', () => {
      const { node } = findTextNode(container, 'Hello world');
      const range = makeRange(node, 0, node, 11);
      const result = domToSource(range);
      expect(result).toEqual({ messageId: 'msg-1', start: 0, end: 11 });
    });

    it('maps a selection of a substring to source offsets', () => {
      const { node } = findTextNode(container, 'Hello world');
      const range = makeRange(node, 6, node, 11);
      const result = domToSource(range);
      expect(result).toEqual({ messageId: 'msg-1', start: 6, end: 11 });
    });

    it('returns null for a collapsed (empty) selection', () => {
      const { node } = findTextNode(container, 'Hello world');
      const range = makeRange(node, 3, node, 3);
      expect(domToSource(range)).toBeNull();
    });
  });

  describe('cross-paragraph selections', () => {
    it('maps a selection spanning two paragraphs to a contiguous range', () => {
      const source = 'First para.\n\nSecond para.';
      const container = renderMessage(source);
      const start = findTextNode(container, 'First para.');
      const end = findTextNode(container, 'Second para.');
      const range = makeRange(start.node, 0, end.node, end.node.data.length);
      const result = domToSource(range);
      expect(result).not.toBeNull();
      expect(result!.messageId).toBe('msg-1');
      expect(result!.start).toBe(0);
      expect(result!.end).toBe(source.length);
    });

    it('maps a selection across two list items', () => {
      const source = '- one\n- two';
      const container = renderMessage(source);
      const start = findTextNode(container, 'one');
      const end = findTextNode(container, 'two');
      const range = makeRange(start.node, 0, end.node, 3);
      const result = domToSource(range);
      expect(result).not.toBeNull();
      expect(result!.start).toBeLessThanOrEqual(2);
      expect(result!.end).toBeGreaterThanOrEqual(source.length - 1);
    });
  });

  describe('cross-message selections', () => {
    it('returns null when start and end are in different messages', () => {
      render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            { 'data-message-id': 'msg-A', id: 'A' },
            React.createElement(MarkdownContent, { text: 'Alpha text.' }),
          ),
          React.createElement(
            'div',
            { 'data-message-id': 'msg-B', id: 'B' },
            React.createElement(MarkdownContent, { text: 'Beta text.' }),
          ),
        ),
      );
      const a = findTextNode(document.getElementById('A')!, 'Alpha text.');
      const b = findTextNode(document.getElementById('B')!, 'Beta text.');
      const range = makeRange(a.node, 0, b.node, b.node.data.length);
      expect(domToSource(range)).toBeNull();
    });
  });

  describe('selections outside any message', () => {
    it('returns null when the range is not inside a [data-message-id] ancestor', () => {
      const { container } = render(
        React.createElement('p', null, 'just some text'),
      );
      const text = container.querySelector('p')!.firstChild as Text;
      const range = makeRange(text, 0, text, 4);
      expect(domToSource(range)).toBeNull();
    });
  });

  describe('atomic / KaTeX selections', () => {
    it('snaps a selection inside a KaTeX-rendered element outward to its source range', () => {
      const source = 'Look: $a^2$ done';
      const container = renderMessage(source);
      const katex = container.querySelector('.katex');
      expect(katex).toBeTruthy();
      const innerText = document.createTreeWalker(katex!, NodeFilter.SHOW_TEXT).nextNode();
      expect(innerText).not.toBeNull();
      const range = makeRange(innerText!, 0, innerText!, 1);
      const result = domToSource(range);
      expect(result).not.toBeNull();
      expect(result!.start).toBe(source.indexOf('$'));
      expect(result!.end).toBe(source.indexOf('$', result!.start + 1) + 1);
    });
  });

  describe('short selections', () => {
    it('accepts a single Latin character', () => {
      const container = renderMessage('Hello world');
      const { node } = findTextNode(container, 'Hello world');
      const range = makeRange(node, 1, node, 2);
      const result = domToSource(range);
      expect(result).not.toBeNull();
      expect(result!.start).toBe(1);
      expect(result!.end).toBe(2);
    });

    it('accepts a CJK single-character selection', () => {
      const container = renderMessage('你好世界');
      const { node } = findTextNode(container, '你好世界');
      const range = makeRange(node, 0, node, 1);
      const result = domToSource(range);
      expect(result).not.toBeNull();
      expect(result!.start).toBe(0);
      expect(result!.end).toBe(1);
    });
  });
});
