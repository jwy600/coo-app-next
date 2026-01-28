/**
 * UI slice - Manages UI state for block selection and cards
 *
 * Block selection (single):
 * - Click gutter to select a block for composer/transform
 * - Only one block can be selected at a time
 * - Independent from cards
 *
 * Cards (multiple):
 * - Double-click gutter to create a card for display/export
 * - Cards are mutually exclusive (blocks can only belong to one card)
 * - Per-message (cannot span multiple messages)
 *
 * Composer enabled when: selectedBlockId !== null
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState, Card } from '@/types/state';
import { Block } from '@/types/block';

export interface UISlice {
  mode: AppMode;
  selectedBlockId: string | null;
  cards: Card[];
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  selectBlock: (blockId: string) => void;
  clearSelection: () => void;
  addCard: (anchorBlockId: string) => void;
  removeCard: (cardId: string) => void;
  clearAllCards: () => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clear session state from a block (selections, rewrite state)
 */
const clearBlockSessionState = (blocks: Block[], blockId: string): Block[] => {
  return blocks.map((block) =>
    block.id === blockId
      ? { ...block, selections: [], isRewritten: false, prevText: null }
      : block
  );
};

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
  const sectionBlockIds = stateFns.getSectionBlockIds(messageBlocks, anchorBlockId);
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

export const uiSlice: StateCreator<
  AppState & UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  mode: 'landing',
  selectedBlockId: null,
  cards: [],
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const { selectedBlockId } = get();
    const result = stateFns.setMode(selectedBlockId, mode);
    set({
      mode: result.mode,
      selectedBlockId: result.selectedBlockId,
    });
  },

  selectBlock: (blockId) => {
    const state = get();
    const result = stateFns.selectBlock(state.mode, state.selectedBlockId, blockId);

    // If selecting a new block, clear session state of old block
    if (state.selectedBlockId && state.selectedBlockId !== blockId) {
      set({
        selectedBlockId: result.selectedBlockId,
        blocks: clearBlockSessionState(state.blocks, state.selectedBlockId),
      });
      return;
    }

    // If selecting a block (not deselecting), clear its session state
    if (result.selectedBlockId) {
      set({
        selectedBlockId: result.selectedBlockId,
        blocks: clearBlockSessionState(state.blocks, blockId),
      });
      return;
    }

    // Deselecting - no need to clear session state
    set({ selectedBlockId: result.selectedBlockId });
  },

  clearSelection: () => {
    const { selectedBlockId, blocks } = get();
    const result = stateFns.clearSelection(selectedBlockId, blocks);
    set({
      selectedBlockId: result.selectedBlockId,
      blocks: result.blocks,
    });
  },

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
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      messageId: anchorBlock.messageId,
      anchorBlockId,
      blockIds: proposedBlockIds,
    };

    set({ cards: [...state.cards, newCard] });
  },

  removeCard: (cardId) => {
    const { cards } = get();
    set({ cards: cards.filter((c) => c.id !== cardId) });
  },

  clearAllCards: () => {
    set({ cards: [] });
  },

  setAwaitingResponse: (value) => {
    set({ isAwaitingResponse: value });
  },

  setError: (error) => {
    set({ error });
  },
});
