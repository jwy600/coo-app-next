/**
 * Compute the default filename suggestion for the Export Cards dialog.
 *
 * Rule:
 * - If any card's anchor block is a heading → use the first such card's
 *   heading text in document order: `"{heading} - {threadTitle}"`.
 * - Otherwise → `threadTitle`.
 *
 * Fallbacks:
 * - Empty/whitespace thread title → `"Untitled"`.
 * - Heading text empty after stripping markdown `#` → use threadTitle alone.
 * - Heading text longer than MAX_HEADING_CHARS → truncated.
 */

import type { Block } from "@/types/block";
import type { Card } from "@/types/card";

const MAX_HEADING_CHARS = 80;
const FALLBACK_TITLE = "Untitled";

export const stripHeadingMarkdown = (text: string): string => {
  return text.replace(/^\s*#{1,6}\s*/, "").trim();
};

const truncate = (text: string, max: number): string => {
  if (text.length <= max) return text;
  return text.substring(0, max).trim();
};

export const computeDefaultCardTitle = (
  threadTitle: string,
  cards: Card[],
  allBlocks: Block[],
): string => {
  const safeThreadTitle = threadTitle.trim() || FALLBACK_TITLE;

  if (cards.length === 0) return safeThreadTitle;

  const blockPosition = new Map<string, number>();
  allBlocks.forEach((block, index) => blockPosition.set(block.id, index));

  const headingAnchoredCards = cards
    .map((card) => {
      const anchor = allBlocks.find((b) => b.id === card.anchorBlockId);
      return anchor && anchor.type === "heading"
        ? { card, anchor, position: blockPosition.get(anchor.id) ?? Infinity }
        : null;
    })
    .filter(
      (entry): entry is { card: Card; anchor: Block; position: number } =>
        entry !== null,
    )
    .sort((a, b) => a.position - b.position);

  if (headingAnchoredCards.length === 0) return safeThreadTitle;

  const rawHeading = stripHeadingMarkdown(headingAnchoredCards[0].anchor.text);
  if (!rawHeading) return safeThreadTitle;

  const heading = truncate(rawHeading, MAX_HEADING_CHARS);

  return `${heading} - ${safeThreadTitle}`;
};
