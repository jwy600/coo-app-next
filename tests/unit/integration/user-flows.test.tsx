/**
 * End-to-end user-flow tests on the post-block data model.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

function resetStore() {
  useStore.setState({
    threads: [],
    activeThreadId: null,
    mode: 'landing',
    isAwaitingResponse: false,
    error: null,
    streamingMessageId: null,
  });
}

describe('User flows', () => {
  beforeEach(resetStore);

  describe('Flow: landing page to new chat', () => {
    it('creates a thread on first submission and appends the user message', () => {
      expect(useStore.getState().mode).toBe('landing');

      useStore.getState().createThread();
      useStore.getState().setMode('thread');

      const threadId = useStore.getState().activeThreadId;
      expect(threadId).toBeTruthy();

      useStore.getState().addUserMessage('Hello');

      const state = useStore.getState();
      expect(state.mode).toBe('thread');
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].messages).toHaveLength(1);
      expect(state.threads[0].messages[0].role).toBe('user');
      expect(state.threads[0].messages[0].text).toBe('Hello');
    });
  });

  describe('Flow: streaming an assistant reply', () => {
    it('appends streamed tokens directly into the assistant message text', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addAssistantMessage('');
      useStore.getState().startStreaming(message.id);
      useStore.getState().appendMessageText(message.id, 'Hel');
      useStore.getState().appendMessageText(message.id, 'lo!');
      useStore.getState().clearStream();

      const stored = useStore.getState().threads[0].messages[0];
      expect(stored.text).toBe('Hello!');
      expect(useStore.getState().streamingMessageId).toBeNull();
    });
  });

  describe('Flow: replacing a range of message text', () => {
    it('splices in a new fragment at the chosen offsets', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addAssistantMessage('Hello world');
      useStore.getState().replaceMessageRange(message.id, [6, 11], 'there');
      const stored = useStore.getState().threads[0].messages[0];
      expect(stored.text).toBe('Hello there');
    });
  });

  describe('Flow: deleting the active thread', () => {
    it('returns to landing when the last thread is removed', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().setMode('thread');
      useStore.getState().addUserMessage('hi');
      useStore.getState().deleteThread('thread-1');

      const state = useStore.getState();
      expect(state.threads).toHaveLength(0);
      expect(state.mode).toBe('landing');
      expect(state.activeThreadId).toBeNull();
    });
  });
});
