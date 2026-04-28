import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('messageSlice', () => {
  beforeEach(() => {
    useStore.setState({
      threads: [],
      activeThreadId: null,
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      streamingMessageId: null,
    });
    useStore.getState().createThread('thread-1');
  });

  it('appends streamed text to the named message', () => {
    const message = useStore.getState().addAssistantMessage('Hello');
    useStore.getState().appendMessageText(message.id, ' world');
    const stored = useStore.getState().threads[0].messages[0];
    expect(stored.text).toBe('Hello world');
  });

  it('replaceMessageRange splices the message text', () => {
    const message = useStore.getState().addAssistantMessage('Hello world');
    useStore.getState().replaceMessageRange(message.id, [6, 11], 'there');
    const stored = useStore.getState().threads[0].messages[0];
    expect(stored.text).toBe('Hello there');
  });

  it('setMessageResponseId writes into message.meta', () => {
    const message = useStore.getState().addAssistantMessage('Hi');
    useStore.getState().setMessageResponseId(message.id, 'resp-123');
    const stored = useStore.getState().threads[0].messages[0];
    expect(stored.meta.openaiResponseId).toBe('resp-123');
  });

  it('removeMessage deletes the message from its thread', () => {
    const message = useStore.getState().addAssistantMessage('Goodbye');
    useStore.getState().removeMessage(message.id);
    expect(useStore.getState().threads[0].messages).toHaveLength(0);
  });
});
