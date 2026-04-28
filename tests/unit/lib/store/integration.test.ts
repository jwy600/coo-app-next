/**
 * Integration tests for the Zustand store — end-to-end user flows.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('Store integration', () => {
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

  describe('chat flow', () => {
    it('captures a full user → assistant exchange', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      expect(useStore.getState().threads).toHaveLength(1);
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      store.setMode('thread');
      const userMessage = store.addUserMessage('What is TypeScript?');
      expect(userMessage.role).toBe('user');

      const assistantMessage = store.addAssistantMessage(
        'TypeScript is a typed superset of JavaScript.\n\nIt adds optional static typing.',
      );
      expect(assistantMessage.role).toBe('assistant');

      const finalState = useStore.getState();
      expect(finalState.threads[0].messages).toHaveLength(2);
      expect(finalState.threads[0].messages[1].text).toContain('typed superset');
    });
  });

  describe('streaming flow', () => {
    it('appendMessageText accumulates onto the streaming message', () => {
      const store = useStore.getState();
      store.createThread('thread-1');
      const message = store.addAssistantMessage('');
      store.startStreaming(message.id);
      store.appendMessageText(message.id, 'Hello');
      store.appendMessageText(message.id, ' world');
      store.clearStream();

      expect(useStore.getState().threads[0].messages[0].text).toBe('Hello world');
      expect(useStore.getState().streamingMessageId).toBeNull();
    });
  });

  describe('multiple threads', () => {
    it('keeps each thread\'s messages independent', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.addUserMessage('Question 1');

      store.createThread('thread-2');
      store.addUserMessage('Question 2');

      store.setActiveThread('thread-1');
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      const t1 = useStore.getState().threads.find((t) => t.id === 'thread-1');
      const t2 = useStore.getState().threads.find((t) => t.id === 'thread-2');
      expect(t1?.messages).toHaveLength(1);
      expect(t2?.messages).toHaveLength(1);
    });
  });
});
