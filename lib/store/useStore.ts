/**
 * Main Zustand store with devtools
 * Combines all slices into a single store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { threadSlice, ThreadSlice } from './slices/threadSlice';
import { blockSlice, BlockSlice } from './slices/blockSlice';
import { uiSlice, UISlice } from './slices/uiSlice';
import { streamingSlice, StreamingSlice } from './slices/streamingSlice';
import { settingsSlice, SettingsSlice } from './slices/settingsSlice';
import { AppState, Card } from '@/types/state';
import { Block } from '@/types/block';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { isTestMode } from '@/lib/utils/testMode';

export type StoreState = AppState & ThreadSlice & BlockSlice & UISlice & StreamingSlice & SettingsSlice;

/**
 * Main store hook
 * Usage: const { threads, addUserMessage } = useStore();
 *
 * In test mode, data persists to sessionStorage to support navigation tests
 */
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...threadSlice(...args),
        ...blockSlice(...args),
        ...uiSlice(...args),
        ...streamingSlice(...args),
        ...settingsSlice(...args),
      }),
      isTestMode()
        ? {
            name: 'coo-test-storage',
            // In test mode, persist critical data for navigation tests
            partialize: (state) => ({
              threads: state.threads,
              blocks: state.blocks,
              activeThreadId: state.activeThreadId,
              settings: state.settings,
            }),
          }
        : {
            name: 'coo-settings-storage',
            // In production, only persist settings to localStorage
            partialize: (state) => ({
              settings: state.settings,
            }),
          }
    ),
    {
      name: 'coo-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// Selectors (Memoized)
// ============================================================================

/**
 * Select the active thread
 */
export const selectActiveThread = (state: StoreState): Thread | undefined =>
  state.threads.find((t) => t.id === state.activeThreadId);

/**
 * Create a selector for a specific block by ID
 */
export const selectBlockById = (blockId: string) => (state: StoreState): Block | undefined =>
  state.blocks.find((b) => b.id === blockId);

/**
 * Select the currently selected block (single selection)
 */
export const selectSelectedBlock = (state: StoreState): Block | null =>
  state.selectedBlockId
    ? state.blocks.find((b) => b.id === state.selectedBlockId) || null
    : null;

/**
 * Select content for transformation (used by API)
 * Simply returns the selected block if one is selected
 */
export const selectContentForTransform = (state: StoreState): Block[] => {
  const { selectedBlockId, blocks } = state;

  if (!selectedBlockId) return [];

  const block = blocks.find((b) => b.id === selectedBlockId);
  return block ? [block] : [];
};

/**
 * Select all cards
 */
export const selectCards = (state: StoreState): Card[] => state.cards;

/**
 * Select cards for a specific message
 */
export const selectCardsByMessage = (messageId: string) => (state: StoreState): Card[] =>
  state.cards.filter((c) => c.messageId === messageId);

/**
 * Check if a block is in any card
 */
export const selectIsBlockInCard = (blockId: string) => (state: StoreState): boolean =>
  state.cards.some((c) => c.blockIds.includes(blockId));

/**
 * Get the card that contains a specific block (if any)
 */
export const selectCardContainingBlock = (blockId: string) => (state: StoreState): Card | null =>
  state.cards.find((c) => c.blockIds.includes(blockId)) || null;

/**
 * Select blocks for a specific card (in document order)
 */
export const selectCardBlocks = (cardId: string) => (state: StoreState): Block[] => {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return [];

  // Return blocks in document order
  return state.blocks.filter((b) => card.blockIds.includes(b.id));
};

/**
 * Select all blocks that are in any card (for export all cards)
 * Returns blocks in document order, grouped by card
 */
export const selectAllCardBlocks = (state: StoreState): Block[] => {
  const allCardBlockIds = new Set(state.cards.flatMap((c) => c.blockIds));
  return state.blocks.filter((b) => allCardBlockIds.has(b.id));
};

/**
 * Check if there are any cards
 */
export const selectHasCards = (state: StoreState): boolean => state.cards.length > 0;

/**
 * Create a selector for messages in a specific thread
 */
export const selectMessagesByThread = (threadId: string) => (state: StoreState): Message[] => {
  const thread = state.threads.find((t) => t.id === threadId);
  return thread?.messages || [];
};

/**
 * Create a selector for blocks belonging to a specific message
 */
export const selectBlocksByMessage = (messageId: string) => (state: StoreState): Block[] =>
  state.blocks.filter((b) => b.messageId === messageId);

/**
 * Select all blocks for the active thread
 */
export const selectActiveThreadBlocks = (state: StoreState): Block[] => {
  const activeThread = selectActiveThread(state);
  if (!activeThread) return [];

  const messageIds = activeThread.messages.map((m) => m.id);
  return state.blocks.filter((b) => messageIds.includes(b.messageId));
};

/**
 * Create a selector for blocks in a specific thread
 */
export const selectBlocksByThread = (threadId: string) => (state: StoreState): Block[] => {
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) return [];
  const messageIds = thread.messages.map((m) => m.id);
  return state.blocks.filter((b) => messageIds.includes(b.messageId));
};

/**
 * Check if there are any threads
 */
export const selectHasThreads = (state: StoreState): boolean =>
  state.threads.length > 0;

/**
 * Check if a block is selected (for composer/transform)
 */
export const selectHasBlockSelected = (state: StoreState): boolean =>
  state.selectedBlockId !== null;
