import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { createThread } from '@/tests/mocks/fixtures';
import React from 'react';

// Hoist mock data
const { mockSidebar, mockThreads } = vi.hoisted(() => ({
  mockSidebar: {
    state: 'expanded' as string,
    open: true,
    setOpen: vi.fn(),
    isMobile: false,
    openMobile: false,
    setOpenMobile: vi.fn(),
    toggleSidebar: vi.fn(),
  },
  mockThreads: { current: [] as { id: string }[] },
}));

vi.mock('@/lib/store/useStore', () => ({
  useStore: vi.fn((selector?: (s: { threads: { id: string }[] }) => unknown) => {
    const state = { threads: mockThreads.current };
    if (selector) return selector(state);
    return state;
  }),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: vi.fn(() => mockSidebar),
  Sidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement('aside', { 'data-testid': 'sidebar' }, children),
  SidebarContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'sidebar-content' }, children),
  SidebarHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'sidebar-header' }, children),
  SidebarFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'sidebar-footer' }, children),
  SidebarGroup: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SidebarMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement('ul', null, children),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('li', null, children),
  SidebarTrigger: () =>
    React.createElement('button', { 'data-testid': 'sidebar-trigger' }, 'Toggle'),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// Stub child components
vi.mock('@/components/sidebar/SidebarLogo', () => ({
  SidebarLogo: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('@/components/sidebar/NewChatButton', () => ({
  NewChatButton: () => React.createElement('button', { 'data-testid': 'new-chat' }, 'New chat'),
}));

vi.mock('@/components/sidebar/SidebarThreadList', () => ({
  SidebarThreadList: ({ threads }: { threads: { id: string }[] }) =>
    React.createElement('div', { 'data-testid': 'thread-list', 'data-count': threads.length }, 'Threads'),
}));

vi.mock('@/components/settings/SettingsSheet', () => ({
  SettingsSheet: () => React.createElement('div', { 'data-testid': 'settings-sheet' }, 'Settings'),
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebar.state = 'expanded';
    mockThreads.current = [];
  });

  it('renders sidebar structure', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('sidebar-header')).toBeTruthy();
    expect(screen.getByTestId('sidebar-content')).toBeTruthy();
    expect(screen.getByTestId('sidebar-footer')).toBeTruthy();
  });

  it('renders SidebarLogo', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('logo')).toBeTruthy();
  });

  it('renders NewChatButton', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('new-chat')).toBeTruthy();
  });

  it('passes threads from store to SidebarThreadList', () => {
    mockThreads.current = [
      createThread({ id: 't1' }),
      createThread({ id: 't2' }),
    ];
    render(<AppSidebar />);
    expect(screen.getByTestId('thread-list').getAttribute('data-count')).toBe('2');
  });

  it('renders SettingsSheet in footer', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('settings-sheet')).toBeTruthy();
  });

  it('shows SidebarTrigger when expanded', () => {
    render(<AppSidebar />);
    expect(screen.getByTestId('sidebar-trigger')).toBeTruthy();
  });

  it('hides SidebarTrigger when collapsed', () => {
    mockSidebar.state = 'collapsed';
    render(<AppSidebar />);
    expect(screen.queryByTestId('sidebar-trigger')).toBeNull();
  });
});
