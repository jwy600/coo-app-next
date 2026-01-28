/**
 * Card slice - Manages card state with database persistence
 *
 * Cards are user annotations marking important content:
 * - Double-click gutter to create a card for display/export
 * - Cards are mutually exclusive (blocks can only belong to one card)
 * - Per-message (cannot span multiple messages)
 * - Persisted to database
 */

import { StateCreator } from 'zustand';
import { persistAsync } from '@/lib/utils/persistence';
import { persistCard, deleteCard } from '@/lib/supabase/cards';
import { Card } from '@/types/card';
import { AppState } from '@/types/state';
import { Block } from '@/types/block';
import { getSectionBlockIds } from '@/lib/state';
import { idFactory } from '@/lib/utils/idFactory';

export interface CardSlice {
  cards: Card[];

  // Actions
  addCard: (anchorBlockId: string) => void;
  removeCard: (cardId: string) => void;
  setCards: (cards: Card[]) => void; // For loading from database
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get block IDs for a card based on anchor block
 * - For headings: includes heading + all content until next same/higher level heading
 * - For non-headings: just the single block
 */
const getCardBlockIds = (blocks: Block[], anchorBlockId: string, messageId: string): string[] => {
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

  // Heading: use section range logic
  const sectionBlockIds = getSectionBlockIds(messageBlocks, anchorBlockId);
  return sectionBlockIds;
};

/**
 * Check if a card can be created (no blocks already in a card)
 */
const canCreateCard = (
  proposedBlockIds: string[],
  existingCards: Card[]
): boolean => {
  const allCardedBlockIds = new Set(existingCards.flatMap((c) => c.blockIds));
  return !proposedBlockIds.some((id) => allCardedBlockIds.has(id));
};

/**
 * Find card by anchor block ID
 */
const findCardByAnchor = (cards: Card[], anchorBlockId: string): Card | undefined => {
  return cards.find((c) => c.anchorBlockId === anchorBlockId);
};

// ============================================================================
// Slice Definition
// ============================================================================

export const cardSlice: StateCreator<
  AppState & CardSlice,
  [],
  [],
  CardSlice
> = (set, get) => ({
  cards: [],

  addCard: (anchorBlockId) => {
    const state = get();

    // Find the block to get its messageId
    const anchorBlock = state.blocks.find((b) => b.id === anchorBlockId);
    if (!anchorBlock) return;

    // Check if this anchor already has a card (toggle off)
    const existingCard = findCardByAnchor(state.cards, anchorBlockId);
    if (existingCard) {
      // Toggle off: remove the card
      set({ cards: state.cards.filter((c) => c.id !== existingCard.id) });

      // Persist deletion
      persistAsync(() => deleteCard(existingCard.id), 'delete card');
      return;
    }

    // Compute proposed block IDs
    const proposedBlockIds = getCardBlockIds(state.blocks, anchorBlockId, anchorBlock.messageId);
    if (proposedBlockIds.length === 0) return;

    // Check if any blocks are already in a card
    if (!canCreateCard(proposedBlockIds, state.cards)) {
      // Cannot create card - blocks already belong to another card
      return;
    }

    // Create new card
    const newCard: Card = {
      id: idFactory(),
      messageId: anchorBlock.messageId,
      anchorBlockId,
      blockIds: proposedBlockIds,
      createdAt: Date.now(),
    };

    set({ cards: [...state.cards, newCard] });

    // Persist to database
    persistAsync(() => persistCard(newCard), 'persist card');
  },

  removeCard: (cardId) => {
    const { cards } = get();
    set({ cards: cards.filter((c) => c.id !== cardId) });

    // Persist deletion
    persistAsync(() => deleteCard(cardId), 'delete card');
  },

  setCards: (cards) => {
    set({ cards });
  },
});
