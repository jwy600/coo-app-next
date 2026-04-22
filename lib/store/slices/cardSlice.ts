/**
 * Card slice - Wraps pure card state functions.
 * Persistence is handled centrally by Zustand's persist middleware in useStore.ts.
 */

import { StateCreator } from "zustand";
import * as cardFns from "@/lib/state/card";
import { Card } from "@/types/card";
import { AppState } from "@/types/state";
import { idFactory } from "@/lib/utils/idFactory";

export interface CardSlice {
  cards: Card[];

  addCard: (anchorBlockId: string) => void;
  removeCard: (cardId: string) => void;
  setCards: (cards: Card[]) => void;
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

    const anchorBlock = state.blocks.find((b) => b.id === anchorBlockId);
    if (!anchorBlock) return;

    const existingCard = cardFns.findCardByAnchor(state.cards, anchorBlockId);
    if (existingCard) {
      set({ cards: cardFns.removeCard(state.cards, existingCard.id) });
      return;
    }

    const proposedBlockIds = cardFns.getCardBlockIds(
      state.blocks,
      anchorBlockId,
      anchorBlock.messageId,
    );
    if (proposedBlockIds.length === 0) return;

    if (!cardFns.canCreateCard(proposedBlockIds, state.cards)) return;

    const newCard: Card = {
      id: idFactory(),
      messageId: anchorBlock.messageId,
      anchorBlockId,
      blockIds: proposedBlockIds,
      createdAt: Date.now(),
    };

    set({ cards: cardFns.addCard(state.cards, newCard) });
  },

  removeCard: (cardId) => {
    const { cards } = get();
    set({ cards: cardFns.removeCard(cards, cardId) });
  },

  setCards: (cards) => {
    set({ cards });
  },
});
