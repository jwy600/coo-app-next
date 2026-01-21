'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useStore } from '@/lib/store/useStore';

export function NewChatButton() {
  const router = useRouter();
  const setMode = useStore((state) => state.setMode);
  const clearSelectedBlock = useStore((state) => state.clearSelectedBlock);
  const { setOpen, isMobile } = useSidebar();

  const handleClick = () => {
    clearSelectedBlock();
    setMode('landing');
    router.push('/');
    // On mobile, close the sidebar when navigating
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <SidebarMenuButton
      onClick={handleClick}
      tooltip="New chat"
      className="w-full"
    >
      <Plus className="h-4 w-4" />
      <span>New chat</span>
    </SidebarMenuButton>
  );
}
