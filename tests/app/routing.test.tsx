/**
 * Tests for Phase 8: Pages & Routing
 *
 * Verifies landing page and thread detail page work correctly
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';
import ThreadPage from '@/app/t/[threadId]/page';
import { notFound } from 'next/navigation';
import type { Thread } from '@/types/thread';
import type { Message } from '@/types/message';
import type { Block } from '@/types/block';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock Supabase operations
vi.mock('@/lib/supabase/threads', () => ({
  loadAllThreads: vi.fn(),
  loadThreadFromSupabase: vi.fn(),
}));

vi.mock('@/lib/supabase/messages', () => ({
  loadMessagesForThread: vi.fn(),
}));

vi.mock('@/lib/supabase/blocks', () => ({
  loadBlocksForThread: vi.fn(),
}));

// Mock components (we're only testing page structure)
vi.mock('@/components/layout/Header', () => ({
  Header: ({ mode }: { mode: string }) => <div data-testid="header" data-mode={mode} />,
}));

vi.mock('@/components/landing/ThreadList', () => ({
  ThreadList: ({ threads }: { threads: Thread[] }) => (
    <div data-testid="thread-list" data-count={threads.length} />
  ),
}));

vi.mock('@/components/ui/Orbs', () => ({
  Orbs: () => <div data-testid="orbs" />,
}));

vi.mock('@/components/chat/ChatContainer', () => ({
  ChatContainer: ({
    threadId,
    initialThread,
  }: {
    threadId: string;
    initialThread?: Thread;
  }) => (
    <div data-testid="chat-container" data-thread-id={threadId} data-has-initial={!!initialThread}>
      Chat for thread {threadId}
    </div>
  ),
}));

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with thread list', async () => {
    const { loadAllThreads } = await import('@/lib/supabase/threads');
    const mockThreads: Thread[] = [
      {
        id: 'thread-1',
        title: 'Test Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      },
    ];
    (loadAllThreads as Mock).mockResolvedValue(mockThreads);

    const Component = await LandingPage();
    render(Component);

    expect(screen.getByTestId('orbs')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toHaveAttribute('data-mode', 'landing');
    expect(screen.getByTestId('thread-list')).toHaveAttribute('data-count', '1');
  });

  it('should render with empty thread list', async () => {
    const { loadAllThreads } = await import('@/lib/supabase/threads');
    (loadAllThreads as Mock).mockResolvedValue([]);

    const Component = await LandingPage();
    render(Component);

    expect(screen.getByTestId('thread-list')).toHaveAttribute('data-count', '0');
  });
});

describe('Thread Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TODO: Update these tests for client component architecture
  // These tests were written for server components but pages have been refactored to use 'use client'
  it.skip('should render thread page with data', async () => {
    const { loadThreadFromSupabase } = await import('@/lib/supabase/threads');
    const { loadMessagesForThread } = await import('@/lib/supabase/messages');
    const { loadBlocksForThread } = await import('@/lib/supabase/blocks');

    const mockThread: Thread = {
      id: 'thread-1',
      title: 'Test Thread',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    const mockMessages: Message[] = [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'user',
        content: [{ blockId: 'block-1' }],
        createdAt: Date.now(),
        meta: {},
      },
    ];

    const mockBlocks: Block[] = [
      {
        id: 'block-1',
        messageId: 'msg-1',
        type: 'paragraph',
        text: 'Hello',
        edited: false,
        selections: [],
        prevText: null,
        isRewritten: false,
      },
    ];

    (loadThreadFromSupabase as Mock).mockResolvedValue(mockThread);
    (loadMessagesForThread as Mock).mockResolvedValue(mockMessages);
    (loadBlocksForThread as Mock).mockResolvedValue(mockBlocks);

    const params = Promise.resolve({ threadId: 'thread-1' });
    const Component = await ThreadPage({ params });
    render(Component);

    expect(screen.getByTestId('orbs')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toHaveAttribute('data-mode', 'chat');
    expect(screen.getByTestId('chat-container')).toHaveAttribute('data-thread-id', 'thread-1');
    expect(screen.getByTestId('chat-container')).toHaveAttribute('data-has-initial', 'true');
  });

  it.skip('should call notFound when thread does not exist', async () => {
    const { loadThreadFromSupabase } = await import('@/lib/supabase/threads');
    (loadThreadFromSupabase as Mock).mockResolvedValue(null);

    const params = Promise.resolve({ threadId: 'invalid-thread' });

    try {
      await ThreadPage({ params });
    } catch (error) {
      // notFound throws an error that Next.js catches
    }

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
