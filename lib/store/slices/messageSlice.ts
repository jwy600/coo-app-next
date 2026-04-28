/**
 * Message slice — wraps text-based message state functions.
 *
 * Persistence is handled centrally by Zustand's persist middleware in
 * useStore.ts.
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { AppState } from '@/types/state';

export interface MessageSlice {
  appendMessageText: (messageId: string, chunk: string) => void;
  replaceMessageRange: (
    messageId: string,
    range: [number, number],
    replacement: string,
  ) => void;
  setMessageResponseId: (messageId: string, responseId: string) => void;
  removeMessage: (messageId: string) => void;
}

export const messageSlice: StateCreator<
  AppState & MessageSlice,
  [],
  [],
  MessageSlice
> = (set, get) => ({
  appendMessageText: (messageId, chunk) => {
    const next = stateFns.appendMessageText(get(), messageId, chunk);
    set({ threads: next.threads });
  },

  replaceMessageRange: (messageId, range, replacement) => {
    const next = stateFns.replaceMessageRange(get(), messageId, range, replacement);
    set({ threads: next.threads });
  },

  setMessageResponseId: (messageId, responseId) => {
    const next = stateFns.setMessageResponseId(get(), messageId, responseId);
    set({ threads: next.threads });
  },

  removeMessage: (messageId) => {
    const next = stateFns.removeMessage(get(), messageId);
    set({ threads: next.threads });
  },
});
