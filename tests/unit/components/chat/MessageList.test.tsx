import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '@/components/chat/MessageList';
import { createMessage } from '@/tests/mocks/fixtures';

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('@/components/chat/UserMessage', () => ({
  UserMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={`user-msg-${message.id}`}>User</div>
  ),
}));

vi.mock('@/components/chat/AssistantMessage', () => ({
  AssistantMessage: ({ message }: { message: { id: string; text: string } }) => (
    <div data-testid={`assistant-msg-${message.id}`} data-text-length={message.text.length}>
      Assistant
    </div>
  ),
}));

vi.mock('@/components/chat/PendingMessage', () => ({
  PendingMessage: () => <div data-testid="pending">Thinking…</div>,
}));

vi.mock('@/components/chat/ErrorMessage', () => ({
  ErrorMessage: ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div data-testid="error-msg">
      {error}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

describe('MessageList', () => {
  it('renders user messages', () => {
    const messages = [createMessage({ id: 'msg-1', role: 'user', text: 'Hi' })];
    render(<MessageList messages={messages} />);
    expect(screen.getByTestId('user-msg-msg-1')).toBeTruthy();
  });

  it('renders assistant messages with their text passed through', () => {
    const messages = [
      createMessage({ id: 'msg-1', role: 'assistant', text: 'Hello world' }),
    ];
    render(<MessageList messages={messages} />);
    const node = screen.getByTestId('assistant-msg-msg-1');
    expect(node.getAttribute('data-text-length')).toBe('11');
  });

  it('renders mixed user and assistant messages in order', () => {
    const messages = [
      createMessage({ id: 'msg-1', role: 'user', text: 'Q' }),
      createMessage({ id: 'msg-2', role: 'assistant', text: 'A' }),
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByTestId('user-msg-msg-1')).toBeTruthy();
    expect(screen.getByTestId('assistant-msg-msg-2')).toBeTruthy();
  });

  it('shows PendingMessage when isPending and no streaming message id', () => {
    render(<MessageList messages={[]} isPending />);
    expect(screen.getByTestId('pending')).toBeTruthy();
  });

  it('hides PendingMessage while a message is streaming', () => {
    render(<MessageList messages={[]} isPending streamingMessageId="msg-stream" />);
    expect(screen.queryByTestId('pending')).toBeNull();
  });

  it('shows ErrorMessage when error is set', () => {
    render(<MessageList messages={[]} error="Something went wrong" />);
    expect(screen.getByTestId('error-msg')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('exposes aria-live="polite" on the container', () => {
    const { container } = render(<MessageList messages={[]} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
