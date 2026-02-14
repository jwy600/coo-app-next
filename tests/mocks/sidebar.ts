/**
 * Mock for Radix sidebar context
 * Use: vi.mock('@/components/ui/sidebar', () => createSidebarMock())
 */

import { vi } from 'vitest';
import React from 'react';

export const mockSidebar = {
  state: 'expanded' as 'expanded' | 'collapsed',
  open: true,
  setOpen: vi.fn(),
  openMobile: false,
  setOpenMobile: vi.fn(),
  isMobile: false,
  toggleSidebar: vi.fn(),
};

export function setSidebarCollapsed() {
  mockSidebar.state = 'collapsed';
  mockSidebar.open = false;
}

export function setSidebarExpanded() {
  mockSidebar.state = 'expanded';
  mockSidebar.open = true;
}

export function setSidebarMobile() {
  mockSidebar.isMobile = true;
}

export function resetSidebarMock() {
  mockSidebar.state = 'expanded';
  mockSidebar.open = true;
  mockSidebar.isMobile = false;
  mockSidebar.openMobile = false;
  mockSidebar.setOpen.mockReset();
  mockSidebar.setOpenMobile.mockReset();
  mockSidebar.toggleSidebar.mockReset();
}

export const createSidebarMock = () => ({
  useSidebar: vi.fn(() => mockSidebar),
  // Stub components as simple passthroughs
  Sidebar: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'sidebar' }, children),
  SidebarContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'sidebar-content' }, children),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'sidebar-header' }, children),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'sidebar-footer' }, children),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'sidebar-group' }, children),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => React.createElement('ul', { 'data-testid': 'sidebar-menu' }, children),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => React.createElement('li', null, children),
  SidebarMenuButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', { 'data-testid': 'sidebar-menu-button', disabled: props.disabled, onClick: props.onClick }, children),
  SidebarTrigger: () => React.createElement('button', { 'data-testid': 'sidebar-trigger' }, 'Toggle'),
  SidebarInset: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
});
