import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AssistantMessage } from '@/components/chat/AssistantMessage';
import { createMessage } from '@/tests/mocks/fixtures';

describe('AssistantMessage', () => {
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
});
