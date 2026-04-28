'use client';

import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
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

const remarkPlugins = [remarkGfm, remarkMath, remarkSourcePositions];
const rehypePlugins = [rehypeWrapText, rehypeKatex];

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
  blockquote: ({ children, ...props }) => (
    <blockquote className="doc-paragraph" {...props}>
      <em>{children}</em>
    </blockquote>
  ),
};

/**
 * Convert LaTeX-style math delimiters to remark-math's expected $...$ / $$...$$.
 * The assistant emits \(...\) inline and \[...\] block; remark-math doesn't recognize those.
 */
function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, body) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body) => `$${body}$`);
}

export const MarkdownContent = React.memo(function MarkdownContent({
  text,
  className = '',
}: MarkdownContentProps) {
  if (!text) {
    return null;
  }

  const normalized = normalizeMathDelimiters(text);

  return (
    <div className={className || undefined}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});
