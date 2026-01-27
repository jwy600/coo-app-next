/**
 * Block type detection and parsing utilities
 * Works with parsed blocks from lib/state/parser.ts
 */

import { BlockType } from '@/types/block';
import { hasHeading } from '@/lib/state/heading';

// Re-export for backwards compatibility
export { hasHeading };

export interface ListItem {
  marker: string;
  content: string;
  indent: number;
}

/**
 * Detect if text is a list (bulleted or numbered)
 * Matches lines starting with: -, *, +, or 1., 2., etc.
 */
export function isListText(text: string): boolean {
  if (!text) return false;
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return false;

  // Check if at least one line starts with a list marker
  return lines.some((line) => /^(\s*)([-*+]|\d+\.)\s+/.test(line));
}

/**
 * Detect if text is a code block (with fences)
 */
export function isCodeBlock(text: string): boolean {
  if (!text) return false;
  return /^\s*(```|~~~)/.test(text);
}


/**
 * Extract code language from fence (e.g., ```typescript -> "typescript")
 */
export function getCodeLanguage(text: string): string | null {
  if (!text) return null;

  const match = text.match(/^\s*```(\w+)/);
  return match ? match[1] : null;
}

/**
 * Extract code content without fences
 */
export function extractCodeContent(text: string): string {
  if (!text) return '';

  // Remove opening and closing fences
  const lines = text.split('\n');
  const filtered = lines.filter((line, index) => {
    // Skip first line if it's a fence
    if (index === 0 && /^\s*(```|~~~)/.test(line)) return false;
    // Skip last line if it's a fence
    if (index === lines.length - 1 && /^\s*(```|~~~)/.test(line)) return false;
    return true;
  });

  return filtered.join('\n').trim();
}

/**
 * Detect block type from content
 * Returns the primary block type
 */
export function detectBlockType(text: string): BlockType {
  if (!text) return 'paragraph';

  if (isCodeBlock(text)) return 'code';
  if (isListText(text)) return 'list';
  if (hasHeading(text)) return 'heading';

  return 'paragraph';
}

/**
 * Split multi-line text into individual list items
 * Returns array of parsed list items with markers and content
 */
export function parseListItems(text: string): ListItem[] {
  if (!text) return [];

  const lines = text.split('\n');
  const items: ListItem[] = [];

  lines.forEach((line) => {
    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (match) {
      const [, indent, marker, content] = match;
      let normalizedContent = content.trim();

      if (isOrderedListItem(marker)) {
        const escapedMarker = marker.replace('.', '\\.');
        const repeatedPrefix = new RegExp(`^${escapedMarker}\\s+`);
        normalizedContent = normalizedContent.replace(repeatedPrefix, '');
      }

      items.push({
        marker,
        content: normalizedContent,
        indent: indent.length,
      });
    }
  });

  return items;
}

/**
 * Extract heading level and text
 * Returns null if not a heading
 */
export function parseHeading(text: string): { level: number; text: string } | null {
  if (!text) return null;

  const match = text.trim().match(/^(#{1,6})\s+(.*)$/);
  if (!match) return null;

  const [, hashes, content] = match;
  return {
    level: Math.min(6, hashes.length),
    text: content.trim(),
  };
}

/**
 * Get HTML heading tag from level
 */
export function getHeadingTag(level: number): string {
  const clamped = Math.max(1, Math.min(6, level));
  return `h${clamped}`;
}

/**
 * Check if line is blank or whitespace only
 */
export function isBlankLine(line: string): boolean {
  return line.trim() === '';
}

/**
 * Normalize indentation in text block
 * Removes common leading whitespace
 */
export function normalizeIndentation(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const nonEmptyLines = lines.filter((line) => line.trim());

  if (nonEmptyLines.length === 0) return text;

  // Find minimum indentation
  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );

  // Remove common indentation
  return lines
    .map((line) => (line.trim() ? line.slice(minIndent) : line))
    .join('\n');
}

/**
 * Check if a list item is ordered (numbered)
 */
export function isOrderedListItem(marker: string): boolean {
  return /^\d+\.$/.test(marker);
}

/**
 * Check if a list item is unordered (bulleted)
 */
export function isUnorderedListItem(marker: string): boolean {
  return /^[-*+]$/.test(marker);
}

/**
 * Count total blocks of each type in an array
 */
export function countBlockTypes(blocks: { type: BlockType }[]): Record<BlockType, number> {
  const counts: Record<BlockType, number> = {
    paragraph: 0,
    list: 0,
    code: 0,
    heading: 0,
  };

  blocks.forEach((block) => {
    counts[block.type]++;
  });

  return counts;
}
