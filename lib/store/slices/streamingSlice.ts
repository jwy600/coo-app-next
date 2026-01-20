/**
 * Streaming slice - Manages streaming message state
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
  setStreamResponseId: (responseId: string) => void;
  clearStream: () => void;
}

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
    set({
      streamingMessage: {
        ...current,
        accumulatedText: newText,
        blocks: splitIntoBlocks(newText),
      },
    });
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
