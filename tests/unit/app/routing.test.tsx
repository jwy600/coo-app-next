/**
 * Tests for Pages & Routing
 *
 * Verifies landing page and thread detail page work correctly with new AppLayout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';
import ThreadPage from '@/app/t/[threadId]/page';
import type { Thread } from '@/types/thread';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useParams: vi.fn(() => ({})),
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

// Mock server-side Supabase client
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
  })),
}));

// Mock AppLayout and related components
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children, threads }: { children: React.ReactNode; threads: Thread[] }) => (
    <div data-testid="app-layout" data-thread-count={threads.length}>
      {children}
    </div>
  ),
}));

vi.mock('@/app/landing-content', () => ({
  LandingContent: () => <div data-testid="landing-content" />,
}));

vi.mock('@/app/t/[threadId]/thread-content', () => ({
  ThreadContent: ({ threadId }: { threadId: string }) => (
    <div data-testid="thread-content" data-thread-id={threadId} />
  ),
}));

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with thread list', async () => {
    // Mock server-side Supabase query
    const mockDbThreads = [
      {
        id: 'thread-1',
        title: 'Test Thread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockDbThreads, error: null }),
      }),
    });

    const Component = await LandingPage();
    render(Component);

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-thread-count', '1');
    expect(screen.getByTestId('landing-content')).toBeInTheDocument();
  });

  it('should render with empty thread list', async () => {
    // Mock empty result
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const Component = await LandingPage();
    render(Component);

    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-thread-count', '0');
    expect(screen.getByTestId('landing-content')).toBeInTheDocument();
  });
});

describe('Thread Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render thread page with correct threadId', async () => {
    // Mock server-side Supabase query
    const mockDbThreads = [
      {
        id: 'thread-1',
        title: 'Test Thread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockDbThreads, error: null }),
      }),
    });

    const params = Promise.resolve({ threadId: 'thread-1' });
    const Component = await ThreadPage({ params });
    render(Component);

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('thread-content')).toBeInTheDocument();
    expect(screen.getByTestId('thread-content')).toHaveAttribute('data-thread-id', 'thread-1');
  });
});
