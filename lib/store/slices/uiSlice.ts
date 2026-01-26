/**
 * UI slice - Wraps pure UI state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';

export interface UISlice {
  mode: AppMode;
  selectedBlockIds: string[];
  hasInitialResponse: boolean;
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleBlockInSelection: (blockId: string) => void;
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
  hasInitialResponse: false,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const result = stateFns.setMode(get(), mode);
    set({
      mode: result.mode,
      selectedBlockIds: result.selectedBlockIds,
    });
  },

  toggleBlockInSelection: (blockId) => {
    const result = stateFns.toggleBlockInSelection(get(), blockId);
    set({ selectedBlockIds: result.selectedBlockIds });
  },

  clearSelectedBlocks: () => {
    const result = stateFns.clearSelectedBlocks(get());
    set({
      selectedBlockIds: result.selectedBlockIds,
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
