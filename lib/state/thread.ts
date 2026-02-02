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
  title: string = 'current thread'
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
    title: 'current thread',
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

/**
 * Result of deleteThread - contains updated state and next thread to navigate to
 */
export interface DeleteThreadResult {
  state: AppState;
  nextActiveThreadId: string | null;
}

/**
 * Delete a thread from state
 *
 * - Removes thread from threads array
 * - Removes all blocks belonging to that thread's messages
 * - Removes all cards belonging to that thread's messages
 * - Determines the next active thread (previous > next > null)
 *
 * @param state - Current application state
 * @param threadId - ID of the thread to delete
 * @returns New state with thread removed and next active thread ID
 */
export const deleteThread = (
  state: AppState,
  threadId: string
): DeleteThreadResult => {
  const thread = getThreadById(state, threadId);
  if (!thread) {
    return { state, nextActiveThreadId: state.activeThreadId };
  }

  // Get message IDs for the thread to filter blocks and cards
  const messageIds = new Set(thread.messages.map((m) => m.id));

  // Determine next active thread
  const threadIndex = state.threads.findIndex((t) => t.id === threadId);
  const remainingThreads = state.threads.filter((t) => t.id !== threadId);

  let nextActiveThreadId: string | null = null;
  if (remainingThreads.length > 0) {
    // Prefer previous thread, fall back to next (which is now at same index)
    const nextIndex = Math.min(threadIndex, remainingThreads.length - 1);
    nextActiveThreadId = remainingThreads[nextIndex >= 0 ? nextIndex : 0].id;
  }

  // Filter out blocks and cards belonging to the deleted thread
  const filteredBlocks = state.blocks.filter((b) => !messageIds.has(b.messageId));
  const filteredCards = state.cards.filter((c) => !messageIds.has(c.messageId));

  return {
    state: {
      ...state,
      threads: remainingThreads,
      blocks: filteredBlocks,
      cards: filteredCards,
      activeThreadId: nextActiveThreadId ?? state.activeThreadId,
    },
    nextActiveThreadId,
  };
};
