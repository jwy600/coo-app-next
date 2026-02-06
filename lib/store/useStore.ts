/**
 * Main Zustand store with devtools
 * Combines all slices into a single store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { threadSlice, ThreadSlice } from './slices/threadSlice';
import { blockSlice, BlockSlice } from './slices/blockSlice';
import { uiSlice, UISlice } from './slices/uiSlice';
import { cardSlice, CardSlice } from './slices/cardSlice';
import { streamingSlice, StreamingSlice } from './slices/streamingSlice';
import { settingsSlice, SettingsSlice } from './slices/settingsSlice';
import { AppState } from '@/types/state';
import { Card } from '@/types/card';
import { Block } from '@/types/block';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { isTestMode } from '@/lib/utils/testMode';

export type StoreState = AppState & ThreadSlice & BlockSlice & UISlice & CardSlice & StreamingSlice & SettingsSlice;

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
        ...cardSlice(...args),
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
 * Select all blocks that are in any card (for export all cards)
 * Returns blocks in document order, grouped by card
 */
export const selectAllCardBlocks = (state: StoreState): Block[] => {
  const allCardBlockIds = new Set(state.cards.flatMap((c) => c.blockIds));
  return state.blocks.filter((b) => allCardBlockIds.has(b.id));
};

/**
 * Create a selector for messages in a specific thread
 */
export const selectMessagesByThread = (threadId: string) => (state: StoreState): Message[] => {
  const thread = state.threads.find((t) => t.id === threadId);
  return thread?.messages || [];
};

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

