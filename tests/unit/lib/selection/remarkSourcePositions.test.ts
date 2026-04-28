import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { remarkSourcePositions } from '@/lib/selection/remarkSourcePositions';
import { MarkdownContent } from '@/components/content/MarkdownContent';

function renderDom(source: string): HTMLElement {
  const { container } = render(React.createElement(MarkdownContent, { text: source }));
  return container;
}

describe('remarkSourcePositions', () => {
  describe('mdast transformation', () => {
    it('attaches dataMdStart and dataMdEnd to every node with a position', () => {
      const source = '# Heading\n\nA paragraph with **bold** text.';
      const tree = unified().use(remarkParse).parse(source) as Root;
      unified().use(remarkSourcePositions).runSync(tree);

      const visited: Array<{ type: string; start: string; end: string }> = [];
      visit(tree, (node) => {
        const props = (node.data as { hProperties?: Record<string, string> } | undefined)
          ?.hProperties;
        if (props?.dataMdStart !== undefined) {
          visited.push({
            type: node.type,
            start: props.dataMdStart,
            end: props.dataMdEnd as string,
          });
        }
      });

      expect(visited.find((n) => n.type === 'heading')).toMatchObject({
        start: '0',
        end: '9',
      });
      expect(visited.find((n) => n.type === 'paragraph')).toMatchObject({
        start: '11',
      });
      expect(visited.find((n) => n.type === 'strong')).toBeDefined();
    });

    it('uses character offsets matching the original source', () => {
      const source = 'Hello world';
      const tree = unified().use(remarkParse).parse(source) as Root;
      unified().use(remarkSourcePositions).runSync(tree);

      const paragraph = tree.children[0];
      const props = (paragraph.data as { hProperties?: Record<string, string> } | undefined)
        ?.hProperties;
      expect(props?.dataMdStart).toBe('0');
      expect(props?.dataMdEnd).toBe(String(source.length));
    });

    it('does not throw on nodes without position info', () => {
      const tree: Root = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'no position' }],
          },
        ],
      };
      expect(() => unified().use(remarkSourcePositions).runSync(tree)).not.toThrow();
    });
  });

  describe('rendered DOM (wired into MarkdownContent)', () => {
    it('emits data-md-start and data-md-end on a paragraph', () => {
      const container = renderDom('Hello world');
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
      expect(p!.getAttribute('data-md-start')).toBe('0');
      expect(p!.getAttribute('data-md-end')).toBe('11');
    });

    it('emits attributes on headings, paragraphs, and lists', () => {
      const source = '# Title\n\nBody.\n\n- one\n- two';
      const container = renderDom(source);
      const h1 = container.querySelector('h1');
      expect(h1!.getAttribute('data-md-start')).toBe('0');
      expect(h1!.getAttribute('data-md-end')).toBe('7');
      const p = container.querySelector('p');
      expect(p!.getAttribute('data-md-start')).toBe('9');
      expect(p!.getAttribute('data-md-end')).toBe('14');
      const ul = container.querySelector('ul');
      expect(ul!.getAttribute('data-md-start')).toBe('16');
      const firstLi = container.querySelector('li');
      expect(firstLi!.getAttribute('data-md-start')).toBe('16');
    });

    it('emits attributes on inline elements (strong, em, link)', () => {
      const container = renderDom(
        'A **bold** and *italic* and [link](https://example.com).',
      );
      const strong = container.querySelector('strong');
      expect(strong!.getAttribute('data-md-start')).toBe('2');
      expect(strong!.getAttribute('data-md-end')).toBe('10');
      const em = container.querySelector('em');
      expect(em!.getAttribute('data-md-start')).toBe('15');
      expect(em!.getAttribute('data-md-end')).toBe('23');
      const a = container.querySelector('a');
      expect(a!.getAttribute('data-md-start')).toBe('28');
    });

    it('emits attributes on GFM strikethrough', () => {
      const container = renderDom('~~gone~~');
      const del = container.querySelector('del');
      expect(del!.getAttribute('data-md-start')).toBe('0');
      expect(del!.getAttribute('data-md-end')).toBe('8');
    });

    it('emits attributes on fenced code blocks (on the <code> element)', () => {
      const container = renderDom('```\nx\n```');
      const code = container.querySelector('pre code');
      expect(code!.getAttribute('data-md-start')).toBe('0');
      expect(code!.getAttribute('data-md-end')).toBe('9');
    });
  });
});
