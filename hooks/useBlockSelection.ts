/**
 * useBlockSelection Hook
 *
 * Manages block selection (single) and cards (multiple):
 *
 * Block selection:
 * - Single-click gutter to select a block for composer/transform
 * - Only one block can be selected at a time
 * - Composer enabled when a block is selected
 *
 * Cards:
 * - Double-click gutter to create a card for display/export
 * - Cards are mutually exclusive (blocks can only belong to one card)
 * - Per-message (cannot span multiple messages)
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';
import { Card } from '@/types/state';

export interface UseBlockSelectionReturn {
  // Selection state (single block)
  selectedBlockId: string | null;
  isBlockSelected: (blockId: string) => boolean;
  selectBlock: (blockId: string) => void;
  clearSelection: () => void;
  hasSelection: boolean;

  // Card state (multiple cards)
  cards: Card[];
  addCard: (anchorBlockId: string) => void;
  removeCard: (cardId: string) => void;
  clearAllCards: () => void;
  isBlockInCard: (blockId: string) => boolean;
  getCardForBlock: (blockId: string) => Card | undefined;
}

export function useBlockSelection(): UseBlockSelectionReturn {
  // Store state
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  const cards = useStore((state) => state.cards);
  const selectBlockAction = useStore((state) => state.selectBlock);
  const clearSelectionAction = useStore((state) => state.clearSelection);
  const addCardAction = useStore((state) => state.addCard);
  const removeCardAction = useStore((state) => state.removeCard);
  const clearAllCardsAction = useStore((state) => state.clearAllCards);

  /**
   * Check if a block is selected
   */
  const isBlockSelected = useCallback(
    (blockId: string) => selectedBlockId === blockId,
    [selectedBlockId]
  );

  /**
   * Select a block (toggles if same block)
   */
  const selectBlock = useCallback(
    (blockId: string) => {
      selectBlockAction(blockId);
    },
    [selectBlockAction]
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    clearSelectionAction();
  }, [clearSelectionAction]);

  /**
   * Add a card (double-click gutter)
   */
  const addCard = useCallback(
    (anchorBlockId: string) => {
      addCardAction(anchorBlockId);
    },
    [addCardAction]
  );

  /**
   * Remove a card
   */
  const removeCard = useCallback(
    (cardId: string) => {
      removeCardAction(cardId);
    },
    [removeCardAction]
  );

  /**
   * Clear all cards
   */
  const clearAllCards = useCallback(() => {
    clearAllCardsAction();
  }, [clearAllCardsAction]);

  /**
   * Check if a block is in any card
   */
  const isBlockInCard = useCallback(
    (blockId: string) => cards.some((c) => c.blockIds.includes(blockId)),
    [cards]
  );

  /**
   * Get the card containing a block (if any)
   */
  const getCardForBlock = useCallback(
    (blockId: string) => cards.find((c) => c.blockIds.includes(blockId)),
    [cards]
  );

  return {
    // Selection
    selectedBlockId,
    isBlockSelected,
    selectBlock,
    clearSelection,
    hasSelection: selectedBlockId !== null,

    // Cards
    cards,
    addCard,
    removeCard,
    clearAllCards,
    isBlockInCard,
    getCardForBlock,
  };
}
