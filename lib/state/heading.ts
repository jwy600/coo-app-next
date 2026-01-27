import { Block } from '@/types/block';

/**
 * Heading-related pure functions
 *
 * Handles heading parsing, detection, and section scope.
 * A "section" is a heading plus all content blocks until the next heading
 * of the same or higher level (hierarchy-aware).
 */

// ============================================================================
// Parsing
// ============================================================================

export interface HeadingInfo {
  level: number;   // 1-6
  prefix: string;  // "## " (includes trailing space)
}

/**
 * Parse heading info from text
 * Returns null if not a valid heading
 *
 * @example
 * getHeadingInfo("## Title")  → { level: 2, prefix: "## " }
 * getHeadingInfo("Hello")     → null
 */
export const getHeadingInfo = (text: string): HeadingInfo | null => {
  const match = text.match(/^(#{1,6})\s+/);
  if (!match) return null;
  return {
    level: match[1].length,
    prefix: match[0],
  };
};

/**
 * Get heading level from text (counts # characters)
 * Returns 0 if not a valid heading
 *
 * @example
 * getHeadingLevel("## Title")  → 2
 * getHeadingLevel("Hello")     → 0
 */
export const getHeadingLevel = (text: string): number => {
  return getHeadingInfo(text)?.level ?? 0;
};

/**
 * Check if text is a heading
 *
 * @example
 * hasHeading("## Title")  → true
 * hasHeading("Hello")     → false
 */
export const hasHeading = (text: string): boolean => {
  return getHeadingInfo(text) !== null;
};

/**
 * Get heading prefix from text (e.g., "## ")
 * Returns empty string if not a heading
 *
 * @example
 * getHeadingPrefix("## Title")  → "## "
 * getHeadingPrefix("Hello")     → ""
 */
export const getHeadingPrefix = (text: string): string => {
  return getHeadingInfo(text)?.prefix ?? '';
};

// ============================================================================
// Section Range (Hierarchy-Aware)
// ============================================================================

/**
 * Internal helper: find section end index given a starting index
 * Section ends at next heading of same or higher level
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
 *
 * @example
 * // blocks: [H1, p, H2, p, H1]
 * getSectionRange(blocks, 'h1-id')  → { startIndex: 0, endIndex: 3 }
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
 * Get block IDs that belong to a section (heading + all content)
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

// ============================================================================
// Section Mode (Mutual Exclusivity)
// ============================================================================

export interface SectionModeState {
  sectionHeadingId: string | null;
  selectedBlockIds: string[];
}

/**
 * Determine new section mode state when double-clicking a heading
 *
 * @param currentSectionHeadingId - Current section heading ID (null if not in section mode)
 * @param headingId - Heading being double-clicked
 * @returns New state, or null if no change needed (same heading double-clicked)
 *
 * @example
 * // Not in section mode → enter
 * enterSectionMode(null, 'h1')  → { sectionHeadingId: 'h1', ... }
 *
 * // Same heading → no change (exit via blank space click instead)
 * enterSectionMode('h1', 'h1')  → null
 *
 * // Different heading → switch to new heading
 * enterSectionMode('h1', 'h2')  → { sectionHeadingId: 'h2', ... }
 */
export const enterSectionMode = (
  currentSectionHeadingId: string | null,
  headingId: string
): SectionModeState | null => {
  // Same heading → no change (user exits via blank space click)
  if (currentSectionHeadingId === headingId) {
    return null;
  }

  // Different heading OR not in section mode → enter/switch section mode
  return {
    sectionHeadingId: headingId,
    selectedBlockIds: [],
  };
};
