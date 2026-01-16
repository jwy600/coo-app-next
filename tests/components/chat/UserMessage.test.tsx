import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMessage } from '@/components/chat/UserMessage';
import { Message } from '@/types/message';
import { Block } from '@/types/block';

describe('UserMessage Component', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    threadId: 'thread-1',
    role: 'user',
    createdAt: Date.now(),
    content: [{ blockId: 'block-1' }],
    meta: {},
  };

  const mockBlock: Block = {
    id: 'block-1',
    messageId: 'msg-1',
    type: 'paragraph',
    text: 'Hello, this is a user message',
    edited: false,
    selections: [],
    prevText: null,
    isRewritten: false,
  };

  it('should render user label', () => {
    render(<UserMessage message={mockMessage} block={mockBlock} />);
    expect(screen.getByText('You')).toBeDefined();
  });

  it('should render block text', () => {
    render(<UserMessage message={mockMessage} block={mockBlock} />);
    expect(screen.getByText('Hello, this is a user message')).toBeDefined();
  });

  it('should handle missing block gracefully', () => {
    render(<UserMessage message={mockMessage} />);
    expect(screen.getByText('You')).toBeDefined();
  });
});
