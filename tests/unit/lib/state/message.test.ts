import { describe, it, expect, beforeEach } from 'vitest';
import {
  addUserMessage,
  addAssistantMessage,
  addAssistantMessageToThread,
  appendMessageText,
  replaceMessageRange,
  setMessageResponseId,
  removeMessage,
  findMessage,
  addImportedMessage,
  setRegisterState,
} from '@/lib/state/message';
import type { AppState } from '@/types/state';

const makeState = (overrides: Partial<AppState> = {}): AppState =>
  ({
    threads: [
      {
        id: 'thread-1',
        title: 'Test',
        createdAt: 1000,
        updatedAt: 1000,
        messages: [],
      },
    ],
    activeThreadId: 'thread-1',
    mode: 'thread',
    isAwaitingResponse: false,
    error: null,
    ...overrides,
  }) as AppState;

let idCounter = 0;
const idFactory = () => `id-${idCounter++}`;
const nowFactory = () => 1700000000000;

beforeEach(() => {
  idCounter = 0;
});

describe('addUserMessage', () => {
  it('throws when no active thread', () => {
    const state = makeState({ activeThreadId: null });
    expect(() => addUserMessage(state, 'hi', idFactory, nowFactory)).toThrow(
      'Cannot add message: no active thread',
    );
  });

  it('appends a user message with text', () => {
    const result = addUserMessage(makeState(), 'Hello world', idFactory, nowFactory);
    expect(result.message.role).toBe('user');
    expect(result.message.text).toBe('Hello world');
    expect(result.state.threads[0].messages).toHaveLength(1);
    expect(result.state.threads[0].messages[0].text).toBe('Hello world');
  });
});

describe('addAssistantMessage', () => {
  it('throws when no active thread', () => {
    const state = makeState({ activeThreadId: null });
    expect(() => addAssistantMessage(state, 'hi', idFactory, nowFactory)).toThrow(
      'Cannot add message: no active thread',
    );
  });

  it('appends an assistant message with text', () => {
    const result = addAssistantMessage(makeState(), '## Title\n\nBody.', idFactory, nowFactory);
    expect(result.message.role).toBe('assistant');
    expect(result.message.text).toBe('## Title\n\nBody.');
    expect(result.message.meta).toEqual({});
  });

  it('stores responseId in meta when provided', () => {
    const result = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory, 'resp-1');
    expect(result.message.meta.openaiResponseId).toBe('resp-1');
  });
});

describe('addAssistantMessageToThread', () => {
  it('creates the thread if it does not exist', () => {
    const result = addAssistantMessageToThread(
      makeState({ threads: [], activeThreadId: null }),
      'thread-2',
      'Body',
      idFactory,
      nowFactory,
    );
    expect(result.state.threads).toHaveLength(1);
    expect(result.state.threads[0].id).toBe('thread-2');
    expect(result.state.threads[0].messages).toHaveLength(1);
  });
});

describe('appendMessageText', () => {
  it('appends to the matching message text', () => {
    const seeded = addAssistantMessage(makeState(), 'Hello', idFactory, nowFactory);
    const messageId = seeded.message.id;
    const next = appendMessageText(seeded.state, messageId, ' world');
    expect(findMessage(next, messageId)?.text).toBe('Hello world');
  });

  it('returns the same state object for an empty chunk', () => {
    const seeded = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory);
    const next = appendMessageText(seeded.state, seeded.message.id, '');
    expect(next).toBe(seeded.state);
  });

  it('preserves immutability for unrelated threads', () => {
    const seeded = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory);
    const next = appendMessageText(seeded.state, seeded.message.id, '!');
    expect(next).not.toBe(seeded.state);
    expect(next.threads[0].messages[0].text).toBe('Hi!');
  });
});

describe('replaceMessageRange', () => {
  it('splices in a replacement at the given range', () => {
    const seeded = addAssistantMessage(makeState(), 'Hello world', idFactory, nowFactory);
    const next = replaceMessageRange(seeded.state, seeded.message.id, [6, 11], 'there');
    expect(findMessage(next, seeded.message.id)?.text).toBe('Hello there');
  });

  it('clamps out-of-range bounds to the message length', () => {
    const seeded = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory);
    const next = replaceMessageRange(seeded.state, seeded.message.id, [-5, 999], 'X');
    expect(findMessage(next, seeded.message.id)?.text).toBe('X');
  });

  it('preserves the original state object reference when no message matches', () => {
    const state = makeState();
    const next = replaceMessageRange(state, 'missing', [0, 1], '!');
    expect(next).toBe(state);
  });
});

describe('setMessageResponseId', () => {
  it('writes the response id into message.meta', () => {
    const seeded = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory);
    const next = setMessageResponseId(seeded.state, seeded.message.id, 'resp-2');
    expect(findMessage(next, seeded.message.id)?.meta.openaiResponseId).toBe('resp-2');
  });
});

describe('removeMessage', () => {
  it('removes a message by id', () => {
    const seeded = addAssistantMessage(makeState(), 'Hi', idFactory, nowFactory);
    const next = removeMessage(seeded.state, seeded.message.id);
    expect(next.threads[0].messages).toHaveLength(0);
  });

  it('is a no-op for an unknown id', () => {
    const state = makeState();
    expect(removeMessage(state, 'missing')).toBe(state);
  });
});

describe('addImportedMessage', () => {
  it('appends an assistant message tagged as an import', () => {
    const result = addImportedMessage(
      makeState(),
      'thread-1',
      'notes.md',
      '# Notes',
      idFactory,
      nowFactory,
    );
    expect(result.message.role).toBe('assistant');
    expect(result.message.text).toBe('# Notes');
    expect(result.message.meta).toMatchObject({
      source: 'import',
      fileName: 'notes.md',
      registerState: 'registering',
      registeringAt: nowFactory(),
    });
    // No responseId until the API registration completes.
    expect(result.message.meta.openaiResponseId).toBeUndefined();
    expect(result.state.threads[0].messages).toHaveLength(1);
  });

  it('creates the thread if it does not exist', () => {
    const result = addImportedMessage(
      makeState({ threads: [], activeThreadId: null }),
      'thread-2',
      'a.md',
      'body',
      idFactory,
      nowFactory,
    );
    expect(result.state.threads[0].id).toBe('thread-2');
    expect(result.state.threads[0].messages).toHaveLength(1);
  });
});

describe('setRegisterState', () => {
  it('writes the registerState into meta', () => {
    const seeded = addImportedMessage(
      makeState(),
      'thread-1',
      'a.md',
      'body',
      idFactory,
      nowFactory,
    );
    const next = setRegisterState(seeded.state, seeded.message.id, 'registered', nowFactory);
    expect(findMessage(next, seeded.message.id)?.meta.registerState).toBe('registered');
  });

  it('refreshes registeringAt when transitioning back to registering', () => {
    const seeded = addImportedMessage(
      makeState(),
      'thread-1',
      'a.md',
      'body',
      idFactory,
      nowFactory,
    );
    const registered = setRegisterState(seeded.state, seeded.message.id, 'registered', nowFactory);
    const later = () => 9999999999999;
    const reRegistering = setRegisterState(registered, seeded.message.id, 'registering', later);
    expect(findMessage(reRegistering, seeded.message.id)?.meta.registeringAt).toBe(later());
  });

  it('is a no-op for an unknown id', () => {
    const state = makeState();
    expect(setRegisterState(state, 'missing', 'registered', nowFactory)).toBe(state);
  });
});
