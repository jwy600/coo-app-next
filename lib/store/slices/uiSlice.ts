/**
 * UI slice - Wraps pure UI state functions
 *
 * Block selection has two modes:
 * 1. Block mode: Multi-select blocks freely
 * 2. Section mode: Section is implicitly selected for export, can multi-select within
 *    - Inside selection is for editing only (doesn't affect export)
 *    - Outside selection adds to export (section + outside blocks)
 *
 * Composer enabled when:
 * - Block mode: exactly 1 block selected
 * - Section mode: exactly 1 block inside, 0 outside
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';
import { Block } from '@/types/block';

export interface UISlice {
  mode: AppMode;
  selectedBlockIds: string[];
  sectionHeadingId: string | null;
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleBlockInSelection: (blockId: string) => void;
  enterSectionMode: (headingId: string) => void;
  selectHeadingDirectly: (headingId: string) => void;
  clearSelectedBlocks: () => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clear session state from specified blocks (selections, rewrite state)
 */
const clearBlockSessionState = (blocks: Block[], blockIds: string[]): Block[] => {
  if (blockIds.length === 0) return blocks;

  const idsToReset = new Set(blockIds);
  return blocks.map((block) =>
    idsToReset.has(block.id)
      ? { ...block, selections: [], isRewritten: false, prevText: null }
      : block
  );
};

/**
 * Toggle a block in a selection array (add if missing, remove if present)
 */
const toggleInArray = (arr: string[], id: string): string[] => {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
};

// ============================================================================
// Selection Handlers (called from toggleBlockInSelection)
// ============================================================================

interface SelectionState {
  selectedBlockIds: string[];
  blocks: Block[];
  sectionHeadingId: string | null;
}

type SelectionUpdate = Partial<Pick<AppState, 'selectedBlockIds' | 'blocks' | 'sectionHeadingId'>>;

/**
 * Handle clicking the section's own heading → exit section mode, select heading
 */
const handleSectionHeadingClick = (blockId: string): SelectionUpdate => ({
  sectionHeadingId: null,
  selectedBlockIds: [blockId],
});

/**
 * Handle clicking a block inside the current section
 * Multi-select toggle: same as normal mode
 * Inside selection is for editing only, doesn't affect export
 */
const handleBlockInsideSectionClick = (
  state: SelectionState,
  blockId: string
): SelectionUpdate => {
  const isAlreadySelected = state.selectedBlockIds.includes(blockId);

  if (isAlreadySelected) {
    // Deselect this block
    return {
      selectedBlockIds: state.selectedBlockIds.filter((id) => id !== blockId),
      blocks: clearBlockSessionState(state.blocks, [blockId]),
    };
  }

  // Add to selection (multi-select)
  return {
    selectedBlockIds: [...state.selectedBlockIds, blockId],
    blocks: clearBlockSessionState(state.blocks, [blockId]),
  };
};

/**
 * Handle clicking a block outside the current section
 * Multi-select allowed: toggle the block in selection
 */
const handleBlockOutsideSectionClick = (
  state: SelectionState,
  blockId: string
): SelectionUpdate => ({
  selectedBlockIds: toggleInArray(state.selectedBlockIds, blockId),
});

/**
 * Handle clicking a block in normal mode (no section active)
 * Multi-select with session state clearing on select
 */
const handleNormalModeClick = (
  state: SelectionState & { mode: AppMode },
  blockId: string
): SelectionUpdate => {
  const result = stateFns.toggleBlockInSelection(state.mode, state.selectedBlockIds, blockId);
  const isNowSelected = result.selectedBlockIds.includes(blockId);

  if (isNowSelected) {
    return {
      selectedBlockIds: result.selectedBlockIds,
      blocks: clearBlockSessionState(state.blocks, [blockId]),
    };
  }

  return { selectedBlockIds: result.selectedBlockIds };
};

// ============================================================================
// Slice Definition
// ============================================================================

export const uiSlice: StateCreator<
  AppState & UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  mode: 'landing',
  selectedBlockIds: [],
  sectionHeadingId: null,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const { selectedBlockIds } = get();
    const result = stateFns.setMode(selectedBlockIds, mode);
    set({
      mode: result.mode,
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
    });
  },

  toggleBlockInSelection: (blockId) => {
    const state = get();

    // Case 1: Clicking the section's own heading → exit section mode
    if (state.sectionHeadingId === blockId) {
      set(handleSectionHeadingClick(blockId));
      return;
    }

    // Case 2: In section mode
    if (state.sectionHeadingId) {
      const sectionBlockIds = stateFns.getSectionBlockIds(state.blocks, state.sectionHeadingId);
      const isInsideSection = sectionBlockIds.includes(blockId);

      if (isInsideSection) {
        // Inside section: single-select behavior
        set(handleBlockInsideSectionClick(state, blockId));
      } else {
        // Outside section: multi-select behavior
        set(handleBlockOutsideSectionClick(state, blockId));
      }
      return;
    }

    // Case 3: Normal mode (no section active)
    set(handleNormalModeClick(state, blockId));
  },

  enterSectionMode: (headingId) => {
    const result = stateFns.enterSectionMode(get().sectionHeadingId, headingId);
    if (result) {
      set(result);
    }
    // null = same heading double-clicked, no change
  },

  selectHeadingDirectly: (headingId) => {
    const state = get();

    // Not in section mode → select heading directly
    if (!state.sectionHeadingId) {
      set({ sectionHeadingId: null, selectedBlockIds: [headingId] });
      return;
    }

    // Same heading → exit section mode, select as block
    if (headingId === state.sectionHeadingId) {
      set({ sectionHeadingId: null, selectedBlockIds: [headingId] });
      return;
    }

    // Different heading → toggle in selection (keep section mode)
    set({ selectedBlockIds: toggleInArray(state.selectedBlockIds, headingId) });
  },

  clearSelectedBlocks: () => {
    const { selectedBlockIds, blocks } = get();
    const result = stateFns.clearSelectedBlocks(selectedBlockIds, blocks);
    set({
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
      blocks: result.blocks,
    });
  },

  setAwaitingResponse: (value) => {
    set({ isAwaitingResponse: value });
  },

  setError: (error) => {
    set({ error });
  },
});
