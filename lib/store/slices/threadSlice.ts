/**
 * Thread slice — wraps pure thread/message state functions.
 *
 * Persistence is handled centrally by Zustand's persist middleware in
 * useStore.ts.
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { idFactory } from '@/lib/utils/idFactory';
import { nowFactory } from '@/lib/utils/nowFactory';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { AppState } from '@/types/state';

export interface ThreadSlice {
  threads: Thread[];
  activeThreadId: string | null;

  createThread: (threadId?: string) => void;
  setActiveThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  deleteThread: (threadId: string) => string | null;
  addUserMessage: (text: string) => Message;
  addAssistantMessage: (text: string, responseId?: string) => Message;
}

const initialState = stateFns.createInitialState(idFactory, nowFactory);

export const threadSlice: StateCreator<
  AppState & ThreadSlice,
  [],
  [],
  ThreadSlice
> = (set, get) => ({
  threads: initialState.threads,
  activeThreadId: initialState.activeThreadId,

  createThread: (threadId = idFactory()) => {
    const result = stateFns.createThread(get(), threadId, nowFactory);
    set({
      threads: result.state.threads,
      activeThreadId: result.state.activeThreadId,
    });
  },

  setActiveThread: (threadId) => {
    const next = stateFns.setActiveThread(get(), threadId);
    set({ activeThreadId: next.activeThreadId });
  },

  updateThreadTitle: (threadId, title) => {
    const next = stateFns.updateThreadTitle(get(), threadId, title, nowFactory);
    set({ threads: next.threads });
  },

  deleteThread: (threadId) => {
    const result = stateFns.deleteThread(get(), threadId);

    if (result.nextActiveThreadId === null) {
      set({
        threads: result.state.threads,
        activeThreadId: result.state.activeThreadId,
        mode: 'landing',
      });
    } else {
      set({
        threads: result.state.threads,
        activeThreadId: result.state.activeThreadId,
      });
    }

    return result.nextActiveThreadId;
  },

  addUserMessage: (text) => {
    const result = stateFns.addUserMessage(get(), text, idFactory, nowFactory);
    set({ threads: result.state.threads });
    return result.message;
  },

  addAssistantMessage: (text, responseId) => {
    const activeThreadId = get().activeThreadId;
    if (!activeThreadId) {
      throw new Error('Cannot add assistant message: no active thread');
    }
    const result = stateFns.addAssistantMessageToThread(
      get(),
      activeThreadId,
      text,
      idFactory,
      nowFactory,
      responseId,
    );
    set({ threads: result.state.threads });
    return result.message;
  },
});
