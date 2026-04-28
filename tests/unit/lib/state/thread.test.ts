import { describe, it, expect } from 'vitest';
import {
  deleteThread,
  ensureThreadExists,
  getLastAssistantResponseId,
} from '@/lib/state/thread';
import type { AppState } from '@/types/state';
import type { Thread } from '@/types/thread';

const nowFactory = () => 1000;

const makeThread = (id: string, messageIds: string[] = []): Thread => ({
  id,
  title: `Thread ${id}`,
  createdAt: 1000,
  updatedAt: 1000,
  messages: messageIds.map((mid) => ({
    id: mid,
    threadId: id,
    role: 'user' as const,
    text: '',
    createdAt: 1000,
    meta: {},
  })),
});

const makeState = (
  threads: Thread[],
  activeThreadId: string | null = null,
): AppState =>
  ({
    threads,
    activeThreadId,
    mode: 'thread',
    isAwaitingResponse: false,
    error: null,
  }) as AppState;

describe('deleteThread', () => {
  it('removes the thread from threads', () => {
    const state = makeState([makeThread('t1'), makeThread('t2')], 't1');
    const result = deleteThread(state, 't1');
    expect(result.state.threads).toHaveLength(1);
    expect(result.state.threads[0].id).toBe('t2');
  });

  it('returns the next active thread id', () => {
    const state = makeState(
      [makeThread('t1'), makeThread('t2'), makeThread('t3')],
      't2',
    );
    const result = deleteThread(state, 't2');
    expect(result.nextActiveThreadId).toBe('t3');
  });

  it('falls back to the next thread when deleting the first', () => {
    const state = makeState([makeThread('t1'), makeThread('t2')], 't1');
    const result = deleteThread(state, 't1');
    expect(result.nextActiveThreadId).toBe('t2');
  });

  it('returns null when the last thread is deleted', () => {
    const state = makeState([makeThread('t1')], 't1');
    const result = deleteThread(state, 't1');
    expect(result.nextActiveThreadId).toBeNull();
    expect(result.state.threads).toHaveLength(0);
  });

  it('is a no-op for an unknown thread id', () => {
    const state = makeState([makeThread('t1')], 't1');
    const result = deleteThread(state, 'missing');
    expect(result.state.threads).toHaveLength(1);
    expect(result.nextActiveThreadId).toBe('t1');
  });
});

describe('ensureThreadExists', () => {
  it('returns the same state when the thread exists', () => {
    const state = makeState([makeThread('t1')]);
    const result = ensureThreadExists(state, 't1', nowFactory);
    expect(result).toBe(state);
  });

  it('creates a thread when missing', () => {
    const state = makeState([]);
    const result = ensureThreadExists(state, 'new-thread', nowFactory);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe('new-thread');
  });
});

describe('getLastAssistantResponseId', () => {
  it('returns undefined when the thread has no assistant messages', () => {
    const state = makeState([makeThread('t1', ['m1'])], 't1');
    expect(getLastAssistantResponseId(state, 't1')).toBeUndefined();
  });

  it('returns the most recent response id from assistant messages', () => {
    const thread: Thread = {
      ...makeThread('t1'),
      messages: [
        {
          id: 'a1',
          threadId: 't1',
          role: 'assistant',
          text: '',
          createdAt: 1,
          meta: { openaiResponseId: 'resp-a' },
        },
        {
          id: 'a2',
          threadId: 't1',
          role: 'assistant',
          text: '',
          createdAt: 2,
          meta: {},
        },
        {
          id: 'a3',
          threadId: 't1',
          role: 'assistant',
          text: '',
          createdAt: 3,
          meta: { openaiResponseId: 'resp-c' },
        },
      ],
    };
    const state = makeState([thread], 't1');
    expect(getLastAssistantResponseId(state, 't1')).toBe('resp-c');
  });
});
