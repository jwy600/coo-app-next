import { describe, it, expect, beforeEach } from 'vitest';
import {
  openEditor,
  closeEditor,
  updateBuffer,
  appendNote,
  setRewriteResult,
  setShortcutResult,
  revertRewrite,
  setFocusLastResponseId,
} from '@/lib/state/focus';
import { addAssistantMessage, addUserMessage } from '@/lib/state/message';
import type { AppState } from '@/types/state';

let idCounter = 0;
const idFactory = () => `id-${idCounter++}`;
const nowFactory = () => 1700000000000;

const makeBaseState = (): AppState =>
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
    focus: null,
  }) as AppState;

beforeEach(() => {
  idCounter = 0;
});

function seedAssistant(text: string): { state: AppState; messageId: string } {
  const seeded = addAssistantMessage(makeBaseState(), text, idFactory, nowFactory);
  return { state: seeded.state, messageId: seeded.message.id };
}

describe('openEditor', () => {
  it('initializes buffer to the slice of message.text and notes to []', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const next = openEditor(state, messageId, [0, 5]);
    expect(next.focus).toEqual({
      messageId,
      range: [0, 5],
      buffer: 'Hello',
      notes: [],
      prevBuffer: null,
    });
  });

  it('returns the same state when the message does not exist', () => {
    const { state } = seedAssistant('Hello');
    const next = openEditor(state, 'missing', [0, 1]);
    expect(next).toBe(state);
  });

  it('replaces a previously active editor when called again', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const first = openEditor(state, messageId, [0, 5]);
    const second = openEditor(first, messageId, [6, 11]);
    expect(second.focus?.buffer).toBe('world');
    expect(second.focus?.range).toEqual([6, 11]);
  });

  it('auto-saves a previously active editor before opening the new one', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const first = openEditor(state, messageId, [0, 5]);
    const edited = updateBuffer(first, 'Howdy');
    const second = openEditor(edited, messageId, [6, 11]);
    // First editor's edit was saved before the second opened.
    expect(second.threads[0].messages[0].text).toBe('Howdy world');
    // Second editor reads its slice from the *post-save* text.
    expect(second.focus?.buffer).toBe('world');
  });

  it('captures lastResponseId from the assistant message meta', () => {
    const seeded = addAssistantMessage(
      makeBaseState(),
      'Hello world',
      idFactory,
      nowFactory,
      'resp_abc123',
    );
    const next = openEditor(seeded.state, seeded.message.id, [0, 5]);
    expect(next.focus?.lastResponseId).toBe('resp_abc123');
    expect(next.focus?.referenceQuestion).toBeUndefined();
  });

  it('falls back to referenceQuestion when assistant message lacks responseId', () => {
    const withUser = addUserMessage(
      makeBaseState(),
      'What does saturator do?',
      idFactory,
      nowFactory,
    );
    const withAssistant = addAssistantMessage(
      withUser.state,
      'Saturator adds harmonics.',
      idFactory,
      nowFactory,
    );
    const next = openEditor(withAssistant.state, withAssistant.message.id, [0, 9]);
    expect(next.focus?.lastResponseId).toBeUndefined();
    expect(next.focus?.referenceQuestion).toBe('What does saturator do?');
  });

  it('leaves both context fields undefined when there is no prior message and no responseId', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const next = openEditor(state, messageId, [0, 5]);
    expect(next.focus?.lastResponseId).toBeUndefined();
    expect(next.focus?.referenceQuestion).toBeUndefined();
  });
});

describe('setFocusLastResponseId', () => {
  it('updates lastResponseId on the active editor', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const next = setFocusLastResponseId(opened, 'resp_new');
    expect(next.focus?.lastResponseId).toBe('resp_new');
  });

  it('overwrites a previously captured lastResponseId', () => {
    const seeded = addAssistantMessage(
      makeBaseState(),
      'Hello world',
      idFactory,
      nowFactory,
      'resp_initial',
    );
    const opened = openEditor(seeded.state, seeded.message.id, [0, 5]);
    const next = setFocusLastResponseId(opened, 'resp_followup');
    expect(next.focus?.lastResponseId).toBe('resp_followup');
  });

  it('is a no-op when no editor is active', () => {
    const { state } = seedAssistant('Hi');
    expect(setFocusLastResponseId(state, 'resp_x')).toBe(state);
  });
});

describe('updateBuffer', () => {
  it('replaces only the buffer on the active editor', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const next = updateBuffer(opened, 'Howdy');
    expect(next.focus?.buffer).toBe('Howdy');
    expect(next.focus?.notes).toEqual([]);
    expect(next.focus?.range).toEqual([0, 5]);
  });

  it('is a no-op when no editor is active', () => {
    const { state } = seedAssistant('Hi');
    expect(updateBuffer(state, 'x')).toBe(state);
  });
});

describe('appendNote', () => {
  it('pushes a note string into notes[]', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 11]);
    const next = appendNote(opened, 'first');
    const nextTwo = appendNote(next, 'second');
    expect(nextTwo.focus?.notes).toEqual(['first', 'second']);
  });

  it('is a no-op when no editor is active', () => {
    const { state } = seedAssistant('Hi');
    expect(appendNote(state, 'note')).toBe(state);
  });
});

describe('setRewriteResult and revertRewrite', () => {
  it('setRewriteResult stores prev buffer, replaces buffer, and clears notes', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const withNote = appendNote(opened, 'tighten');
    const rewritten = setRewriteResult(withNote, 'Hi there');

    expect(rewritten.focus?.buffer).toBe('Hi there');
    expect(rewritten.focus?.prevBuffer).toBe('Hello');
    expect(rewritten.focus?.notes).toEqual([]);
  });

  it('revertRewrite restores prev buffer and clears prevBuffer', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const rewritten = setRewriteResult(opened, 'Hi');
    const reverted = revertRewrite(rewritten);

    expect(reverted.focus?.buffer).toBe('Hello');
    expect(reverted.focus?.prevBuffer).toBeNull();
  });

  it('revertRewrite is a no-op if there is no prev buffer (not stackable)', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const rewritten = setRewriteResult(opened, 'Hi');
    const reverted = revertRewrite(rewritten);
    const revertedAgain = revertRewrite(reverted);
    expect(revertedAgain).toBe(reverted);
  });

  it('a second rewrite cannot be reverted past one step', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const rew1 = setRewriteResult(opened, 'Hi');
    const rew2 = setRewriteResult(rew1, 'Hey');
    const reverted = revertRewrite(rew2);
    expect(reverted.focus?.buffer).toBe('Hi');
    expect(reverted.focus?.prevBuffer).toBeNull();
  });
});

describe('setShortcutResult', () => {
  it('replaces the buffer, stashes prevBuffer, and preserves notes', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const withNotes = appendNote(appendNote(opened, 'first'), 'second');
    const next = setShortcutResult(withNotes, 'Hola');

    expect(next.focus?.buffer).toBe('Hola');
    expect(next.focus?.prevBuffer).toBe('Hello');
    expect(next.focus?.notes).toEqual(['first', 'second']);
  });

  it('is a no-op when no editor is active', () => {
    const { state } = seedAssistant('Hi');
    expect(setShortcutResult(state, 'x')).toBe(state);
  });

  it('subsequent revertRewrite restores the buffer and clears prevBuffer', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const transformed = setShortcutResult(opened, 'Hola');
    const reverted = revertRewrite(transformed);

    expect(reverted.focus?.buffer).toBe('Hello');
    expect(reverted.focus?.prevBuffer).toBeNull();
  });
});

describe('closeEditor', () => {
  it('writes the buffer back into the message at the original range', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const edited = updateBuffer(opened, 'Howdy');
    const closed = closeEditor(edited);

    expect(closed.focus).toBeNull();
    expect(closed.threads[0].messages[0].text).toBe('Howdy world');
  });

  it('appends notes as blockquote-format Markdown after a blank line', () => {
    const { state, messageId } = seedAssistant('Hello world');
    const opened = openEditor(state, messageId, [0, 5]);
    const withNotes = appendNote(appendNote(opened, 'first note'), 'second');
    const closed = closeEditor(withNotes);

    expect(closed.threads[0].messages[0].text).toBe(
      'Hello\n\n> **Note:** first note\n\n> **Note:** second world',
    );
  });

  it('is a no-op when no editor is active', () => {
    const { state } = seedAssistant('Hi');
    expect(closeEditor(state)).toBe(state);
  });
});
