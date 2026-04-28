import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('streamingSlice', () => {
  beforeEach(() => {
    useStore.setState({ streamingMessageId: null });
  });

  it('startStreaming records the message id currently receiving tokens', () => {
    useStore.getState().startStreaming('msg-1');
    expect(useStore.getState().streamingMessageId).toBe('msg-1');
  });

  it('clearStream resets streamingMessageId to null', () => {
    useStore.getState().startStreaming('msg-1');
    useStore.getState().clearStream();
    expect(useStore.getState().streamingMessageId).toBeNull();
  });
});
