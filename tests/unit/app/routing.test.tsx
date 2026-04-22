/**
 * Tests for Pages & Routing
 *
 * Verifies landing page and thread detail page render correctly with AppLayout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';
import ThreadPage from '@/app/t/[threadId]/page';

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

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
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

  it('should render with landing content', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('landing-content')).toBeInTheDocument();
  });
});

describe('Thread Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render thread page with correct threadId', async () => {
    const params = Promise.resolve({ threadId: 'thread-1' });
    const Component = await ThreadPage({ params });
    render(Component);

    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('thread-content')).toBeInTheDocument();
    expect(screen.getByTestId('thread-content')).toHaveAttribute('data-thread-id', 'thread-1');
  });
});
