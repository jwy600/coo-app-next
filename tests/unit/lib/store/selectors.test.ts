import { describe, it, expect, beforeEach } from 'vitest';
import {
  useStore,
  selectActiveThread,
  selectMessagesByThread,
} from '@/lib/store/useStore';
import type { StoreState } from '@/lib/store/useStore';

describe('store selectors', () => {
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

  describe('selectActiveThread', () => {
    it('returns undefined when there is no active thread', () => {
      const state = useStore.getState() as StoreState;
      expect(selectActiveThread(state)).toBeUndefined();
    });

    it('returns the matching thread when active', () => {
      useStore.getState().createThread('thread-1');
      const state = useStore.getState() as StoreState;
      expect(selectActiveThread(state)?.id).toBe('thread-1');
    });
  });

  describe('selectMessagesByThread', () => {
    it('returns the messages for the named thread', () => {
      useStore.getState().createThread('thread-1');
      useStore.getState().addUserMessage('Hello');
      useStore.getState().addAssistantMessage('Hi');

      const state = useStore.getState() as StoreState;
      const messages = selectMessagesByThread('thread-1')(state);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('returns an empty array when the thread does not exist', () => {
      const state = useStore.getState() as StoreState;
      expect(selectMessagesByThread('missing')(state)).toEqual([]);
    });
  });
});
