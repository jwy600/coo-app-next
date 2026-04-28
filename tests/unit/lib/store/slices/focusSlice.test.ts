import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('focusSlice', () => {
  let messageId: string;

  beforeEach(() => {
    useStore.setState({
      threads: [],
      activeThreadId: null,
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      streamingMessageId: null,
      focus: null,
    });
    useStore.getState().createThread('thread-1');
    messageId = useStore.getState().addAssistantMessage('Hello world').id;
  });

  it('openEditor seeds buffer from message text', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    expect(useStore.getState().focus).toEqual({
      messageId,
      range: [0, 5],
      buffer: 'Hello',
      notes: [],
      prevBuffer: null,
    });
  });

  it('updateBuffer mutates only the buffer', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().updateBuffer('Howdy');
    expect(useStore.getState().focus?.buffer).toBe('Howdy');
  });

  it('appendNote pushes into notes', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().appendNote('first');
    useStore.getState().appendNote('second');
    expect(useStore.getState().focus?.notes).toEqual(['first', 'second']);
  });

  it('setRewriteResult and revertRewrite round-trip', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().setRewriteResult('Hi');
    expect(useStore.getState().focus?.buffer).toBe('Hi');
    useStore.getState().revertRewrite();
    expect(useStore.getState().focus?.buffer).toBe('Hello');
    expect(useStore.getState().focus?.prevBuffer).toBeNull();
  });

  it('closeEditor saves buffer + notes back to the message and clears focus', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().updateBuffer('Howdy');
    useStore.getState().appendNote('a note');
    useStore.getState().closeEditor();

    expect(useStore.getState().focus).toBeNull();
    expect(useStore.getState().threads[0].messages[0].text).toBe(
      'Howdy\n\n> **Note:** a note world',
    );
  });
});
