/**
 * Card slice - Wraps pure card state functions with persistence
 */

import { StateCreator } from 'zustand';
import * as cardFns from '@/lib/state/card';
import { persistAsync } from '@/lib/utils/persistence';
import { persistCard, deleteCard } from '@/lib/supabase/cards';
import { Card } from '@/types/card';
import { AppState } from '@/types/state';
import { idFactory } from '@/lib/utils/idFactory';

export interface CardSlice {
  cards: Card[];

  // Actions
  addCard: (anchorBlockId: string) => void;
  removeCard: (cardId: string) => void;
  setCards: (cards: Card[]) => void; // For loading from database
}

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
    const existingCard = cardFns.findCardByAnchor(state.cards, anchorBlockId);
    if (existingCard) {
      // Toggle off: remove the card
      set({ cards: cardFns.removeCard(state.cards, existingCard.id) });

      // Persist deletion
      persistAsync(() => deleteCard(existingCard.id), 'delete card');
      return;
    }

    // Compute proposed block IDs
    const proposedBlockIds = cardFns.getCardBlockIds(state.blocks, anchorBlockId, anchorBlock.messageId);
    if (proposedBlockIds.length === 0) return;

    // Check if any blocks are already in a card
    if (!cardFns.canCreateCard(proposedBlockIds, state.cards)) {
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

    set({ cards: cardFns.addCard(state.cards, newCard) });

    // Persist to database
    persistAsync(() => persistCard(newCard), 'persist card');
  },

  removeCard: (cardId) => {
    const { cards } = get();
    set({ cards: cardFns.removeCard(cards, cardId) });

    // Persist deletion
    persistAsync(() => deleteCard(cardId), 'delete card');
  },

  setCards: (cards) => {
    set({ cards });
  },
});
