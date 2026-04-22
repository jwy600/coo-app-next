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
 * Parse nested inline formatting (for content inside bold/italic)
 * Only parses italic when inside bold, and vice versa, plus links
 */
function parseNestedFormatting(text: string, excludeType?: 'bold' | 'italic'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Patterns to match (excluding the parent type to avoid infinite recursion)
  const patterns: Array<{
    type: 'bold' | 'italic' | 'link';
    regex: RegExp;
  }> = [];

  if (excludeType !== 'bold') {
    patterns.push({ type: 'bold', regex: /\*\*(.+?)\*\*/ });
  }
  if (excludeType !== 'italic') {
    patterns.push({ type: 'italic', regex: /(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/ });
    patterns.push({ type: 'italic', regex: /_([^_]+?)_/ });
  }
  patterns.push({ type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/ });

  while (remaining.length > 0) {
    let earliestMatch: { type: 'bold' | 'italic' | 'link'; match: RegExpExecArray; index: number } | null = null;

    // Find the earliest match among all patterns
    for (const pattern of patterns) {
      const match = pattern.regex.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = { type: pattern.type, match, index: match.index };
      }
    }

    if (!earliestMatch) {
      // No more matches, add remaining text
      if (remaining) nodes.push(remaining);
      break;
    }

    // Add text before the match
    if (earliestMatch.index > 0) {
      nodes.push(remaining.slice(0, earliestMatch.index));
    }

    // Add the formatted element
    const { type, match } = earliestMatch;
    if (type === 'bold') {
      nodes.push(
        <strong key={keyIndex++}>
          {parseNestedFormatting(match[1], 'bold')}
        </strong>
      );
    } else if (type === 'italic') {
      nodes.push(
        <em key={keyIndex++}>
          {parseNestedFormatting(match[1], 'italic')}
        </em>
      );
    } else if (type === 'link') {
      nodes.push(
        <a
          key={keyIndex++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {match[1]}
        </a>
      );
    }

    // Continue with remaining text
    remaining = remaining.slice(earliestMatch.index + match[0].length);
  }

  return nodes;
}

/**
 * Render a single markdown segment to React element
 */
function renderSegment(segment: MarkdownSegment, index: number): React.ReactNode {
  switch (segment.type) {
    case 'text':
      return segment.content;

    case 'bold':
      // Recursively parse content for nested italic/links
      return <strong key={index}>{parseNestedFormatting(segment.content, 'bold')}</strong>;

    case 'italic':
      // Recursively parse content for nested bold/links
      return <em key={index}>{parseNestedFormatting(segment.content, 'italic')}</em>;

    case 'strikethrough':
      return <del key={index}>{segment.content}</del>;

    case 'link':
      return (
        <a
          key={index}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          {segment.content}
        </a>
      );

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
 * Render heading with inline markdown support
 */
function renderHeading(text: string, className?: string): React.ReactElement {
  const heading = parseHeading(text);

  // Fallback to paragraph if parsing fails (shouldn't happen for heading blocks)
  if (!heading) {
    return renderParagraph(text, className);
  }

  const level = heading.level as 1 | 2 | 3 | 4 | 5 | 6;
  const segments = parseInlineMarkdown(heading.text);
  const headingClass = `doc-heading ${className || ''}`;
  const content = segments.map((segment, index) => renderSegment(segment, index));

  switch (level) {
    case 1: return <h1 className={headingClass}>{content}</h1>;
    case 2: return <h2 className={headingClass}>{content}</h2>;
    case 3: return <h3 className={headingClass}>{content}</h3>;
    case 4: return <h4 className={headingClass}>{content}</h4>;
    case 5: return <h5 className={headingClass}>{content}</h5>;
    case 6: return <h6 className={headingClass}>{content}</h6>;
  }
}

/**
 * Render paragraph with inline markdown support
 */
function renderParagraph(text: string, className?: string): React.ReactElement {
  // Check if it's a blockquote (starts with "> ")
  if (text.startsWith('> ')) {
    const quoteText = text.slice(2); // Remove "> " prefix
    const segments = parseInlineMarkdown(quoteText);
    return (
      <p className={`doc-paragraph ${className || ''}`}>
        <em>{segments.map((segment, index) => renderSegment(segment, index))}</em>
      </p>
    );
  }

  // Legacy support: handle headings in paragraph blocks (for backward compatibility)
  const heading = parseHeading(text);
  if (heading) {
    return renderHeading(text, className);
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
    markerNumber?: number;
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
      markerNumber: ordered ? Number.parseInt(item.marker, 10) : undefined,
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
            <li key={index} value={node.ordered ? item.markerNumber : undefined}>
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
 * Renders block text with appropriate formatting based on type.
 *
 * Memoized: during streaming every new token triggers a store update that
 * ripples down the tree. Props here are all primitives, so the default
 * shallow comparator is sufficient to skip re-parsing and re-rendering
 * every finished block on every token.
 */
export const BlockContent = React.memo(function BlockContent({
  text,
  type,
  className = '',
}: BlockContentProps) {
  if (!text) {
    return null;
  }

  switch (type) {
    case 'heading':
      return renderHeading(text, className);

    case 'paragraph':
      return renderParagraph(text, className);

    case 'list':
      return renderList(text, className);

    case 'code':
      return renderCode(text, className);

    default:
      return <div className={className}>{text}</div>;
  }
});
