/**
 * useStreaming Hook
 *
 * Streams a chat completion into a freshly-created assistant message.
 * Tokens are appended directly to `message.text`; the OpenAI response id
 * is stored in `message.meta.openaiResponseId` once known.
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';
import { fetchChatCompletionStream } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import type { Settings } from '@/types/settings';

export interface StreamChatParams {
  prompt: string;
  threadId: string;
  previousResponseId?: string;
  settings?: Settings;
}

export interface StreamingCallbacks {
  onComplete?: (messageId: string, responseId?: string) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseStreamingReturn {
  streamChat: (params: StreamChatParams, callbacks?: StreamingCallbacks) => Promise<void>;
}

export function useStreaming(): UseStreamingReturn {
  const addAssistantMessage = useStore((state) => state.addAssistantMessage);
  const appendMessageText = useStore((state) => state.appendMessageText);
  const setMessageResponseId = useStore((state) => state.setMessageResponseId);
  const removeMessage = useStore((state) => state.removeMessage);
  const startStreaming = useStore((state) => state.startStreaming);
  const clearStream = useStore((state) => state.clearStream);

  const streamChat = useCallback(
    async (params: StreamChatParams, callbacks?: StreamingCallbacks) => {
      const { prompt, threadId, previousResponseId, settings } = params;

      const message = addAssistantMessage('');
      const messageId = message.id;
      startStreaming(messageId);

      let responseId: string | undefined;

      try {
        await fetchChatCompletionStream(
          prompt,
          {
            onToken: (token: string) => {
              appendMessageText(messageId, token);
            },
            onResponseId: (id: string) => {
              responseId = id;
              setMessageResponseId(messageId, id);
            },
            onComplete: () => {
              const finalText = useStore
                .getState()
                .threads.flatMap((t) => t.messages)
                .find((m) => m.id === messageId)?.text ?? '';

              clearStream();

              if (finalText.length === 0) {
                removeMessage(messageId);
                callbacks?.onComplete?.(messageId, responseId);
                return;
              }

              callbacks?.onComplete?.(messageId, responseId);
            },
            onError: (error: Error) => {
              clearStream();
              removeMessage(messageId);
              const errorMessage = getErrorMessage(
                error,
                'We hit a snag getting that response. Try again.',
              );
              callbacks?.onError?.(errorMessage);
            },
          },
          threadId,
          previousResponseId,
          settings,
        );
      } catch (err) {
        clearStream();
        removeMessage(messageId);
        const errorMessage = getErrorMessage(
          err,
          'We hit a snag getting that response. Try again.',
        );
        callbacks?.onError?.(errorMessage);
      }
    },
    [
      addAssistantMessage,
      appendMessageText,
      setMessageResponseId,
      removeMessage,
      startStreaming,
      clearStream,
    ],
  );

  return { streamChat };
}
