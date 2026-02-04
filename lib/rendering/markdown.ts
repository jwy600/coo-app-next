/**
 * Markdown parsing utilities for inline content
 * Migrated from legacy/app.js appendInlineSegments function
 */

export interface MarkdownSegment {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'link' | 'inline-math' | 'block-math' | 'break';
  content: string;
  /** URL for link segments */
  href?: string;
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
      segments.push(...parseInlineFormatting(before));
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
    segments.push(...parseInlineFormatting(text.slice(lastIndex)));
  }

  return segments;
}

/**
 * Token for inline markdown parsing
 */
interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'link';
  content: string;
  href?: string;
  start: number;
  end: number;
}

/**
 * Parse inline formatting (bold, italic, links) from a text segment
 * Helper function for parseInlineMarkdown
 *
 * Parsing order matters:
 * 1. Links [text](url) - parsed first to avoid conflicts with brackets
 * 2. Bold **text** - parsed before italic to avoid ** matching as two *
 * 3. Italic *text* or _text_
 */
function parseInlineFormatting(text: string): MarkdownSegment[] {
  if (!text) return [];

  const segments: MarkdownSegment[] = [];
  const parts = text.split('\n');

  parts.forEach((part, partIndex) => {
    // Collect all tokens with their positions
    const tokens: InlineToken[] = [];

    // Find links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(part)) !== null) {
      tokens.push({
        type: 'link',
        content: match[1],
        href: match[2],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Find bold: **text**
    const boldRegex = /\*\*(.+?)\*\*/g;
    while ((match = boldRegex.exec(part)) !== null) {
      // Check if this overlaps with existing tokens
      const overlaps = tokens.some(
        (t) => match!.index < t.end && match!.index + match![0].length > t.start
      );
      if (!overlaps) {
        tokens.push({
          type: 'bold',
          content: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Find strikethrough: ~~text~~
    const strikethroughRegex = /~~(.+?)~~/g;
    while ((match = strikethroughRegex.exec(part)) !== null) {
      const overlaps = tokens.some(
        (t) => match!.index < t.end && match!.index + match![0].length > t.start
      );
      if (!overlaps) {
        tokens.push({
          type: 'strikethrough',
          content: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Find italic: *text* (single asterisk, not followed/preceded by another asterisk)
    // Use negative lookbehind/lookahead to avoid matching ** as italic
    const italicAsteriskRegex = /(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g;
    while ((match = italicAsteriskRegex.exec(part)) !== null) {
      const overlaps = tokens.some(
        (t) => match!.index < t.end && match!.index + match![0].length > t.start
      );
      if (!overlaps) {
        tokens.push({
          type: 'italic',
          content: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Find italic: _text_ (underscores)
    const italicUnderscoreRegex = /_([^_]+?)_/g;
    while ((match = italicUnderscoreRegex.exec(part)) !== null) {
      const overlaps = tokens.some(
        (t) => match!.index < t.end && match!.index + match![0].length > t.start
      );
      if (!overlaps) {
        tokens.push({
          type: 'italic',
          content: match[1],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Build segments from tokens
    let lastIndex = 0;

    tokens.forEach((token) => {
      // Add text before this token
      if (token.start > lastIndex) {
        const textContent = part.slice(lastIndex, token.start);
        if (textContent) {
          segments.push({ type: 'text', content: textContent });
        }
      }

      // Add the token as a segment
      if (token.type === 'link') {
        segments.push({
          type: 'link',
          content: token.content,
          href: token.href,
        });
      } else {
        segments.push({
          type: token.type,
          content: token.content,
        });
      }

      lastIndex = token.end;
    });

    // Add remaining text
    if (lastIndex < part.length) {
      const textContent = part.slice(lastIndex);
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // Add line break if not the last part
    if (partIndex < parts.length - 1) {
      segments.push({ type: 'break', content: '' });
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
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links - keep text, remove URL
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/~~(.*?)~~/g, '$1') // Strikethrough
    .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '$1') // Italic (asterisk)
    .replace(/_([^_]+?)_/g, '$1') // Italic (underscore)
    .replace(/\n/g, ' '); // Line breaks
}
