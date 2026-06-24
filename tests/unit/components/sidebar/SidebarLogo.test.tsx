import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarLogo } from '@/components/sidebar/SidebarLogo';
import React from 'react';

// Hoist mock data
const { mockSidebar, mockState } = vi.hoisted(() => ({
  mockSidebar: {
    state: 'expanded' as string,
    open: true,
    setOpen: vi.fn(),
    isMobile: false,
    openMobile: false,
    setOpenMobile: vi.fn(),
    toggleSidebar: vi.fn(),
  },
  mockState: {
    setMode: vi.fn(),
    clearSelection: vi.fn(),
  },
}));

vi.mock('@/lib/store/useStore', () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: vi.fn(() => mockSidebar),
  SidebarMenuButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('div', { 'data-testid': 'sidebar-menu-button' }, children),
}));

// Stub next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => React.createElement('a', { href, onClick, role: 'link', ...props }, children),
}));

describe('SidebarLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebar.state = 'expanded';
    mockSidebar.open = true;
    mockSidebar.isMobile = false;
  });

  it('renders the product name text when expanded', () => {
    render(<SidebarLogo />);
    expect(screen.getByText('what was that?')).toBeTruthy();
  });

  it('does not show the product name text when collapsed', () => {
    mockSidebar.state = 'collapsed';
    render(<SidebarLogo />);
    expect(screen.queryByText('what was that?')).toBeNull();
  });

  it('returns to landing mode on click when expanded', () => {
    render(<SidebarLogo />);
    fireEvent.click(screen.getByRole('link'));
    expect(mockState.setMode).toHaveBeenCalledWith('landing');
  });

  it('opens the sidebar on click when collapsed (non-mobile)', () => {
    mockSidebar.state = 'collapsed';
    mockSidebar.isMobile = false;
    render(<SidebarLogo />);
    fireEvent.click(screen.getByRole('link'));
    expect(mockSidebar.setOpen).toHaveBeenCalledWith(true);
    expect(mockState.setMode).not.toHaveBeenCalled();
  });

  it('closes sidebar on mobile when expanded', () => {
    mockSidebar.isMobile = true;
    render(<SidebarLogo />);
    fireEvent.click(screen.getByRole('link'));
    expect(mockSidebar.setOpen).toHaveBeenCalledWith(false);
  });
});
