/**
 * Block content renderer component
 * Handles rendering of different block types with markdown support
 */

'use client';

import React from 'react';
import { BlockType } from '@/types/block';
import { parseInlineMarkdown, MarkdownSegment } from '@/lib/rendering/markdown';
import { parseListItems, parseHeading, extractCodeContent, getCodeLanguage } from '@/lib/rendering/blocks';
import { Math } from './Math';

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
      return <Math key={index} tex={segment.content} display={false} />;

    case 'block-math':
      return <Math key={index} tex={segment.content} display={true} />;

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

  return (
    <p className={`doc-paragraph ${className || ''}`}>
      {segments.map((segment, index) => renderSegment(segment, index))}
    </p>
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

  // Determine if ordered or unordered based on first item
  const isOrdered = /^\d+\.$/.test(items[0].marker);
  const ListTag = isOrdered ? 'ol' : 'ul';

  return (
    <ListTag className={`doc-list ${className || ''}`}>
      {items.map((item, index) => {
        const segments = parseInlineMarkdown(item.content);
        return (
          <li key={index} style={{ marginLeft: `${item.indent * 0.5}rem` }}>
            {segments.map((segment, segIndex) => renderSegment(segment, segIndex))}
          </li>
        );
      })}
    </ListTag>
  );
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
