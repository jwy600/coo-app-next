/**
 * Main Zustand store with devtools
 * Combines all slices into a single store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { threadSlice, ThreadSlice } from './slices/threadSlice';
import { blockSlice, BlockSlice } from './slices/blockSlice';
import { uiSlice, UISlice } from './slices/uiSlice';
import { AppState } from '@/types/state';
import { Block } from '@/types/block';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';

export type StoreState = AppState & ThreadSlice & BlockSlice & UISlice;

/**
 * Main store hook
 * Usage: const { threads, addUserMessage } = useStore();
 */
export const useStore = create<StoreState>()(
  devtools(
    (...args) => ({
      ...threadSlice(...args),
      ...blockSlice(...args),
      ...uiSlice(...args),
    }),
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
 * Select the currently selected block
 */
export const selectSelectedBlock = (state: StoreState): Block | null =>
  state.selectedBlockId
    ? state.blocks.find((b) => b.id === state.selectedBlockId) || null
    : null;

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
 * Check if there are any threads
 */
export const selectHasThreads = (state: StoreState): boolean =>
  state.threads.length > 0;

/**
 * Check if composer is in block mode (block selected)
 */
export const selectIsBlockMode = (state: StoreState): boolean =>
  state.selectedBlockId !== null;
