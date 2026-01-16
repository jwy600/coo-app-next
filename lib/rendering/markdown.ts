/**
 * Markdown parsing utilities for inline content
 * Migrated from legacy/app.js appendInlineSegments function
 */

export interface MarkdownSegment {
  type: 'text' | 'bold' | 'inline-math' | 'block-math' | 'break';
  content: string;
}

export interface MathExpression {
  type: 'inline' | 'block';
  expression: string;
  position: number;
  length: number;
}

/**
 * Parse inline markdown syntax (bold, math) and return structured segments
 * Returns array of typed segments that can be rendered to React elements
 */
export function parseInlineMarkdown(text: string): MarkdownSegment[] {
  if (!text) return [];

  const segments: MarkdownSegment[] = [];

  // First, split by math expressions (inline and block)
  // Using dotAll flag for multiline math expressions
  const mathRegex = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    // Process text before math
    const before = text.slice(lastIndex, match.index);
    if (before) {
      segments.push(...parseBoldAndBreaks(before));
    }

    // Process math
    const raw = match[0];
    const isBlock = raw.startsWith('\\[');
    const tex = raw.slice(2, -2).trim();

    segments.push({
      type: isBlock ? 'block-math' : 'inline-math',
      content: tex,
    });

    lastIndex = match.index + raw.length;
  }

  // Process remaining text
  if (lastIndex < text.length) {
    segments.push(...parseBoldAndBreaks(text.slice(lastIndex)));
  }

  return segments;
}

/**
 * Parse bold text and line breaks from a text segment
 * Helper function for parseInlineMarkdown
 */
function parseBoldAndBreaks(text: string): MarkdownSegment[] {
  if (!text) return [];

  const segments: MarkdownSegment[] = [];
  const parts = text.split('\n');

  parts.forEach((part, index) => {
    // Parse bold in this part
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = boldRegex.exec(part)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        const textContent = part.slice(lastIndex, match.index);
        if (textContent) {
          segments.push({
            type: 'text',
            content: textContent,
          });
        }
      }

      // Add bold segment
      segments.push({
        type: 'bold',
        content: match[1],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < part.length) {
      const textContent = part.slice(lastIndex);
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
      }
    }

    // Add line break if not the last part
    if (index < parts.length - 1) {
      segments.push({
        type: 'break',
        content: '',
      });
    }
  });

  return segments;
}

/**
 * Detect if text contains LaTeX math notation
 */
export function hasMath(text: string): boolean {
  return /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/.test(text);
}

/**
 * Extract all math expressions from text with their positions
 */
export function extractMathExpressions(text: string): MathExpression[] {
  const expressions: MathExpression[] = [];
  const regex = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const isBlock = raw.startsWith('\\[');
    const tex = raw.slice(2, -2).trim();

    expressions.push({
      type: isBlock ? 'block' : 'inline',
      expression: tex,
      position: match.index,
      length: raw.length,
    });
  }

  return expressions;
}

/**
 * Strip markdown formatting and return plain text
 * Useful for accessibility and search
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => tex) // Block math
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => tex) // Inline math
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\n/g, ' '); // Line breaks
}
