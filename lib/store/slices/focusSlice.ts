/**
 * Focus slice — wraps pure focus-editor state functions.
 *
 * Holds at most one in-flight `{ messageId, range, buffer, notes[] }`.
 * The buffer auto-saves into the message on `closeEditor` via
 * `replaceMessageRange`. Not persisted (purely UI state).
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppState } from '@/types/state';
import { FocusActive } from '@/types/state/ui';

export interface FocusSlice {
  focus: FocusActive | null;

  openEditor: (messageId: string, range: [number, number]) => void;
  closeEditor: () => void;
  updateBuffer: (text: string) => void;
  appendNote: (text: string) => void;
  setRewriteResult: (text: string) => void;
  setShortcutResult: (text: string) => void;
  revertRewrite: () => void;
  setFocusLastResponseId: (responseId: string) => void;
}

export const focusSlice: StateCreator<
  AppState & FocusSlice,
  [],
  [],
  FocusSlice
> = (set, get) => ({
  focus: null,

  openEditor: (messageId, range) => {
    const next = stateFns.openEditor(get(), messageId, range);
    set({ focus: next.focus });
  },

  closeEditor: () => {
    const next = stateFns.closeEditor(get());
    set({ threads: next.threads, focus: next.focus, composerPrompt: '' });
  },

  updateBuffer: (text) => {
    const next = stateFns.updateBuffer(get(), text);
    set({ focus: next.focus });
  },

  appendNote: (text) => {
    const next = stateFns.appendNote(get(), text);
    set({ focus: next.focus });
  },

  setRewriteResult: (text) => {
    const next = stateFns.setRewriteResult(get(), text);
    set({ focus: next.focus });
  },

  setShortcutResult: (text) => {
    const next = stateFns.setShortcutResult(get(), text);
    set({ focus: next.focus });
  },

  revertRewrite: () => {
    const next = stateFns.revertRewrite(get());
    set({ focus: next.focus });
  },

  setFocusLastResponseId: (responseId) => {
    const next = stateFns.setFocusLastResponseId(get(), responseId);
    set({ focus: next.focus });
  },
});
