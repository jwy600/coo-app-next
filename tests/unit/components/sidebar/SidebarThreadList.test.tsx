import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarThreadList } from '@/components/sidebar/SidebarThreadList';
import { createThread } from '@/tests/mocks/fixtures';
import React from 'react';

// Hoist mock data
const { mockParams, mockSidebar } = vi.hoisted(() => ({
  mockParams: {} as Record<string, string>,
  mockSidebar: {
    state: 'expanded' as string,
    open: true,
    setOpen: vi.fn(),
    isMobile: false,
    openMobile: false,
    setOpenMobile: vi.fn(),
    toggleSidebar: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => mockParams),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: vi.fn(() => mockSidebar),
  SidebarMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement('ul', { 'data-testid': 'sidebar-menu' }, children),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('li', null, children),
  SidebarMenuButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', { 'data-testid': 'sidebar-menu-button' }, children),
}));

// Stub next/link as anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('SidebarThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebar.state = 'expanded';
    mockSidebar.isMobile = false;
    // Reset params
    Object.keys(mockParams).forEach((k) => delete mockParams[k]);
  });

  describe('empty state', () => {
    it('shows "No threads yet" when expanded and no threads', () => {
      render(<SidebarThreadList threads={[]} />);
      expect(screen.getByText('No threads yet')).toBeTruthy();
    });

    it('returns null when collapsed and no threads', () => {
      mockSidebar.state = 'collapsed';
      const { container } = render(<SidebarThreadList threads={[]} />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('with threads', () => {
    it('renders thread titles', () => {
      const threads = [
        createThread({ id: 't1', title: 'First Thread' }),
        createThread({ id: 't2', title: 'Second Thread' }),
      ];
      render(<SidebarThreadList threads={threads} />);
      expect(screen.getByText('First Thread')).toBeTruthy();
      expect(screen.getByText('Second Thread')).toBeTruthy();
    });

    it('renders links to thread pages', () => {
      const threads = [createThread({ id: 't1', title: 'Test' })];
      render(<SidebarThreadList threads={threads} />);
      const link = screen.getByText('Test').closest('a');
      expect(link?.getAttribute('href')).toBe('/t/t1');
    });

    it('shows "Untitled" for threads without title', () => {
      const threads = [createThread({ id: 't1', title: '' })];
      render(<SidebarThreadList threads={threads} />);
      expect(screen.getByText('Untitled')).toBeTruthy();
    });
  });
});
