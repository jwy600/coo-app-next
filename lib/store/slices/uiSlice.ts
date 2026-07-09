/**
 * UI slice — manages ephemeral UI state (mode, awaiting/error indicators).
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppMode, AppState, ComposerAttachment, LandingComposerMode } from '@/types/state';

export interface UISlice {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;
  composerPrompt: string;
  composerAttachment: ComposerAttachment | null;
  landingComposerMode: LandingComposerMode;

  setMode: (mode: AppMode) => void;
  setAwaitingResponse: (value: boolean) => void;
  setError: (error: string | null) => void;
  setComposerPrompt: (value: string) => void;
  setComposerAttachment: (attachment: ComposerAttachment | null) => void;
  setLandingComposerMode: (mode: LandingComposerMode) => void;
  reset: () => void;
}

export const uiSlice: StateCreator<AppState & UISlice, [], [], UISlice> = (set) => ({
  mode: 'landing',
  isAwaitingResponse: false,
  error: null,
  composerPrompt: '',
  composerAttachment: null,
  landingComposerMode: 'chat',

  setMode: (mode) => {
    const result = stateFns.setMode(mode);
    // Returning to landing starts a clean Chat slate: clear any draft and
    // staged file, and reset the toggle so each visit opens in Chat.
    set(
      mode === 'landing'
        ? {
            mode: result.mode,
            composerPrompt: '',
            composerAttachment: null,
            landingComposerMode: 'chat',
          }
        : { mode: result.mode },
    );
  },

  setAwaitingResponse: (value) => set({ isAwaitingResponse: value }),
  setError: (error) => set({ error }),
  setComposerPrompt: (value) => set({ composerPrompt: value }),
  setComposerAttachment: (attachment) => set({ composerAttachment: attachment }),
  // Switching Chat↔Read is mutually exclusive with staged content — clear both
  // so a draft prompt or staged file can't leak into the other mode.
  setLandingComposerMode: (mode) =>
    set({ landingComposerMode: mode, composerPrompt: '', composerAttachment: null }),

  reset: () => {
    set({
      threads: [],
      activeThreadId: null,
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      streamingMessageId: null,
      focus: null,
      composerPrompt: '',
      composerAttachment: null,
      landingComposerMode: 'chat',
    } as Partial<AppState & UISlice>);
  },
});
