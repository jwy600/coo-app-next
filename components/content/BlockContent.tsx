/**
 * Block content renderer component
 * Handles rendering of different block types with markdown support
 */

'use client';

import React from 'react';
import { BlockType } from '@/types/block';
import { parseInlineMarkdown, MarkdownSegment } from '@/lib/rendering/markdown';
import {
  parseListItems,
  parseHeading,
  extractCodeContent,
  getCodeLanguage,
  isOrderedListItem,
} from '@/lib/rendering/blocks';
import { Math as MathComponent } from './Math';

export interface BlockContentProps {
  text: string;
  type: BlockType;
  className?: string;
}

/**
 * Render a single markdown segment to React element
 */
function renderSegment(segment: MarkdownSegment, index: number): React.ReactNode {
  switch (segment.type) {
    case 'text':
      return segment.content;

    case 'bold':
      return <strong key={index}>{segment.content}</strong>;

    case 'inline-math':
      return <MathComponent key={index} tex={segment.content} display={false} />;

    case 'block-math':
      return <MathComponent key={index} tex={segment.content} display={true} />;

    case 'break':
      return <br key={index} />;

    default:
      return null;
  }
}

/**
 * Render paragraph with inline markdown support
 */
function renderParagraph(text: string, className?: string): React.ReactElement {
  // Check if it's a heading
  const heading = parseHeading(text);
  if (heading) {
    const level = heading.level as 1 | 2 | 3 | 4 | 5 | 6;
    const segments = parseInlineMarkdown(heading.text);
    const headingClass = `doc-paragraph doc-heading ${className || ''}`;

    // Render appropriate heading based on level
    if (level === 1) return <h1 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h1>;
    if (level === 2) return <h2 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h2>;
    if (level === 3) return <h3 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h3>;
    if (level === 4) return <h4 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h4>;
    if (level === 5) return <h5 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h5>;
    return <h6 className={headingClass}>{segments.map((segment, index) => renderSegment(segment, index))}</h6>;
  }

  // Regular paragraph
  const segments = parseInlineMarkdown(text);

  // Check if paragraph contains display math (which renders as div)
  // If so, use div instead of p to avoid invalid HTML
  const hasDisplayMath = segments.some(
    (seg) => seg.type === 'block-math'
  );

  const Element = hasDisplayMath ? 'div' : 'p';

  return (
    <Element className={`doc-paragraph ${className || ''}`}>
      {segments.map((segment, index) => renderSegment(segment, index))}
    </Element>
  );
}

/**
 * Render list with proper markers
 */
function renderList(text: string, className?: string): React.ReactElement {
  const items = parseListItems(text);

  if (items.length === 0) {
    return <div className={className}>{text}</div>;
  }

  type ListItemNode = {
    content: MarkdownSegment[];
    children: ListNode[];
  };

  type ListNode = {
    ordered: boolean;
    items: ListItemNode[];
  };

  const getLevel = (indent: number) => globalThis.Math.floor(indent / 2);
  const listRoots: ListNode[] = [];
  const listStack: ListNode[] = [];
  const itemStack: ListItemNode[] = [];

  items.forEach((item) => {
    const level = getLevel(item.indent);
    const ordered = isOrderedListItem(item.marker);

    while (listStack.length > level + 1) {
      listStack.pop();
      itemStack.pop();
    }

    const currentList = listStack[level];
    const needsNewList = !currentList || currentList.ordered !== ordered;
    let targetList = currentList;

    if (needsNewList) {
      targetList = { ordered, items: [] };

      if (level === 0) {
        listRoots.push(targetList);
      } else {
        const parentItem = itemStack[level - 1];
        if (parentItem) {
          parentItem.children.push(targetList);
        } else {
          listRoots.push(targetList);
        }
      }

      listStack[level] = targetList;
      listStack.length = level + 1;
      itemStack.length = level;
    }

    const node: ListItemNode = {
      content: parseInlineMarkdown(item.content),
      children: [],
    };

    targetList.items.push(node);
    itemStack[level] = node;
  });

  const renderListNodes = (nodes: ListNode[]): React.ReactNode => {
    return nodes.map((node, nodeIndex) => {
      const ListTag = node.ordered ? 'ol' : 'ul';

      return (
        <ListTag
          key={nodeIndex}
          className={`doc-list ${className || ''}`}
          style={{ listStyleType: node.ordered ? 'decimal' : 'disc' }}
        >
          {node.items.map((item, index) => (
            <li key={index}>
              {item.content.map((segment, segIndex) => renderSegment(segment, segIndex))}
              {item.children.length > 0 && renderListNodes(item.children)}
            </li>
          ))}
        </ListTag>
      );
    });
  };

  return <>{renderListNodes(listRoots)}</>;
}

/**
 * Render code block with optional syntax highlighting
 */
function renderCode(text: string, className?: string): React.ReactElement {
  const language = getCodeLanguage(text);
  const content = extractCodeContent(text);

  return (
    <pre className={`doc-code ${className || ''}`}>
      <code className={language ? `language-${language}` : ''}>
        {content}
      </code>
    </pre>
  );
}

/**
 * Main BlockContent component
 * Renders block text with appropriate formatting based on type
 */
export function BlockContent({ text, type, className = '' }: BlockContentProps) {
  if (!text) {
    return null;
  }

  switch (type) {
    case 'paragraph':
      return renderParagraph(text, className);

    case 'list':
      return renderList(text, className);

    case 'code':
      return renderCode(text, className);

    default:
      return <div className={className}>{text}</div>;
  }
}
