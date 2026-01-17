/**
 * UI slice - Wraps pure UI state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';

export interface UISlice {
  mode: AppMode;
  selectedBlockId: string | null;
  hasInitialResponse: boolean;
  isAwaitingResponse: boolean;
  error: string | null;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleSelectedBlock: (blockId: string) => void;
  clearSelectedBlock: () => void;
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
  selectedBlockId: null,
  hasInitialResponse: false,
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const result = stateFns.setMode(get(), mode);
    set({
      mode: result.mode,
      selectedBlockId: result.selectedBlockId,
    });
  },

  toggleSelectedBlock: (blockId) => {
    const result = stateFns.toggleSelectedBlock(get(), blockId);
    set({ selectedBlockId: result.selectedBlockId });
  },

  clearSelectedBlock: () => {
    const result = stateFns.clearSelectedBlock(get());
    set({
      selectedBlockId: result.selectedBlockId,
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
