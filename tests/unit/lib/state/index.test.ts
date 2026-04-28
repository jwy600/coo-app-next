import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  setMode,
  setActiveThread,
  updateThreadTitle,
  getThreadById,
  createThread,
  addUserMessage,
  addAssistantMessage,
  addAssistantMessageToThread,
  getLastAssistantResponseId,
} from '@/lib/state';
import { AppState } from '@/types/state';

const idFactory = () => 'test-id-' + Math.random().toString(36).slice(2, 11);
const nowFactory = () => 1000;

describe('createInitialState', () => {
  it('returns landing state with empty threads', () => {
    const state = createInitialState(idFactory, nowFactory);
    expect(state.mode).toBe('landing');
    expect(state.activeThreadId).toBeNull();
    expect(state.threads).toHaveLength(0);
    expect(state.isAwaitingResponse).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('setMode', () => {
  it('returns the requested mode', () => {
    expect(setMode('thread').mode).toBe('thread');
    expect(setMode('landing').mode).toBe('landing');
  });
});

describe('thread + message flow', () => {
  let state: AppState;

  beforeEach(() => {
    state = createInitialState(idFactory, nowFactory);
    state = createThread(state, 'thread-1', nowFactory, 'First').state;
  });

  it('setActiveThread updates the active thread id', () => {
    const next = setActiveThread(state, 'thread-2');
    expect(next.activeThreadId).toBe('thread-2');
  });

  it('updateThreadTitle changes only the named thread', () => {
    const seeded = createThread(state, 'thread-2', nowFactory, 'Second').state;
    const next = updateThreadTitle(seeded, 'thread-1', 'Renamed', nowFactory);
    expect(getThreadById(next, 'thread-1')?.title).toBe('Renamed');
    expect(getThreadById(next, 'thread-2')?.title).toBe('Second');
  });

  it('addUserMessage appends a text message to the active thread', () => {
    const result = addUserMessage(state, 'Hello', idFactory, nowFactory);
    expect(result.message.text).toBe('Hello');
    expect(getThreadById(result.state, 'thread-1')?.messages).toHaveLength(1);
  });

  it('addAssistantMessage stores the response id in meta when provided', () => {
    const result = addAssistantMessage(state, 'Hi', idFactory, nowFactory, 'resp-1');
    expect(result.message.meta.openaiResponseId).toBe('resp-1');
  });

  it('addAssistantMessageToThread creates a thread if missing', () => {
    const result = addAssistantMessageToThread(
      state,
      'thread-fresh',
      'Body',
      idFactory,
      nowFactory,
    );
    expect(getThreadById(result.state, 'thread-fresh')?.messages).toHaveLength(1);
  });
});

describe('getLastAssistantResponseId', () => {
  let state: AppState;

  beforeEach(() => {
    state = createInitialState(idFactory, nowFactory);
    state = createThread(state, 'thread-1', nowFactory, 'Test').state;
  });

  it('returns undefined when the thread has no assistant messages with response ids', () => {
    state = addUserMessage(state, 'Hello', idFactory, nowFactory).state;
    expect(getLastAssistantResponseId(state, 'thread-1')).toBeUndefined();
  });

  it('returns the most recent response id, skipping ones without it', () => {
    state = addAssistantMessage(state, 'A', idFactory, nowFactory, 'resp-first').state;
    state = addAssistantMessage(state, 'B', idFactory, nowFactory).state;
    expect(getLastAssistantResponseId(state, 'thread-1')).toBe('resp-first');

    state = addAssistantMessage(state, 'C', idFactory, nowFactory, 'resp-third').state;
    expect(getLastAssistantResponseId(state, 'thread-1')).toBe('resp-third');
  });
});
