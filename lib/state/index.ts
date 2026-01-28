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
export * from './card';

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
    cards: [],
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
  selectedBlockId: string | null;
}

/**
 * Set application mode (landing or thread)
 *
 * @param selectedBlockId - Current selected block ID
 * @param mode - Target mode
 * @returns New mode and selectedBlockId (cleared if entering landing)
 */
export const setMode = (
  selectedBlockId: string | null,
  mode: AppMode
): SetModeResult => {
  if (mode === 'landing') {
    return { mode, selectedBlockId: null };
  }
  return { mode, selectedBlockId };
};

/**
 * Result of clearSelection - contains only the fields that change
 */
export interface ClearSelectionResult {
  selectedBlockId: string | null;
  blocks: Block[];
}

/**
 * Clear selected block and reset its session state
 *
 * When exiting block mode, we need to:
 * 1. Clear selectedBlockId (exit block mode)
 * 2. Clear the block's session state (selections, isRewritten, prevText)
 *
 * This ensures each block mode session is independent - undo only works
 * within the current session, and once you exit, the rewrite becomes permanent.
 *
 * @param selectedBlockId - Current selected block ID (null if none)
 * @param blocks - All blocks
 * @returns New selectedBlockId (null) and blocks with cleared session state
 */
export const clearSelection = (
  selectedBlockId: string | null,
  blocks: Block[]
): ClearSelectionResult => {
  if (selectedBlockId === null) {
    return { selectedBlockId: null, blocks };
  }

  // Clear the session state for the selected block
  const updatedBlocks = blocks.map((block) => {
    if (block.id !== selectedBlockId) return block;

    return {
      ...block,
      selections: [],           // Clear selections
      isRewritten: false,       // Clear session rewrite flag
      prevText: null,           // Clear session backup (no more undo)
    };
  });

  return {
    selectedBlockId: null,
    blocks: updatedBlocks,
  };
};

/**
 * Result of selectBlock - contains only selectedBlockId
 */
export interface SelectBlockResult {
  selectedBlockId: string | null;
}

/**
 * Select a block (single selection only)
 *
 * Clicking a block:
 * - If not selected: select it (deselect previous)
 * - If already selected: deselect it
 *
 * @param mode - Current app mode (selection only allowed in 'thread' mode)
 * @param selectedBlockId - Current selected block ID (null if none)
 * @param blockId - Block ID to select/deselect
 * @returns New selectedBlockId
 */
export const selectBlock = (
  mode: AppMode,
  selectedBlockId: string | null,
  blockId: string
): SelectBlockResult => {
  if (mode !== 'thread') {
    return { selectedBlockId: null };
  }

  // Toggle: if same block, deselect; otherwise select the new block
  if (selectedBlockId === blockId) {
    return { selectedBlockId: null };
  }

  return { selectedBlockId: blockId };
};

