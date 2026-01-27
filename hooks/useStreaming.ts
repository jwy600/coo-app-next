/**
 * useStreaming Hook
 *
 * Encapsulates streaming chat completion logic:
 * - Manages streaming state (start, append, flush, clear)
 * - Handles SSE callbacks (onToken, onResponseId, onComplete, onError)
 * - Converts streaming content to final message
 *
 * Extracted from useComposer for better separation of concerns.
 */

'use client';

import { useCallback, useRef } from 'react';
import { useStore } from '@/lib/store/useStore';
import { fetchChatCompletionStream } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import type { Settings } from '@/types/settings';
import type { BlockData } from '@/types/block';

export interface StreamChatParams {
  prompt: string;
  threadId: string;
  messageId: string;
  previousResponseId?: string;
  settings?: Settings;
}

export interface StreamChatCallbacks {
  onComplete?: (blocks: BlockData[], responseId?: string) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseStreamingReturn {
  streamChat: (params: StreamChatParams, callbacks?: StreamChatCallbacks) => Promise<void>;
}

export function useStreaming(): UseStreamingReturn {
  // Streaming state actions
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamToken = useStore((state) => state.appendStreamToken);
  const flushStreamParse = useStore((state) => state.flushStreamParse);
  const setStreamResponseId = useStore((state) => state.setStreamResponseId);
  const clearStream = useStore((state) => state.clearStream);

  // Track response ID during streaming
  const streamResponseIdRef = useRef<string | undefined>(undefined);

  /**
   * Stream a chat completion from the API
   *
   * Handles all streaming state management internally:
   * 1. Starts streaming state with message ID
   * 2. Processes tokens as they arrive
   * 3. On completion, flushes parse and calls onComplete with final blocks
   * 4. On error, clears stream and calls onError
   */
  const streamChat = useCallback(
    async (params: StreamChatParams, callbacks?: StreamChatCallbacks) => {
      const { prompt, threadId, messageId, previousResponseId, settings } = params;

      // Initialize streaming state
      startStreaming(messageId, threadId);
      streamResponseIdRef.current = undefined;

      try {
        await fetchChatCompletionStream(
          prompt,
          {
            onToken: (token: string) => {
              appendStreamToken(token);
            },
            onResponseId: (responseId: string) => {
              streamResponseIdRef.current = responseId;
              setStreamResponseId(responseId);
            },
            onComplete: () => {
              // Flush any pending debounced parse to ensure blocks are up-to-date
              flushStreamParse();

              // Get final streaming state
              const finalState = useStore.getState();
              const streamingMessage = finalState.streamingMessage;

              if (streamingMessage && streamingMessage.blocks.length > 0) {
                // Store blocks locally before clearing streaming state
                const finalBlocks = [...streamingMessage.blocks];
                const finalResponseId = streamResponseIdRef.current;

                // Clear streaming state FIRST to prevent double-rendering
                clearStream();

                // Notify caller with final blocks
                callbacks?.onComplete?.(finalBlocks, finalResponseId);
              } else {
                // No blocks to add, just clear
                clearStream();
                callbacks?.onComplete?.([], streamResponseIdRef.current);
              }
            },
            onError: (error: Error) => {
              clearStream();
              const errorMessage = getErrorMessage(
                error,
                'We hit a snag getting that response. Try again.'
              );
              callbacks?.onError?.(errorMessage);
            },
          },
          threadId,
          previousResponseId,
          settings
        );
      } catch (err) {
        clearStream();
        const errorMessage = getErrorMessage(
          err,
          'We hit a snag getting that response. Try again.'
        );
        callbacks?.onError?.(errorMessage);
      }
    },
    [startStreaming, appendStreamToken, flushStreamParse, setStreamResponseId, clearStream]
  );

  return { streamChat };
}
