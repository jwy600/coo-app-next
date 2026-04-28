/**
 * UI slice — manages ephemeral UI state (mode, awaiting/error indicators).
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState } from '@/types/state';

export interface UISlice {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;

  setMode: (mode: AppMode) => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const uiSlice: StateCreator<AppState & UISlice, [], [], UISlice> = (set) => ({
  mode: 'landing',
  isAwaitingResponse: false,
  error: null,

  setMode: (mode) => {
    const result = stateFns.setMode(mode);
    set({ mode: result.mode });
  },

  setAwaitingResponse: (value) => set({ isAwaitingResponse: value }),
  setError: (error) => set({ error }),

  reset: () => {
    set({
      threads: [],
      activeThreadId: null,
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      streamingMessageId: null,
    } as Partial<AppState & UISlice>);
  },
});
