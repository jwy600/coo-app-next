/**
 * Streaming slice — tracks which assistant message is currently receiving
 * streamed tokens. Token text is appended directly to the message via
 * `messageSlice.appendMessageText`; this slice only owns the in-flight
 * message id (used by the UI to disable focus mode for that message).
 */

import { StateCreator } from 'zustand';
import { AppState } from '@/types/state';

export interface StreamingSlice {
  streamingMessageId: string | null;

  startStreaming: (messageId: string) => void;
  clearStream: () => void;
}

export const streamingSlice: StateCreator<
  AppState & StreamingSlice,
  [],
  [],
  StreamingSlice
> = (set) => ({
  streamingMessageId: null,

  startStreaming: (messageId) => set({ streamingMessageId: messageId }),
  clearStream: () => set({ streamingMessageId: null }),
});
