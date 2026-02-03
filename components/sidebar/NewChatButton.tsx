'use client';

/**
 * New Chat / Login Button
 * Shows "Login" when not authenticated, "New chat" when authenticated
 */

import { useRouter } from 'next/navigation';
import { SquarePen, LogIn } from 'lucide-react';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useStore } from '@/lib/store/useStore';
import { useAuth } from '@/hooks/useAuth';

export function NewChatButton() {
  const router = useRouter();
  const setMode = useStore((state) => state.setMode);
  const clearSelection = useStore((state) => state.clearSelection);
  const { setOpen, isMobile } = useSidebar();
  const { isAuthenticated, isLoading } = useAuth();

  const handleNewChat = () => {
    clearSelection();
    setMode('landing');
    router.push('/');
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleLogin = () => {
    router.push('/auth/login');
    if (isMobile) {
      setOpen(false);
    }
  };

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return (
      <SidebarMenuButton disabled className="w-full">
        <SquarePen className="h-4 w-4" />
        <span>New chat</span>
      </SidebarMenuButton>
    );
  }

  // Not authenticated - show Login button
  if (!isAuthenticated) {
    return (
      <SidebarMenuButton
        onClick={handleLogin}
        tooltip="Login"
        className="w-full"
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </SidebarMenuButton>
    );
  }

  // Authenticated - show New chat button
  return (
    <SidebarMenuButton
      onClick={handleNewChat}
      tooltip="New chat"
      className="w-full"
    >
      <SquarePen className="h-4 w-4" />
      <span>New chat</span>
    </SidebarMenuButton>
  );
}
