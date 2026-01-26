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
  isSelectionOutsideSection: boolean;
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
  isSelectionOutsideSection: false,
  hasInitialResponse: false,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const result = stateFns.setMode(get(), mode);
    set({
      mode: result.mode,
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
      isSelectionOutsideSection: false,
    });
  },

  toggleBlockInSelection: (blockId) => {
    const state = get();
    const block = state.blocks.find((b) => b.id === blockId);

    // If clicking a paragraph while in section mode
    if (state.sectionHeadingId && block?.type !== 'heading') {
      const sectionBlockIds = stateFns.getSectionBlockIds(state, state.sectionHeadingId);
      const isInsideSection = sectionBlockIds.includes(blockId);
      const isAlreadySelected = state.selectedBlockIds.includes(blockId);

      if (isInsideSection) {
        // INSIDE section: single-select only (replace, no multi-select)
        if (isAlreadySelected) {
          // Deselect - go back to section mode (all content implicitly selected)
          set({ selectedBlockIds: [], isSelectionOutsideSection: false });
        } else {
          // Clear selections from previously selected block(s) before switching
          const previousSelectedIds = state.selectedBlockIds;
          const updatedBlocks = previousSelectedIds.length > 0
            ? state.blocks.map((b) =>
                previousSelectedIds.includes(b.id)
                  ? { ...b, selections: [], isRewritten: false, prevText: null }
                  : b
              )
            : state.blocks;

          set({
            selectedBlockIds: [blockId],
            isSelectionOutsideSection: false,
            blocks: updatedBlocks,
          });
        }
      } else {
        // OUTSIDE section: multi-select allowed (toggle)
        if (isAlreadySelected) {
          // Remove from selection
          const newSelectedIds = state.selectedBlockIds.filter((id) => id !== blockId);
          const hasOutsideSelection = newSelectedIds.some(
            (id) => !sectionBlockIds.includes(id)
          );
          set({
            selectedBlockIds: newSelectedIds,
            isSelectionOutsideSection: hasOutsideSelection,
          });
        } else {
          // Add to selection
          set({
            selectedBlockIds: [...state.selectedBlockIds, blockId],
            isSelectionOutsideSection: true,
          });
        }
      }
      return;
    }

    // Outside section mode - use normal toggle logic
    const result = stateFns.toggleBlockInSelection(get(), blockId);
    set({ selectedBlockIds: result.selectedBlockIds, isSelectionOutsideSection: false });
  },

  enterSectionMode: (headingId) => {
    // Single-click heading - enter section mode
    const state = get();
    if (state.sectionHeadingId === headingId) {
      // Clicking same heading again - exit section mode
      set({ sectionHeadingId: null, selectedBlockIds: [], isSelectionOutsideSection: false });
    } else {
      // Enter section mode for this heading
      set({ sectionHeadingId: headingId, selectedBlockIds: [], isSelectionOutsideSection: false });
    }
  },

  selectHeadingDirectly: (headingId) => {
    // Double-click heading - select heading itself (not section mode)
    set({ sectionHeadingId: null, selectedBlockIds: [headingId], isSelectionOutsideSection: false });
  },

  clearSelectedBlocks: () => {
    const result = stateFns.clearSelectedBlocks(get());
    set({
      selectedBlockIds: result.selectedBlockIds,
      sectionHeadingId: null,
      isSelectionOutsideSection: false,
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
