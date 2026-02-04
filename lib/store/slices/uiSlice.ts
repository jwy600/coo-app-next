/**
 * UI slice - Manages ephemeral UI state for block selection
 *
 * Block selection (single):
 * - Click gutter to select a block for composer/transform
 * - Only one block can be selected at a time
 * - Independent from cards (cards are in cardSlice)
 *
 * Composer enabled when: selectedBlockId !== null
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';
import { Block } from '@/types/block';

export interface UISlice {
  mode: AppMode;
  selectedBlockId: string | null;
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  selectBlock: (blockId: string) => void;
  clearSelection: () => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clear session state from a block (selections, rewrite state)
 */
const clearBlockSessionState = (blocks: Block[], blockId: string): Block[] => {
  return blocks.map((block) =>
    block.id === blockId
      ? { ...block, selections: [], isRewritten: false, prevText: null }
      : block
  );
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
  selectedBlockId: null,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const { selectedBlockId } = get();
    const result = stateFns.setMode(selectedBlockId, mode);
    set({
      mode: result.mode,
      selectedBlockId: result.selectedBlockId,
    });
  },

  selectBlock: (blockId) => {
    const state = get();
    const result = stateFns.selectBlock(state.mode, state.selectedBlockId, blockId);

    // If selecting a new block, clear session state of old block
    if (state.selectedBlockId && state.selectedBlockId !== blockId) {
      set({
        selectedBlockId: result.selectedBlockId,
        blocks: clearBlockSessionState(state.blocks, state.selectedBlockId),
      });
      return;
    }

    // If selecting a block (not deselecting), clear its session state
    if (result.selectedBlockId) {
      set({
        selectedBlockId: result.selectedBlockId,
        blocks: clearBlockSessionState(state.blocks, blockId),
      });
      return;
    }

    // Deselecting - no need to clear session state
    set({ selectedBlockId: result.selectedBlockId });
  },

  clearSelection: () => {
    const { selectedBlockId, blocks } = get();
    const result = stateFns.clearSelection(selectedBlockId, blocks);
    set({
      selectedBlockId: result.selectedBlockId,
      blocks: result.blocks,
    });
  },

  setAwaitingResponse: (value) => {
    set({ isAwaitingResponse: value });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    // Reset all state except settings (which are persisted separately)
    // Using Partial to reset state from other slices
    set({
      threads: [],
      blocks: [],
      cards: [],
      activeThreadId: null,
      mode: 'landing',
      selectedBlockId: null,
      isAwaitingResponse: false,
      error: null,
      streamingMessage: null,
    } as Partial<AppState & UISlice>);
  },
});
