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
      prevBuffer: null,
    });
  });

  it('updateBuffer mutates the buffer', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().updateBuffer('Howdy');
    expect(useStore.getState().focus?.buffer).toBe('Howdy');
  });

  it('appendNoteToBuffer appends inline `> **Note:** ...` markdown to the buffer', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().appendNoteToBuffer('first');
    useStore.getState().appendNoteToBuffer('second');
    expect(useStore.getState().focus?.buffer).toBe(
      'Hello\n\n> **Note:** first\n\n> **Note:** second',
    );
  });

  it('setRewriteResult and revertRewrite round-trip', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().setRewriteResult('Hi');
    expect(useStore.getState().focus?.buffer).toBe('Hi');
    useStore.getState().revertRewrite();
    expect(useStore.getState().focus?.buffer).toBe('Hello');
    expect(useStore.getState().focus?.prevBuffer).toBeNull();
  });

  it('closeEditor saves buffer (notes inline) back to the message and clears focus', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().updateBuffer('Howdy');
    useStore.getState().appendNoteToBuffer('a note');
    useStore.getState().closeEditor();

    expect(useStore.getState().focus).toBeNull();
    expect(useStore.getState().threads[0].messages[0].text).toBe(
      'Howdy\n\n> **Note:** a note world',
    );
  });

  it('setFocusLastResponseId updates the active focus chain head', () => {
    useStore.getState().openEditor(messageId, [0, 5]);
    useStore.getState().setFocusLastResponseId('resp_followup');
    expect(useStore.getState().focus?.lastResponseId).toBe('resp_followup');
  });

  it('setFocusLastResponseId is a no-op when no editor is active', () => {
    useStore.getState().setFocusLastResponseId('resp_x');
    expect(useStore.getState().focus).toBeNull();
  });
});
