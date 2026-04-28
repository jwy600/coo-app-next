'use client';

import React from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkSourcePositions } from '@/lib/selection/remarkSourcePositions';
import { rehypeWrapText } from '@/lib/selection/rehypeWrapText';
import { sanitizeHref } from '@/lib/utils/safeHref';

export interface MarkdownContentProps {
  text: string;
  className?: string;
}

/**
 * Returns true when the blockquote's first paragraph begins with a
 * <strong>Note:</strong> marker — i.e. it was written by closeEditor's
 * note serialization, not by the user as a generic blockquote.
 */
function isNoteBlockquote(children: React.ReactNode): boolean {
  const arr = React.Children.toArray(children);
  for (const child of arr) {
    if (typeof child === 'string') {
      if (child.trim() === '') continue;
      return false;
    }
    if (!React.isValidElement(child)) continue;
    if (child.type !== 'p') return false;
    const inner = React.Children.toArray(
      (child.props as { children?: React.ReactNode }).children,
    );
    const first = inner.find(
      (c) => !(typeof c === 'string' && c.trim() === ''),
    );
    if (!React.isValidElement(first) || first.type !== 'strong') return false;
    const strongText = React.Children.toArray(
      (first.props as { children?: React.ReactNode }).children,
    )
      .filter((c) => typeof c === 'string')
      .join('')
      .trim();
    return strongText === 'Note:';
  }
  return false;
}

const components: Components = {
  p: ({ children, ...props }) => (
    <p className="doc-paragraph" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="doc-heading" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="doc-heading" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="doc-heading" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="doc-heading" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="doc-heading" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="doc-heading" {...props}>
      {children}
    </h6>
  ),
  ul: ({ children, ...props }) => (
    <ul className="doc-list" style={{ listStyleType: 'disc' }} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="doc-list" style={{ listStyleType: 'decimal' }} {...props}>
      {children}
    </ol>
  ),
  pre: ({ children, ...props }) => (
    <pre className="doc-code" {...props}>
      {children}
    </pre>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={sanitizeHref(href)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline dark:text-blue-400"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => {
    const className = isNoteBlockquote(children)
      ? 'doc-blockquote doc-blockquote--note'
      : 'doc-blockquote';
    return (
      <blockquote className={className} {...props}>
        {children}
      </blockquote>
    );
  },
  code: ({ children, ...props }) => (
    <code className="doc-code-inline" {...props}>
      {children}
    </code>
  ),
};

/**
 * Convert LaTeX-style math delimiters to remark-math's expected $...$ /
 * $$...$$ form, while recording the original character offsets so the
 * source-position plugins can translate parsed-text offsets back to the
 * user-visible `message.text`. Without this translation, the lengths of
 * the inline forms differ (`\(x\)` is 4 chars; `$x$` is 2) and any
 * selection past a math expression would slice the wrong substring.
 */
interface NormalizedSource {
  normalized: string;
  /** Maps a position in `normalized` back to a position in the original. */
  translate: (offset: number) => number;
}

function normalizeMathDelimiters(original: string): NormalizedSource {
  // Each entry records one delimiter substitution: how many chars wide it
  // was originally vs how wide it became after replacement, and where the
  // replacement starts in the normalized text.
  const spans: Array<{
    origStart: number;
    origEnd: number;
    normStart: number;
    normEnd: number;
  }> = [];
  let normalized = '';
  let cursor = 0;
  const re = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(original)) !== null) {
    normalized += original.slice(cursor, m.index);
    const isInline = m[1] !== undefined;
    const body = (isInline ? m[1] : m[2]) ?? '';
    const replacement = isInline ? `$${body}$` : `$$${body}$$`;
    const origStart = m.index;
    const origEnd = m.index + m[0].length;
    const normStart = normalized.length;
    const normEnd = normStart + replacement.length;
    spans.push({ origStart, origEnd, normStart, normEnd });
    normalized += replacement;
    cursor = origEnd;
  }
  normalized += original.slice(cursor);

  const translate = (normPos: number): number => {
    let shift = 0;
    for (const s of spans) {
      if (normPos < s.normStart) break;
      if (normPos === s.normStart) return s.origStart;
      if (normPos === s.normEnd) return s.origEnd;
      if (normPos < s.normEnd) {
        // Inside a math body — rehypeWrapText doesn't tag positions here,
        // so this is unreachable in practice. Fall back to clamping.
        return s.origStart;
      }
      shift += (s.origEnd - s.origStart) - (s.normEnd - s.normStart);
    }
    return normPos + shift;
  };

  return { normalized, translate };
}

export const MarkdownContent = React.memo(function MarkdownContent({
  text,
  className = '',
}: MarkdownContentProps) {
  const source = React.useMemo(() => normalizeMathDelimiters(text), [text]);

  const remarkPlugins = React.useMemo<Options['remarkPlugins']>(
    () => [
      remarkGfm,
      remarkMath,
      [remarkSourcePositions, { translate: source.translate }],
    ],
    [source.translate],
  );
  const rehypePlugins = React.useMemo<Options['rehypePlugins']>(
    () => [[rehypeWrapText, { translate: source.translate }], rehypeKatex],
    [source.translate],
  );

  if (!text) return null;

  const wrapperClass = className
    ? `markdown-content ${className}`
    : 'markdown-content';

  return (
    <div className={wrapperClass}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {source.normalized}
      </ReactMarkdown>
    </div>
  );
});
