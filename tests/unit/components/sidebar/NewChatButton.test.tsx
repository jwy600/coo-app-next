import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewChatButton } from '@/components/sidebar/NewChatButton';
import React from 'react';

// Hoist mock data so it's available in vi.mock factories
const { mockRouter, mockSidebar, mockState, mockAuth } = vi.hoisted(() => ({
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  },
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
  mockAuth: {
    user: null as unknown,
    isLoading: false,
    isAuthenticated: false,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
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
    React.createElement('button', { 'data-testid': 'sidebar-menu-button', disabled: props.disabled, onClick: props.onClick }, children),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => mockAuth),
}));

describe('NewChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebar.state = 'expanded';
    mockSidebar.open = true;
    mockSidebar.isMobile = false;
    mockAuth.isLoading = false;
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
  });

  describe('loading state', () => {
    it('renders disabled button while loading', () => {
      mockAuth.isLoading = true;
      render(<NewChatButton />);
      const btn = screen.getByTestId('sidebar-menu-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(screen.getByText('New chat')).toBeTruthy();
    });
  });

  describe('not authenticated', () => {
    it('renders "Login" button when not authenticated', () => {
      render(<NewChatButton />);
      expect(screen.getByText('Login')).toBeTruthy();
    });

    it('navigates to /auth/login on Login click', () => {
      render(<NewChatButton />);
      fireEvent.click(screen.getByText('Login'));
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('closes sidebar on mobile after Login click', () => {
      mockSidebar.isMobile = true;
      render(<NewChatButton />);
      fireEvent.click(screen.getByText('Login'));
      expect(mockSidebar.setOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('authenticated', () => {
    beforeEach(() => {
      mockAuth.isAuthenticated = true;
      mockAuth.user = { id: 'user-1' };
    });

    it('renders "New chat" button when authenticated', () => {
      render(<NewChatButton />);
      expect(screen.getByText('New chat')).toBeTruthy();
    });

    it('clears selection and sets mode on click', () => {
      render(<NewChatButton />);
      fireEvent.click(screen.getByText('New chat'));
      expect(mockState.clearSelection).toHaveBeenCalled();
      expect(mockState.setMode).toHaveBeenCalledWith('landing');
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('closes sidebar on mobile after new chat click', () => {
      mockSidebar.isMobile = true;
      render(<NewChatButton />);
      fireEvent.click(screen.getByText('New chat'));
      expect(mockSidebar.setOpen).toHaveBeenCalledWith(false);
    });

    it('does not close sidebar on desktop', () => {
      mockSidebar.isMobile = false;
      render(<NewChatButton />);
      fireEvent.click(screen.getByText('New chat'));
      expect(mockSidebar.setOpen).not.toHaveBeenCalled();
    });
  });
});
