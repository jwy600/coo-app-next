import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UserMessage } from '@/components/chat/UserMessage';
import { createMessage } from '@/tests/mocks/fixtures';

describe('UserMessage', () => {
  it('renders the message text in a paragraph', () => {
    const message = createMessage({ role: 'user', text: 'Hello there' });
    const { container } = render(<UserMessage message={message} />);
    const p = container.querySelector('p');
    expect(p?.textContent).toBe('Hello there');
  });

  it('renders an empty paragraph when text is empty', () => {
    const message = createMessage({ role: 'user', text: '' });
    const { container } = render(<UserMessage message={message} />);
    expect(container.querySelector('p')?.textContent).toBe('');
  });

  it('attaches data-message-id to the message container', () => {
    const message = createMessage({ id: 'msg-7', role: 'user', text: 'x' });
    const { container } = render(<UserMessage message={message} />);
    const root = container.querySelector('.user-message') as HTMLElement;
    expect(root.getAttribute('data-message-id')).toBe('msg-7');
  });
});
