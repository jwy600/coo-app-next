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

/**
 * Ensure a thread exists in state, creating it if necessary
 * Used when adding messages to potentially non-existent threads
 */
export const ensureThreadExists = (
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

/**
 * Get the OpenAI response ID from the last assistant message in a thread.
 * This is used to chain responses for contextual conversations.
 *
 * @param state - Current application state
 * @param threadId - ID of the thread to search
 * @returns The response ID if found, undefined otherwise
 */
export const getLastAssistantResponseId = (
  state: AppState,
  threadId: string
): string | undefined => {
  const thread = getThreadById(state, threadId);
  if (!thread) return undefined;

  // Search backwards to find the last assistant message with a response ID
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const message = thread.messages[i];
    if (message.role === 'assistant' && message.meta?.openaiResponseId) {
      return message.meta.openaiResponseId as string;
    }
  }

  return undefined;
};
