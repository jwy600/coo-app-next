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
export * from './settings';

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
    selectedBlockIds: [],
    sectionHeadingId: null,
    isSelectionOutsideSection: false,
    activeThreadId: threadId,
    threads: [
      {
        id: threadId,
        title: 'current thread',
        createdAt: now,
        updatedAt: now,
        messages: [],
      },
    ],
    blocks: [],
  };
};

/**
 * Set application mode (landing or thread)
 */
export const setMode = (state: AppState, mode: AppMode): AppState => {
  const next = { ...state, mode };
  if (mode === 'landing') {
    return { ...next, selectedBlockIds: [] };
  }
  return next;
};

/**
 * Clear all selected blocks and reset their session state
 *
 * When exiting block mode, we need to:
 * 1. Clear selectedBlockIds (exit block mode)
 * 2. Clear each block's session state (selections, isRewritten, prevText)
 *
 * This ensures each block mode session is independent - undo only works
 * within the current session, and once you exit, the rewrite becomes permanent.
 */
export const clearSelectedBlocks = (state: AppState): AppState => {
  const blockIds = state.selectedBlockIds;

  if (blockIds.length === 0) {
    return { ...state, selectedBlockIds: [] };
  }

  // Clear the session state for all selected blocks
  const blocks = state.blocks.map((block) => {
    if (!blockIds.includes(block.id)) return block;

    return {
      ...block,
      selections: [],           // Clear selections
      isRewritten: false,       // Clear session rewrite flag
      prevText: null,           // Clear session backup (no more undo)
    };
  });

  return {
    ...state,
    selectedBlockIds: [],
    blocks,
  };
};

/**
 * Toggle a block in the selection set (add if not present, remove if present)
 *
 * Selection is additive - clicking a block adds/removes it from the set.
 * The array maintains selection order (useful for export).
 *
 * Special case: Headings are mutually exclusive - selecting a heading
 * deselects any previously selected heading (only one heading section
 * can be displayed at a time).
 */
export const toggleBlockInSelection = (state: AppState, blockId: string): AppState => {
  if (state.mode !== 'thread') {
    return { ...state, selectedBlockIds: [] };
  }

  const isSelected = state.selectedBlockIds.includes(blockId);

  if (isSelected) {
    // Remove from selection
    return {
      ...state,
      selectedBlockIds: state.selectedBlockIds.filter((id) => id !== blockId),
    };
  }

  // Add to selection (headings and paragraphs can all be multi-selected)
  return {
    ...state,
    selectedBlockIds: [...state.selectedBlockIds, blockId],
  };
};

/**
 * Get block IDs that belong to a section (heading + all blocks until next heading)
 *
 * A section includes:
 * - The heading block itself
 * - All blocks after the heading until the next heading (or end of blocks)
 */
export const getSectionBlockIds = (state: AppState, headingId: string): string[] => {
  const headingIndex = state.blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return [];

  const sectionBlockIds: string[] = [headingId];

  // Add all blocks after heading until next heading
  for (let i = headingIndex + 1; i < state.blocks.length; i++) {
    const block = state.blocks[i];
    if (block.type === 'heading') break;
    sectionBlockIds.push(block.id);
  }

  return sectionBlockIds;
};
