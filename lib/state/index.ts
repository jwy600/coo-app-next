/**
 * Pure state transformation functions
 *
 * All functions in this module are pure - they take state as input
 * and return new state objects without mutating the original.
 *
 * Functions are designed with narrow signatures - they accept only
 * the fields they need, making dependencies explicit and enabling
 * better testing.
 */

import { AppState, AppMode } from '@/types/state';
import { Block } from '@/types/block';

// Re-export all state functions from modules
export * from './thread';
export * from './message';
export * from './block';
export * from './parser';
export * from './settings';
export * from './heading';

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
    isAwaitingResponse: false,
    error: null,
  };
};

// ============================================================================
// UI State Functions (Narrow Signatures)
// ============================================================================

/**
 * Result of setMode - contains only the fields that change
 */
export interface SetModeResult {
  mode: AppMode;
  selectedBlockIds: string[];
}

/**
 * Set application mode (landing or thread)
 *
 * @param selectedBlockIds - Current selected block IDs
 * @param mode - Target mode
 * @returns New mode and selectedBlockIds (cleared if entering landing)
 */
export const setMode = (
  selectedBlockIds: string[],
  mode: AppMode
): SetModeResult => {
  if (mode === 'landing') {
    return { mode, selectedBlockIds: [] };
  }
  return { mode, selectedBlockIds };
};

/**
 * Result of clearSelectedBlocks - contains only the fields that change
 */
export interface ClearSelectedBlocksResult {
  selectedBlockIds: string[];
  blocks: Block[];
}

/**
 * Clear all selected blocks and reset their session state
 *
 * When exiting block mode, we need to:
 * 1. Clear selectedBlockIds (exit block mode)
 * 2. Clear each block's session state (selections, isRewritten, prevText)
 *
 * This ensures each block mode session is independent - undo only works
 * within the current session, and once you exit, the rewrite becomes permanent.
 *
 * @param selectedBlockIds - Current selected block IDs
 * @param blocks - All blocks
 * @returns New selectedBlockIds (empty) and blocks with cleared session state
 */
export const clearSelectedBlocks = (
  selectedBlockIds: string[],
  blocks: Block[]
): ClearSelectedBlocksResult => {
  if (selectedBlockIds.length === 0) {
    return { selectedBlockIds: [], blocks };
  }

  // Clear the session state for all selected blocks
  const updatedBlocks = blocks.map((block) => {
    if (!selectedBlockIds.includes(block.id)) return block;

    return {
      ...block,
      selections: [],           // Clear selections
      isRewritten: false,       // Clear session rewrite flag
      prevText: null,           // Clear session backup (no more undo)
    };
  });

  return {
    selectedBlockIds: [],
    blocks: updatedBlocks,
  };
};

/**
 * Result of toggleBlockInSelection - contains only selectedBlockIds
 */
export interface ToggleBlockResult {
  selectedBlockIds: string[];
}

/**
 * Toggle a block in the selection set (add if not present, remove if present)
 *
 * Selection is additive - clicking a block adds/removes it from the set.
 * The array maintains selection order (useful for export).
 *
 * @param mode - Current app mode (selection only allowed in 'thread' mode)
 * @param selectedBlockIds - Current selected block IDs
 * @param blockId - Block ID to toggle
 * @returns New selectedBlockIds
 */
export const toggleBlockInSelection = (
  mode: AppMode,
  selectedBlockIds: string[],
  blockId: string
): ToggleBlockResult => {
  if (mode !== 'thread') {
    return { selectedBlockIds: [] };
  }

  const isSelected = selectedBlockIds.includes(blockId);

  if (isSelected) {
    // Remove from selection
    return {
      selectedBlockIds: selectedBlockIds.filter((id) => id !== blockId),
    };
  }

  // Add to selection (headings and paragraphs can all be multi-selected)
  return {
    selectedBlockIds: [...selectedBlockIds, blockId],
  };
};

