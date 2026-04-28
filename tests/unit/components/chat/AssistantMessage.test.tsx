import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AssistantMessage } from '@/components/chat/AssistantMessage';
import { createMessage } from '@/tests/mocks/fixtures';
import { useStore } from '@/lib/store/useStore';

function resetStore() {
  useStore.setState({
    threads: [],
    activeThreadId: null,
    mode: 'landing',
    isAwaitingResponse: false,
    error: null,
    streamingMessageId: null,
    focus: null,
  });
}

describe('AssistantMessage', () => {
  beforeEach(resetStore);

  it('renders the assistant label and the message text via MarkdownContent', () => {
    const message = createMessage({ role: 'assistant', text: 'Hello **world**.' });
    const { container } = render(<AssistantMessage message={message} />);
    expect(container.querySelector('.assistant-label')!.textContent).toBe('Coo');
    const strong = container.querySelector('strong');
    expect(strong!.textContent).toBe('world');
  });

  it('attaches data-message-id to the message container', () => {
    const message = createMessage({ id: 'm-42', role: 'assistant', text: 'x' });
    const { container } = render(<AssistantMessage message={message} />);
    const root = container.querySelector('.assistant-message') as HTMLElement;
    expect(root.getAttribute('data-message-id')).toBe('m-42');
  });

  describe('focus editor split-render', () => {
    it('renders before-text + FocusEditor + after-text when focus targets this message', () => {
      const message = createMessage({
        id: 'msg-1',
        role: 'assistant',
        text: 'before middle after',
      });
      // Seed the store with a real thread + message and open focus on "middle".
      useStore.getState().createThread('t1');
      useStore.setState({
        threads: [
          {
            ...useStore.getState().threads[0],
            messages: [message],
          },
        ],
      });
      const start = 'before '.length; // 7
      const end = 'before middle'.length; // 13
      useStore.getState().openEditor('msg-1', [start, end]);

      const { container } = render(<AssistantMessage message={message} />);

      const editor = container.querySelector('[data-testid="focus-editor"]');
      expect(editor).toBeTruthy();

      // Before / after segments rendered as separate paragraphs.
      const paragraphs = Array.from(container.querySelectorAll('.doc-paragraph'));
      const texts = paragraphs.map((p) => p.textContent ?? '');
      expect(texts.join(' | ')).toContain('before');
      expect(texts.join(' | ')).toContain('after');
    });

    it('renders only the full message when focus targets a different message', () => {
      const message = createMessage({
        id: 'msg-1',
        role: 'assistant',
        text: 'Hello world',
      });
      // Active focus, but on a *different* message id.
      useStore.setState({
        focus: {
          messageId: 'msg-other',
          range: [0, 5],
          buffer: 'Hello',
          notes: [],
          prevBuffer: null,
        },
      });

      const { container } = render(<AssistantMessage message={message} />);
      expect(container.querySelector('[data-testid="focus-editor"]')).toBeNull();
      expect(container.querySelector('p')?.textContent).toBe('Hello world');
    });
  });
});
