/**
 * Thread slice - Wraps pure thread state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { idFactory } from '@/lib/utils/idFactory';
import { nowFactory } from '@/lib/utils/nowFactory';
import { isTestMode } from '@/lib/utils/testMode';
import { persistThreadSnapshot, updateThreadMetadata, deleteThreadFromSupabase } from '@/lib/supabase/threads';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { Block, BlockData } from '@/types/block';
import { AppState } from '@/types/state';

export interface ThreadSlice {
  threads: Thread[];
  activeThreadId: string | null;

  // Actions that wrap pure functions
  createThread: (threadId?: string) => void;
  setActiveThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  deleteThread: (threadId: string) => string | null;
  addUserMessage: (text: string) => { message: Message; blocks: Block[] };
  addAssistantMessage: (blocksData: BlockData[], responseId?: string) => { message: Message; blocks: Block[] };
  mergeThreadFromSupabase: (thread: Thread, messages: Message[], blocks: Block[]) => void;
}

// Initialize with a default thread to ensure app always has at least one thread
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
    const result = stateFns.createThread(
      get(),
      threadId,
      nowFactory
    );
    set({
      threads: result.state.threads,
      activeThreadId: result.state.activeThreadId,
    });
  },

  setActiveThread: (threadId) => {
    const result = stateFns.setActiveThread(get(), threadId);
    set({ activeThreadId: result.activeThreadId });
  },

  updateThreadTitle: (threadId, title) => {
    const result = stateFns.updateThreadTitle(
      get(),
      threadId,
      title,
      nowFactory
    );
    set({ threads: result.threads });

    // Skip database persistence in test mode
    if (isTestMode()) return;

    // Async persistence (non-blocking)
    const thread = stateFns.getThreadById(result, threadId);
    if (thread) {
      updateThreadMetadata(
        threadId,
        title,
        new Date(thread.updatedAt).toISOString()
      ).catch((error) => console.error('Failed to update thread metadata:', error));
    }
  },

  deleteThread: (threadId) => {
    const result = stateFns.deleteThread(get(), threadId);

    // Update local state immediately (optimistic update)
    // If no threads remain, switch to landing mode
    if (result.nextActiveThreadId === null) {
      set({
        threads: result.state.threads,
        blocks: result.state.blocks,
        cards: result.state.cards,
        activeThreadId: result.state.activeThreadId,
        mode: 'landing',
        selectedBlockId: null,
      });
    } else {
      set({
        threads: result.state.threads,
        blocks: result.state.blocks,
        cards: result.state.cards,
        activeThreadId: result.state.activeThreadId,
      });
    }

    // Skip database persistence in test mode
    if (!isTestMode()) {
      // Async database delete (non-blocking)
      deleteThreadFromSupabase(threadId).catch((error) =>
        console.error('Failed to delete thread from database:', error)
      );
    }

    return result.nextActiveThreadId;
  },

  addUserMessage: (text) => {
    const result = stateFns.addUserMessage(
      get(),
      text,
      idFactory,
      nowFactory
    );

    set({
      threads: result.state.threads,
      blocks: result.state.blocks,
    });

    // Skip database persistence in test mode
    if (!isTestMode() && result.state.activeThreadId) {
      // Async persistence (non-blocking)
      const activeThread = stateFns.getThreadById(
        result.state,
        result.state.activeThreadId
      );

      if (activeThread) {
        persistThreadSnapshot({
          threadId: activeThread.id,
          title: activeThread.title,
          createdAt: new Date(activeThread.createdAt).toISOString(),
          updatedAt: new Date(activeThread.updatedAt).toISOString(),
          message: {
            id: result.message.id,
            role: result.message.role,
            createdAt: result.message.createdAt,
            meta: result.message.meta,
          },
          blocks: result.blocks.map((block) => ({
            id: block.id,
            messageId: block.messageId,
            type: block.type,
            text: block.text,
            edited: block.edited,
            selections: block.selections,
            prevText: block.prevText,
            isRewritten: block.isRewritten,
          })),
        }).catch((error) => console.error('Failed to persist user message:', error));
      }
    }

    return { message: result.message, blocks: result.blocks };
  },

  addAssistantMessage: (blocksData, responseId) => {
    const currentActiveThreadId = get().activeThreadId;
    if (!currentActiveThreadId) {
      throw new Error('Cannot add assistant message: no active thread');
    }
    const result = stateFns.addAssistantMessageToThread(
      get(),
      currentActiveThreadId,
      blocksData,
      idFactory,
      nowFactory,
      responseId
    );

    set({
      threads: result.state.threads,
      blocks: result.state.blocks,
    });

    // Skip database persistence in test mode
    if (!isTestMode() && result.state.activeThreadId) {
      // Async persistence (non-blocking)
      const activeThread = stateFns.getThreadById(
        result.state,
        result.state.activeThreadId
      );

      if (activeThread) {
        persistThreadSnapshot({
          threadId: activeThread.id,
          title: activeThread.title,
          createdAt: new Date(activeThread.createdAt).toISOString(),
          updatedAt: new Date(activeThread.updatedAt).toISOString(),
          message: {
            id: result.message.id,
            role: result.message.role,
            createdAt: result.message.createdAt,
            meta: result.message.meta,
          },
          blocks: result.blocks.map((block) => ({
            id: block.id,
            messageId: block.messageId,
            type: block.type,
            text: block.text,
            edited: block.edited,
            selections: block.selections,
            prevText: block.prevText,
            isRewritten: block.isRewritten,
          })),
        }).catch((error) => console.error('Failed to persist assistant message:', error));
      }
    }

    return { message: result.message, blocks: result.blocks };
  },

  mergeThreadFromSupabase: (thread, messages, blocks) => {
    // Use the thread as-is (it already has properly constructed messages with content)
    // The messages parameter is the raw messages from Supabase and is only kept for backwards compatibility

    const currentState = get();
    const existingThread = currentState.threads.find((t) => t.id === thread.id);

    if (existingThread) {
      // Update existing thread
      set({
        threads: currentState.threads.map((t) =>
          t.id === thread.id ? thread : t
        ),
        blocks: [
          ...currentState.blocks.filter((b) =>
            !blocks.some((newBlock) => newBlock.id === b.id)
          ),
          ...blocks,
        ],
      });
    } else {
      // Add new thread
      set({
        threads: [...currentState.threads, thread],
        blocks: [...currentState.blocks, ...blocks],
      });
    }
  },
});
