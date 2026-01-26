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
import { AppState } from '@/types/state';
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
 * Select all currently selected blocks (in selection order)
 */
export const selectSelectedBlocks = (state: StoreState): Block[] =>
  state.selectedBlockIds
    .map((id) => state.blocks.find((b) => b.id === id))
    .filter((b): b is Block => b !== undefined);

/**
 * Select the single selected block (only when exactly one is selected)
 * Used for backward compatibility with block mode features (rewrite, expand, etc.)
 */
export const selectSingleSelectedBlock = (state: StoreState): Block | null =>
  state.selectedBlockIds.length === 1
    ? state.blocks.find((b) => b.id === state.selectedBlockIds[0]) || null
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
 * Check if composer is in single-block mode (exactly one block selected)
 * This enables block-specific actions like rewrite, expand, etc.
 */
export const selectIsSingleBlockMode = (state: StoreState): boolean =>
  state.selectedBlockIds.length === 1;

/**
 * Check if multi-select mode is active (2+ blocks selected)
 * When true, composer should be disabled
 */
export const selectIsMultiSelectMode = (state: StoreState): boolean =>
  state.selectedBlockIds.length >= 2;
