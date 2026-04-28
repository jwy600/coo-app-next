/**
 * Tests for the Zustand store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, selectActiveThread } from '@/lib/store/useStore';

describe('useStore', () => {
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

  describe('thread actions', () => {
    it('createThread creates and activates a thread', () => {
      useStore.getState().createThread('test-thread-id');
      const state = useStore.getState();
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].id).toBe('test-thread-id');
      expect(state.activeThreadId).toBe('test-thread-id');
    });

    it('setActiveThread updates the active thread id', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().createThread('thread-2');
      useStore.getState().setActiveThread('thread-1');
      expect(useStore.getState().activeThreadId).toBe('thread-1');
    });

    it('updateThreadTitle renames a thread', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().updateThreadTitle('thread-1', 'Renamed');
      expect(useStore.getState().threads[0].title).toBe('Renamed');
    });

    it('addUserMessage appends a text message', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addUserMessage('Hello, world!');
      expect(message.role).toBe('user');
      expect(message.text).toBe('Hello, world!');
    });

    it('addAssistantMessage appends a text message', () => {
      useStore.getState().createThread('thread-1');
      const message = useStore.getState().addAssistantMessage('## Hi\n\nBody.');
      expect(message.role).toBe('assistant');
      expect(message.text).toBe('## Hi\n\nBody.');
    });
  });

  describe('UI actions', () => {
    it('setMode toggles between landing and thread', () => {
      useStore.getState().setMode('thread');
      expect(useStore.getState().mode).toBe('thread');
      useStore.getState().setMode('landing');
      expect(useStore.getState().mode).toBe('landing');
    });

    it('setAwaitingResponse toggles the indicator', () => {
      useStore.getState().setAwaitingResponse(true);
      expect(useStore.getState().isAwaitingResponse).toBe(true);
      useStore.getState().setAwaitingResponse(false);
      expect(useStore.getState().isAwaitingResponse).toBe(false);
    });
  });

  describe('selectors', () => {
    it('selectActiveThread returns the active thread', () => {
      useStore.getState().createThread('thread-1');
      const thread = selectActiveThread(useStore.getState());
      expect(thread?.id).toBe('thread-1');
    });
  });

  describe('immutability', () => {
    it('addUserMessage produces a new threads reference', () => {
      useStore.getState().createThread('thread-1');
      const before = useStore.getState().threads;
      useStore.getState().addUserMessage('New message');
      expect(useStore.getState().threads).not.toBe(before);
    });
  });
});
