import { Block } from '@/types/block';

/**
 * Section-related pure functions
 *
 * A "section" is a heading plus all content blocks until the next heading
 * of the same or higher level (hierarchy-aware).
 */

/**
 * Get heading level from block text (counts # characters)
 * Returns 0 if not a valid heading
 */
export const getHeadingLevel = (text: string): number => {
  const match = text.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
};

/**
 * Internal helper: find section end index given a starting index
 * Section ends at next heading of same or higher level (hierarchy-aware)
 */
const findSectionEndIndex = (
  blocks: Block[],
  headingIndex: number,
  headingLevel: number
): number => {
  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'heading') {
      const level = getHeadingLevel(block.text);
      if (level <= headingLevel) {
        // Found a heading of same or higher level - section ends before it
        return i - 1;
      }
    }
  }
  // No same/higher level heading found - section goes to end
  return blocks.length - 1;
};

/**
 * Get section range for a heading block
 * Section ends at next heading of same or higher level (hierarchy-aware)
 *
 * @param blocks - Array of blocks
 * @param headingId - ID of the heading block
 * @returns Start and end indices (inclusive), or null if heading not found
 */
export const getSectionRange = (
  blocks: Block[],
  headingId: string
): { startIndex: number; endIndex: number } | null => {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return null;

  const headingLevel = getHeadingLevel(blocks[headingIndex].text);
  const endIndex = findSectionEndIndex(blocks, headingIndex, headingLevel);

  return { startIndex: headingIndex, endIndex };
};

/**
 * Get block IDs that belong to a section (heading + all content until next same/higher-level heading)
 * This is hierarchy-aware: an H2 section includes nested H3s.
 *
 * @param blocks - Array of blocks
 * @param headingId - ID of the heading block
 * @returns Array of block IDs in the section (including the heading)
 */
export const getSectionBlockIds = (
  blocks: Block[],
  headingId: string
): string[] => {
  const range = getSectionRange(blocks, headingId);
  if (!range) return [];

  return blocks
    .slice(range.startIndex, range.endIndex + 1)
    .map((b) => b.id);
};

/**
 * Get section content block IDs (excludes the heading itself)
 *
 * @param blocks - Array of blocks
 * @param headingId - ID of the heading block
 * @returns Array of content block IDs (heading excluded)
 */
export const getSectionContentIds = (
  blocks: Block[],
  headingId: string
): string[] => {
  const range = getSectionRange(blocks, headingId);
  if (!range) return [];

  return blocks
    .slice(range.startIndex + 1, range.endIndex + 1)
    .map((b) => b.id);
};
