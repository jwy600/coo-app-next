/**
 * Card-related pure state transformations
 *
 * Cards are user annotations marking important content:
 * - Double-click gutter to create a card for display/export
 * - Cards are mutually exclusive (blocks can only belong to one card)
 * - Per-message (cannot span multiple messages)
 */

import { Block } from '@/types/block';
import { Card } from '@/types/card';
import { getHeadingCardBlockIds } from './heading';

/**
 * Get block IDs for a card based on anchor block
 * - For headings: includes heading + all content until next same/higher level heading
 * - For non-headings: just the single block
 */
export const getCardBlockIds = (
  blocks: Block[],
  anchorBlockId: string,
  messageId: string
): string[] => {
  const anchorIndex = blocks.findIndex((b) => b.id === anchorBlockId);
  if (anchorIndex === -1) return [];

  const anchorBlock = blocks[anchorIndex];

  // Filter blocks to same message
  const messageBlocks = blocks.filter((b) => b.messageId === messageId);
  const anchorIndexInMessage = messageBlocks.findIndex((b) => b.id === anchorBlockId);
  if (anchorIndexInMessage === -1) return [];

  // Non-heading: just the single block
  if (anchorBlock.type !== 'heading') {
    return [anchorBlockId];
  }

  // Heading: use heading card range logic
  return getHeadingCardBlockIds(messageBlocks, anchorBlockId);
};

/**
 * Check if a card can be created (no blocks already in a card)
 */
export const canCreateCard = (
  proposedBlockIds: string[],
  existingCards: Card[]
): boolean => {
  const allCardedBlockIds = new Set(existingCards.flatMap((c) => c.blockIds));
  return !proposedBlockIds.some((id) => allCardedBlockIds.has(id));
};

/**
 * Find card by anchor block ID
 */
export const findCardByAnchor = (
  cards: Card[],
  anchorBlockId: string
): Card | undefined => {
  return cards.find((c) => c.anchorBlockId === anchorBlockId);
};

/**
 * Remove a card from the cards array
 */
export const removeCard = (cards: Card[], cardId: string): Card[] => {
  return cards.filter((c) => c.id !== cardId);
};

/**
 * Add a card to the cards array
 */
export const addCard = (cards: Card[], card: Card): Card[] => {
  return [...cards, card];
};
