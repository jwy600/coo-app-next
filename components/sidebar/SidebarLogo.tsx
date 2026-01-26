'use client';

import Link from 'next/link';
import { Feather } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';

export function SidebarLogo() {
  const setMode = useStore((state) => state.setMode);
  const clearSelectedBlocks = useStore((state) => state.clearSelectedBlocks);
  const { setOpen, isMobile, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleClick = (e: React.MouseEvent) => {
    // When collapsed, clicking the logo toggles the sidebar open
    if (isCollapsed && !isMobile) {
      e.preventDefault();
      setOpen(true);
      return;
    }

    // When expanded, navigate to home
    clearSelectedBlocks();
    setMode('landing');
    // On mobile, close the sidebar when navigating
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <SidebarMenuButton
      asChild
      tooltip={isCollapsed ? "Open sidebar" : "Home"}
      className="hover:bg-transparent"
    >
      <Link href="/" onClick={handleClick} className="flex items-center gap-2">
        <Feather className="h-5 w-5 text-foreground" />
        {!isCollapsed && (
          <span className="font-semibold text-base text-foreground">coo</span>
        )}
      </Link>
    </SidebarMenuButton>
  );
}
