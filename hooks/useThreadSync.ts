/**
 * useThreadSync Hook (Simplified)
 *
 * Simplified version to prevent infinite loops
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store/useStore';
import { loadThreadFromSupabase } from '@/lib/supabase/threads';
import { loadMessagesForThread } from '@/lib/supabase/messages';
import { loadBlocksForThread } from '@/lib/supabase/blocks';
import { loadCardsForThread } from '@/lib/supabase/cards';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import type { Thread } from '@/types/thread';
import type { Message } from '@/types/message';
import type { Block } from '@/types/block';
import type { Card } from '@/types/card';

export interface UseThreadSyncReturn {
  isLoading: boolean;
  error: string | null;
  thread: Thread | null;
}

export interface UseThreadSyncOptions {
  initialThread?: Thread;
  initialMessages?: Message[];
  initialBlocks?: Block[];
  initialCards?: Card[];
}

export function useThreadSync(
  threadId: string | null,
  options: UseThreadSyncOptions = {}
): UseThreadSyncReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const loadedThreadRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no threadId
    if (!threadId) return;

    // Skip if already loaded this thread
    if (loadedThreadRef.current === threadId) return;

    // Skip if already loading
    if (loadingRef.current) return;

    // Check if thread data is already fully loaded
    // Threads from landing page have empty messages array, so need to be loaded
    const state = useStore.getState();
    const threadFromStore = state.threads.find((t) => t.id === threadId);

    // Only skip loading if thread has messages (meaning it's been fully loaded)
    if (threadFromStore && threadFromStore.messages.length > 0) {
      loadedThreadRef.current = threadId;
      return;
    }

    // Load from Supabase
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    const loadThread = async () => {
      const maxRetries = 5;
      const baseDelay = 500; // Start with 500ms

      /**
       * Check if an error is transient (worth retrying)
       * - Network errors are transient
       * - 5xx server errors are transient
       * - 404 Not Found may be transient (replication lag)
       * - 4xx client errors (except 404) are permanent
       */
      const isTransientError = (error: unknown): boolean => {
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          // Network errors
          if (message.includes('network') || message.includes('fetch')) return true;
          // Not found - may be replication lag for newly created threads
          if (message.includes('not found')) return true;
        }
        return true; // Default to retrying unknown errors
      };

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const threadData = await loadThreadFromSupabase(threadId);

          if (!threadData) {
            const notFoundError = new Error('Thread not found');
            if (attempt < maxRetries - 1 && isTransientError(notFoundError)) {
              // Exponential backoff: 500ms, 1000ms, 2000ms, 4000ms
              const delay = baseDelay * Math.pow(2, attempt);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw notFoundError;
          }

          const messages = await loadMessagesForThread(threadId);
          const blocks = await loadBlocksForThread(threadId);
          const cards = await loadCardsForThread(threadId);

          const completeThread: Thread = {
            id: threadData.id,
            title: threadData.title,
            createdAt: threadData.createdAt,
            updatedAt: threadData.updatedAt,
            messages: messages.map((msg) => ({
              id: msg.id,
              threadId: msg.threadId,
              role: msg.role,
              createdAt: msg.createdAt,
              content: blocks
                .filter((b) => b.messageId === msg.id)
                .map((b) => ({ blockId: b.id })),
              meta: msg.meta || {},
            })),
          };

          // Merge into store
          useStore.getState().mergeThreadFromSupabase(completeThread, messages, blocks);
          // Set cards for this thread
          useStore.getState().setCards(cards);
          setIsLoading(false);
          loadingRef.current = false;
          loadedThreadRef.current = threadId;
          return;
        } catch (err) {
          // Don't retry permanent errors
          if (!isTransientError(err)) {
            const errorMessage = getErrorMessage(err, 'Failed to load thread');
            setError(errorMessage);
            setIsLoading(false);
            loadingRef.current = false;
            return;
          }

          if (attempt === maxRetries - 1) {
            // Final attempt failed
            const errorMessage = getErrorMessage(err, 'Failed to load thread');
            setError(errorMessage);
            setIsLoading(false);
            loadingRef.current = false;
          } else {
            // Exponential backoff before retry
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    };

    loadThread();
  }, [threadId]);

  // Get thread from store for return value
  const thread = useStore((state) =>
    state.threads.find((t) => t.id === threadId) || null
  );

  return {
    isLoading,
    error,
    thread,
  };
}
