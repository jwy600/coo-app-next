/**
 * Streaming slice - Manages streaming message state
 *
 * Uses paragraph-based parsing to avoid re-parsing the entire text on every token.
 * Text updates immediately, but block parsing only occurs when a paragraph break
 * (\n\n) is detected, providing natural semantic updates.
 */

import { StateCreator } from 'zustand';
import { splitIntoBlocks } from '@/lib/state/parser';
import { BlockData } from '@/types/block';
import { AppState } from '@/types/state';

export interface StreamingMessage {
  messageId: string;
  threadId: string;
  accumulatedText: string;
  blocks: BlockData[];
  responseId?: string;
}

export interface StreamingSlice {
  streamingMessage: StreamingMessage | null;

  startStreaming: (messageId: string, threadId: string) => void;
  appendStreamToken: (token: string) => void;
  flushStreamParse: () => void;
  setStreamResponseId: (responseId: string) => void;
  clearStream: () => void;
}

/**
 * Check if appending a token created a paragraph break
 * Handles: token contains \n\n, or boundary creates \n\n
 */
const hasParagraphBreak = (prevText: string, token: string): boolean => {
  return (
    token.includes('\n\n') ||
    (prevText.endsWith('\n') && token.startsWith('\n'))
  );
};

export const streamingSlice: StateCreator<
  AppState & StreamingSlice,
  [],
  [],
  StreamingSlice
> = (set, get) => ({
  streamingMessage: null,

  startStreaming: (messageId, threadId) => {
    set({
      streamingMessage: {
        messageId,
        threadId,
        accumulatedText: '',
        blocks: [],
        responseId: undefined,
      },
    });
  },

  appendStreamToken: (token) => {
    const current = get().streamingMessage;
    if (!current) return;

    const newText = current.accumulatedText + token;
    const shouldParse = hasParagraphBreak(current.accumulatedText, token);

    set({
      streamingMessage: {
        ...current,
        accumulatedText: newText,
        blocks: shouldParse ? splitIntoBlocks(newText) : current.blocks,
      },
    });
  },

  flushStreamParse: () => {
    const current = get().streamingMessage;
    if (current) {
      set({
        streamingMessage: {
          ...current,
          blocks: splitIntoBlocks(current.accumulatedText),
        },
      });
    }
  },

  setStreamResponseId: (responseId) => {
    const current = get().streamingMessage;
    if (!current) return;

    set({
      streamingMessage: {
        ...current,
        responseId,
      },
    });
  },

  clearStream: () => set({ streamingMessage: null }),
});
