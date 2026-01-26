/**
 * UI slice - Wraps pure UI state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';

export interface UISlice {
  mode: AppMode;
  selectedBlockIds: string[];
  sectionHeadingId: string | null;
  hasInitialResponse: boolean;
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleBlockInSelection: (blockId: string) => void;
  enterSectionMode: (headingId: string) => void;
  selectHeadingDirectly: (headingId: string) => void;
  clearSelectedBlocks: () => void;
  setHasInitialResponse: (value: boolean) => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const uiSlice: StateCreator<
  AppState & UISlice,
  [],
  [],
  UISlice
> = (set, get) => ({
  mode: 'landing',
  selectedBlockIds: [],
  sectionHeadingId: null,
  hasInitialResponse: false,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const result = stateFns.setMode(get(), mode);
    set({
      mode: result.mode,
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
    });
  },

  toggleBlockInSelection: (blockId) => {
    const state = get();
    const block = state.blocks.find((b) => b.id === blockId);

    // If clicking a paragraph while in section mode, narrow selection to just that paragraph
    if (state.sectionHeadingId && block?.type !== 'heading') {
      const isAlreadySelected = state.selectedBlockIds.includes(blockId);
      if (isAlreadySelected) {
        // Deselect - go back to section mode (all content implicitly selected)
        set({ selectedBlockIds: [] });
      } else {
        // Narrow to this paragraph only (replace, don't add - no multi-select in section mode)
        set({ selectedBlockIds: [blockId] });
      }
      return;
    }

    // Outside section mode - use normal toggle logic
    const result = stateFns.toggleBlockInSelection(get(), blockId);
    set({ selectedBlockIds: result.selectedBlockIds });
  },

  enterSectionMode: (headingId) => {
    // Single-click heading - enter section mode
    const state = get();
    if (state.sectionHeadingId === headingId) {
      // Clicking same heading again - exit section mode
      set({ sectionHeadingId: null, selectedBlockIds: [] });
    } else {
      // Enter section mode for this heading
      set({ sectionHeadingId: headingId, selectedBlockIds: [] });
    }
  },

  selectHeadingDirectly: (headingId) => {
    // Double-click heading - select heading itself (not section mode)
    set({ sectionHeadingId: null, selectedBlockIds: [headingId] });
  },

  clearSelectedBlocks: () => {
    const result = stateFns.clearSelectedBlocks(get());
    set({
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
      blocks: result.blocks,  // Update blocks to clear session state
    });
  },

  setHasInitialResponse: (value) => {
    const result = stateFns.setHasInitialResponse(get(), value);
    set({ hasInitialResponse: result.hasInitialResponse });
  },

  setAwaitingResponse: (value) => {
    set({ isAwaitingResponse: value });
  },

  setError: (error) => {
    set({ error });
  },
});
