import { AppState } from '@/types/state';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';

/**
 * Thread-related state transformations
 */

export const getThreadById = (state: AppState, threadId: string): Thread | undefined =>
  state.threads.find((thread) => thread.id === threadId);

export const setActiveThread = (state: AppState, threadId: string): AppState => ({
  ...state,
  activeThreadId: threadId,
});

export const updateThreadTitle = (
  state: AppState,
  threadId: string,
  title: string,
  nowFactory: () => number
): AppState => ({
  ...state,
  threads: state.threads.map((thread) =>
    thread.id === threadId
      ? { ...thread, title, updatedAt: nowFactory() }
      : thread
  ),
});

export const createThread = (
  state: AppState,
  threadId: string,
  nowFactory: () => number,
  title: string = 'Main'
): { state: AppState; thread: Thread } => {
  const now = nowFactory();
  const thread: Thread = {
    id: threadId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return {
    state: {
      ...state,
      activeThreadId: threadId,
      threads: [...state.threads, thread],
    },
    thread,
  };
};

export const updateThreadMessages = (
  state: AppState,
  threadId: string,
  updater: (messages: Message[]) => Message[],
  nowFactory: () => number
): AppState => {
  const threads = state.threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    const nextMessages = updater(thread.messages);
    return { ...thread, messages: nextMessages, updatedAt: nowFactory() };
  });
  return { ...state, threads };
};

const ensureThreadExists = (
  state: AppState,
  threadId: string,
  nowFactory: () => number
): AppState => {
  const existing = getThreadById(state, threadId);
  if (existing) return state;
  const now = nowFactory();
  const thread: Thread = {
    id: threadId,
    title: 'Main',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return { ...state, threads: [...state.threads, thread] };
};
