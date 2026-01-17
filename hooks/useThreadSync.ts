/**
 * useThreadSync Hook
 *
 * Loads thread data from Supabase on mount and syncs to store.
 * Can accept server-loaded initial data to avoid redundant fetches.
 *
 * Reference: legacy/app.js lines 133-167 (loadThreadFromSupabase)
 * Phase 8: Updated to accept initial data from server
 */

'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store/useStore';
import { loadThreadFromSupabase } from '@/lib/supabase/threads';
import { loadMessagesForThread } from '@/lib/supabase/messages';
import { loadBlocksForThread } from '@/lib/supabase/blocks';
import type { Thread } from '@/types/thread';
import type { Message } from '@/types/message';
import type { Block } from '@/types/block';

export interface UseThreadSyncReturn {
  isLoading: boolean;
  error: string | null;
  thread: Thread | null;
}

export interface UseThreadSyncOptions {
  /** Server-loaded initial thread data (avoids fetch) */
  initialThread?: Thread;
  /** Server-loaded initial messages (avoids fetch) */
  initialMessages?: Message[];
  /** Server-loaded initial blocks (avoids fetch) */
  initialBlocks?: Block[];
}

/**
 * Load thread data from Supabase and sync to store
 *
 * @param threadId - Thread ID to load (null = no loading)
 * @param options - Optional initial data from server
 */
export function useThreadSync(
  threadId: string | null,
  options: UseThreadSyncOptions = {}
): UseThreadSyncReturn {
  const { initialThread, initialMessages, initialBlocks } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(initialThread || null);

  // Store actions
  const mergeThreadFromSupabase = useStore((state) => state.mergeThreadFromSupabase);
  const threads = useStore((state) => state.threads);

  useEffect(() => {
    // Skip if no threadId
    if (!threadId) {
      setThread(null);
      return;
    }

    // If we have initial data from server, use it immediately
    if (initialThread && initialMessages && initialBlocks) {
      mergeThreadFromSupabase(initialThread, initialMessages, initialBlocks);
      setThread(initialThread);
      return;
    }

    // Check if thread already in store (from previous navigation)
    const existingThread = threads.find((t) => t.id === threadId);
    if (existingThread) {
      setThread(existingThread);
      return;
    }

    // Load from Supabase (fallback when no initial data)
    const loadThread = async () => {
      setIsLoading(true);
      setError(null);

      // Retry logic for race condition (thread created but not yet persisted)
      const maxRetries = 5;
      const retryDelay = 800; // ms

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Load thread metadata
          const threadData = await loadThreadFromSupabase(threadId);

          if (!threadData) {
            // If not found and we have retries left, wait and retry
            if (attempt < maxRetries - 1) {
              console.log(`Thread not found, retrying... (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              continue;
            }
            throw new Error('Thread not found');
          }

          // Load messages and blocks (already in app format)
          const messages = await loadMessagesForThread(threadId);
          const blocks = await loadBlocksForThread(threadId);

          // Build complete thread object with messages
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
          mergeThreadFromSupabase(completeThread, messages, blocks);

          setThread(completeThread);
          setError(null);
          break; // Success, exit retry loop
        } catch (err) {
          // If this is the last attempt, set error
          if (attempt === maxRetries - 1) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load thread';
            setError(errorMessage);
            setThread(null);
          }
          // Otherwise, continue to next retry
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadThread();
  }, [threadId, initialThread, initialMessages, initialBlocks, threads, mergeThreadFromSupabase]);

  return {
    isLoading,
    error,
    thread,
  };
}
