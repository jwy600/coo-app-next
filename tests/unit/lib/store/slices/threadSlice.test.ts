import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('threadSlice', () => {
  beforeEach(() => {
    useStore.setState({
      threads: [],
      activeThreadId: null,
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      streamingMessageId: null,
    });
  });

  describe('deleteThread', () => {
    it('removes the thread and returns the next id', () => {
      const store = useStore.getState();
      store.createThread('thread-1');
      store.createThread('thread-2');

      const nextId = useStore.getState().deleteThread('thread-2');

      expect(useStore.getState().threads).toHaveLength(1);
      expect(nextId).toBe('thread-1');
    });

    it('returns to landing mode when the last thread is deleted', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().setMode('thread');

      useStore.getState().deleteThread('thread-1');

      expect(useStore.getState().threads).toHaveLength(0);
      expect(useStore.getState().mode).toBe('landing');
      expect(useStore.getState().activeThreadId).toBeNull();
    });
  });

  describe('addUserMessage / addAssistantMessage', () => {
    it('appends text-based user messages to the active thread', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addUserMessage('Hello');
      expect(message.text).toBe('Hello');
      expect(useStore.getState().threads[0].messages).toHaveLength(1);
    });

    it('throws when adding an assistant message without an active thread', () => {
      useStore.setState({ activeThreadId: null });
      expect(() => useStore.getState().addAssistantMessage('Hi')).toThrow(
        'no active thread',
      );
    });

    it('stores the response id in meta when provided', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addAssistantMessage('Reply', 'resp-123');
      expect(message.meta.openaiResponseId).toBe('resp-123');
    });
  });

  describe('updateThreadTitle', () => {
    it('updates the named thread', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().updateThreadTitle('thread-1', 'Renamed');
      expect(useStore.getState().threads[0].title).toBe('Renamed');
    });
  });
});
