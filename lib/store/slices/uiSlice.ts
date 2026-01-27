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

    // If clicking the section's own heading - exit section mode, select heading
    if (state.sectionHeadingId && blockId === state.sectionHeadingId) {
      set({
        sectionHeadingId: null,
        selectedBlockIds: [blockId],
        isSelectionOutsideSection: false,
      });
      return;
    }

    // If clicking any block while in section mode (headings outside section treated same as paragraphs)
    if (state.sectionHeadingId) {
      const sectionBlockIds = stateFns.getSectionBlockIds(state.blocks, state.sectionHeadingId);
      const isInsideSection = sectionBlockIds.includes(blockId);
      const isAlreadySelected = state.selectedBlockIds.includes(blockId);

      if (isInsideSection) {
        // INSIDE section: single-select only (replace, no multi-select)
        if (isAlreadySelected) {
          // Deselect - go back to section mode (all content implicitly selected)
          // Clear selections from the deselected block
          const updatedBlocks = state.blocks.map((b) =>
            b.id === blockId
              ? { ...b, selections: [], isRewritten: false, prevText: null }
              : b
          );
          set({ selectedBlockIds: [], isSelectionOutsideSection: false, blocks: updatedBlocks });
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
    // Double-click heading gutter - enter/switch section mode
    const result = stateFns.enterSectionMode(get().sectionHeadingId, headingId);
    if (result) {
      set(result);
    }
    // null = same heading double-clicked, no change
  },

  selectHeadingDirectly: (headingId) => {
    // Single-click heading gutter - select heading as block
    const state = get();

    // If in section mode
    if (state.sectionHeadingId) {
      if (headingId === state.sectionHeadingId) {
        // Same heading - exit section mode, select it as block
        set({ sectionHeadingId: null, selectedBlockIds: [headingId], isSelectionOutsideSection: false });
      } else {
        // Different heading - keep section mode, toggle heading in selection (card + separate block)
        const isAlreadySelected = state.selectedBlockIds.includes(headingId);
        if (isAlreadySelected) {
          const newSelectedIds = state.selectedBlockIds.filter((id) => id !== headingId);
          set({
            selectedBlockIds: newSelectedIds,
            isSelectionOutsideSection: newSelectedIds.length > 0,
          });
        } else {
          set({
            selectedBlockIds: [...state.selectedBlockIds, headingId],
            isSelectionOutsideSection: true,
          });
        }
      }
      return;
    }

    // Not in section mode - select heading directly
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

  setAwaitingResponse: (value) => {
    set({ isAwaitingResponse: value });
  },

  setError: (error) => {
    set({ error });
  },
});
