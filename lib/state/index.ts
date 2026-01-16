/**
 * Pure state transformation functions
 *
 * All functions in this module are pure - they take state as input
 * and return new state objects without mutating the original.
 */

import { AppState, AppMode } from '@/types/state';

// Re-export all state functions from modules
export * from './thread';
export * from './message';
export * from './block';
export * from './parser';

/**
 * Create initial application state
 */
export const createInitialState = (
  idFactory: () => string,
  nowFactory: () => number
): AppState => {
  const threadId = idFactory();
  const now = nowFactory();
  return {
    mode: 'landing',
    selectedBlockId: null,
    hasInitialResponse: false,
    activeThreadId: threadId,
    threads: [
      {
        id: threadId,
        title: 'Main',
        createdAt: now,
        updatedAt: now,
        messages: [],
      },
    ],
    blocks: [],
  };
};

/**
 * Set application mode (landing or chat)
 */
export const setMode = (state: AppState, mode: AppMode): AppState => {
  const next = { ...state, mode };
  if (mode === 'landing') {
    return { ...next, selectedBlockId: null };
  }
  return next;
};

/**
 * Clear selected block
 */
export const clearSelectedBlock = (state: AppState): AppState => ({
  ...state,
  selectedBlockId: null,
});

/**
 * Set hasInitialResponse flag
 */
export const setHasInitialResponse = (state: AppState, value: boolean): AppState => ({
  ...state,
  hasInitialResponse: value,
});

/**
 * Toggle block selection
 */
export const toggleSelectedBlock = (state: AppState, blockId: string): AppState => {
  if (state.mode !== 'chat') {
    return { ...state, selectedBlockId: null };
  }
  const nextId = state.selectedBlockId === blockId ? null : blockId;
  return { ...state, selectedBlockId: nextId };
};
