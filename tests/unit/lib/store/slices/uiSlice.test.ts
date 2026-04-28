import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('uiSlice', () => {
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

  describe('setError', () => {
    it('sets and clears the error', () => {
      useStore.getState().setError('Something went wrong');
      expect(useStore.getState().error).toBe('Something went wrong');
      useStore.getState().setError(null);
      expect(useStore.getState().error).toBeNull();
    });
  });

  describe('setMode', () => {
    it('updates the mode', () => {
      useStore.getState().setMode('thread');
      expect(useStore.getState().mode).toBe('thread');
    });
  });

  describe('reset', () => {
    it('resets app state but preserves settings', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().setMode('thread');
      useStore.getState().addAssistantMessage('Body');
      useStore.getState().setAwaitingResponse(true);
      useStore.getState().setError('error');
      useStore.getState().updateModel('gpt-5.4');

      useStore.getState().reset();

      const state = useStore.getState();
      expect(state.threads).toEqual([]);
      expect(state.activeThreadId).toBeNull();
      expect(state.mode).toBe('landing');
      expect(state.isAwaitingResponse).toBe(false);
      expect(state.error).toBeNull();
      expect(state.streamingMessageId).toBeNull();
      expect(state.settings.model).toBe('gpt-5.4');
    });
  });
});
